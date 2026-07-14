"""The shared PINN engine (spine): a configurable MLP and the generic Adam -> L-BFGS training loop.

The cardiac-PINN literature (Sahli Costabal et al., EikonalNet / FiberNet / Delta-PINNs) ships small custom
PyTorch loops rather than a turnkey framework, because the novelty lives in the input space (Fourier / mesh
Laplace-Beltrami eigenfunctions) and the physics loss, not in the optimizer. This module is that generic
core: the MODEL and the LOSS are supplied per case; the OPTIMIZATION is shared here. A plain tanh MLP is used
by the 4D-flow divergence-free velocity denoiser (real/flow4d_denoise.py) and the Navier-Stokes pressure
engine (real/flow4d_pinn.py); training runs offline and the derived fields are baked to committed traces.
"""
from __future__ import annotations

import math
from collections.abc import Callable

import torch
import torch.nn as nn


def select_device(prefer_gpu: bool = True) -> torch.device:
    if prefer_gpu and torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def seed_everything(seed: int) -> None:
    """A run must be a pure function of (case, seed): seed torch (CPU + CUDA) and enable deterministic algos
    where cheap. numpy is seeded via core.rng.make_rng threaded through the caller."""
    torch.manual_seed(int(seed))
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(int(seed))


class FourierFeatures(nn.Module):
    """Random Fourier feature encoding gamma(x) = [cos(2*pi*B x), sin(2*pi*B x)] (Tancik et al. 2020). Mitigates
    the spectral bias that makes a raw-coordinate MLP blur sharp activation wavefronts. B is FIXED (a buffer) so
    the map is deterministic and exports cleanly to ONNX."""

    def __init__(self, in_dim: int, n_features: int, scale: float, generator: torch.Generator):
        super().__init__()
        b = torch.randn(in_dim, n_features, generator=generator) * scale
        self.register_buffer("B", b)
        self.out_dim = 2 * n_features

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        proj = 2.0 * math.pi * (x @ self.B)
        return torch.cat([torch.cos(proj), torch.sin(proj)], dim=-1)


class MLP(nn.Module):
    """A configurable multilayer perceptron with optional Fourier-feature input encoding. Activations: tanh
    (smooth, default) or sin (SIREN-style, for oscillatory fields). Output activation is applied by the caller
    (e.g. softplus for a positive activation time), so the raw MLP stays a clean ONNX graph."""

    def __init__(
        self,
        in_dim: int,
        out_dim: int,
        width: int = 64,
        depth: int = 4,
        activation: str = "tanh",
        fourier: FourierFeatures | None = None,
    ):
        super().__init__()
        self.fourier = fourier
        d0 = fourier.out_dim if fourier is not None else in_dim
        act = {"tanh": nn.Tanh, "sin": _Sine, "gelu": nn.GELU}[activation]
        layers: list[nn.Module] = [nn.Linear(d0, width), act()]
        for _ in range(depth - 1):
            layers += [nn.Linear(width, width), act()]
        layers += [nn.Linear(width, out_dim)]
        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.fourier is not None:
            x = self.fourier(x)
        return self.net(x)


class _Sine(nn.Module):
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return torch.sin(x)


def train_loop(
    parameters: list[torch.nn.Parameter],
    loss_closure: Callable[[], torch.Tensor],
    *,
    n_adam: int = 4000,
    n_lbfgs: int = 500,
    lr: float = 2e-3,
    log_every: int = 0,
) -> list[float]:
    """Generic Adam -> L-BFGS training (the canonical PINN recipe). loss_closure() recomputes the full scalar
    loss (data + physics + regularization) each call. Returns the loss history for the diagnostics panel."""
    history: list[float] = []
    adam = torch.optim.Adam(parameters, lr=lr)
    for it in range(n_adam):
        adam.zero_grad(set_to_none=True)
        loss = loss_closure()
        loss.backward()
        adam.step()
        history.append(float(loss.detach().cpu()))
        if log_every and it % log_every == 0:
            print(f"  adam {it:5d}  loss={history[-1]:.6e}")

    if n_lbfgs > 0:
        lbfgs = torch.optim.LBFGS(
            parameters, lr=1.0, max_iter=n_lbfgs, history_size=50,
            tolerance_grad=1e-9, tolerance_change=1e-12, line_search_fn="strong_wolfe",
        )

        def closure() -> torch.Tensor:
            lbfgs.zero_grad(set_to_none=True)
            loss = loss_closure()
            loss.backward()
            history.append(float(loss.detach().cpu()))
            return loss

        lbfgs.step(closure)
    return history
