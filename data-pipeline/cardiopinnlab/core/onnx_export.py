"""torch -> ONNX export with a measured parity check (CONTRACT 2, the browser-inference guarantee).

Every PINN whose forward pass the web re-runs is exported to ONNX (opset 17, broadly supported by
onnxruntime-web) and checked for PyTorch-vs-onnxruntime parity on random in-domain inputs. The measured
parity (max abs diff) is published in the manifest: it is what licenses the claim "the browser re-runs the
trained PINN". Local build paths are stripped from the ONNX metadata so no machine path ships (the PINN-Lab
dynamo-exporter leak lesson)."""
from __future__ import annotations

import io

import numpy as np
import onnx
import onnxruntime as ort
import torch


def strip_onnx_metadata(model: onnx.ModelProto) -> onnx.ModelProto:
    """Remove producer / doc-string / metadata that can embed a local machine path. Inference is unaffected."""
    model.producer_name = ""
    model.producer_version = ""
    model.doc_string = ""
    for _ in range(len(model.metadata_props)):
        model.metadata_props.pop()
    for node in model.graph.node:
        node.doc_string = ""
    return model


def export_mlp(
    module: torch.nn.Module,
    *,
    in_dim: int,
    out_names: list[str],
    opset: int = 17,
    n_parity: int = 1024,
    domain: tuple[float, float] = (0.0, 1.0),
    seed: int = 0,
) -> tuple[dict, bytes]:
    """Export a coordinate-in / field-out module to ONNX and measure parity. Returns (meta, blob) where meta
    is the manifest ONNX block {bytes, opset, input_dim, output_names, parity_max_abs} and blob is the ONNX
    bytes (the export stage writes it to models/<case>.onnx, so this function does no file I/O). The module
    must be on CPU + eval for a clean, deterministic graph; the caller keeps the training copy on GPU."""
    module = module.to("cpu").eval()
    dummy = torch.zeros(1, in_dim, dtype=torch.float32)

    buf = io.BytesIO()
    torch.onnx.export(
        module, dummy, buf,
        input_names=["coords"], output_names=out_names,
        dynamic_axes={"coords": {0: "n"}, **{name: {0: "n"} for name in out_names}},
        opset_version=opset, do_constant_folding=True,
    )
    model = onnx.load_from_string(buf.getvalue())
    model = strip_onnx_metadata(model)
    onnx.checker.check_model(model)
    blob = model.SerializeToString()

    # parity: random in-domain inputs, torch vs onnxruntime
    rng = np.random.default_rng(seed)
    lo, hi = domain
    x = rng.uniform(lo, hi, size=(n_parity, in_dim)).astype(np.float32)
    with torch.no_grad():
        torch_out = module(torch.from_numpy(x))
    torch_np = torch_out.detach().cpu().numpy()
    sess = ort.InferenceSession(blob, providers=["CPUExecutionProvider"])
    ort_out = sess.run(None, {"coords": x})
    ort_np = np.concatenate([o.reshape(x.shape[0], -1) for o in ort_out], axis=1)
    parity = float(np.max(np.abs(torch_np.reshape(x.shape[0], -1) - ort_np)))

    meta = {
        "bytes": len(blob),
        "opset": opset,
        "input_dim": in_dim,
        "output_names": out_names,
        "parity_max_abs": parity,
    }
    return meta, blob
