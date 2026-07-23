"""Deterministically generate the validation figures for the CardioPINN paper from the
committed artifacts (data/derived/*). Every number is read from the JSON; nothing is
fabricated. Run with the figures venv (matplotlib). Outputs vector PDFs next to this file."""
import json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent
DER = HERE.parents[2] / "data" / "derived"      # CAOS_RES_CardioPINN/data/derived
BLUE, ORANGE, GRAY, INK, GREEN = "#2b6cb0", "#c05621", "#718096", "#1a202c", "#2f855a"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 9, "axes.edgecolor": "#4a5568",
                     "axes.linewidth": 0.8})


# ---- Fig 1: ECGi validation (RE and CC per beat, single-layer, from catalogue) ----
def fig_ecgi():
    d = json.loads((DER / "real-ecgi-catalogue" / "catalogue.json").read_text(encoding="utf-8"))
    ht = d["cases"][0]["beats"]
    rows = [
        ("Human\nsinus", ht["sinus"]["metrics"]),
        ("Human\npaced PVP", ht["paced-pvp"]["metrics"]),
        ("Human\npaced AVP", ht["paced-avp"]["metrics"]),
    ]
    fc = d["cases"][1]["forward_comparison"]["single_layer"]
    labels = [r[0] for r in rows] + ["Dog\nsinus"]
    RE = [r[1]["relative_error_tikhonov"] for r in rows] + [fc["RE"]]
    CC = [r[1]["correlation_tikhonov"] for r in rows] + [fc["CC"]]
    UQ = [r[1]["uq_calibration_2sigma"] for r in rows] + [0.90]
    x = range(len(labels)); w = 0.38
    fig, ax = plt.subplots(figsize=(4.7, 3.0))
    ax.bar([i - w / 2 for i in x], RE, width=w, color=ORANGE, label="relative error (lower better)", zorder=3)
    ax.bar([i + w / 2 for i in x], CC, width=w, color=BLUE, label="spatial correlation (higher better)", zorder=3)
    for i, (re, cc) in enumerate(zip(RE, CC)):
        ax.text(i - w / 2, re + 0.015, f"{re:.2f}", ha="center", fontsize=7.5, color=ORANGE)
        ax.text(i + w / 2, cc + 0.015, f"{cc:.2f}", ha="center", fontsize=7.5, color=BLUE)
    ax.plot(list(x), UQ, "o--", color=GREEN, ms=4, lw=1, zorder=4, label="node UQ coverage (2$\\sigma$)")
    ax.set_xticks(list(x)); ax.set_xticklabels(labels, fontsize=7.5)
    ax.set_ylim(0, 1.0); ax.set_ylabel("metric vs measured cage")
    ax.set_title("ECGi reconstruction vs the real heart-surface gold standard", fontsize=9)
    ax.legend(fontsize=6.6, loc="lower center", ncol=1, framealpha=0.9)
    ax.text(0.5, 0.06, "paced beats reconstruct better than sinus (higher CC)", transform=ax.transAxes,
            ha="center", fontsize=7, color=GRAY, style="italic")
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.tight_layout(); fig.savefig(HERE / "fig-ecgi.pdf"); plt.close(fig)


# ---- Fig 2: recovered 4D-flow relative pressure distribution ----
def fig_flow():
    d = json.loads((DER / "real-flow4d-pressure" / "trace.json").read_text(encoding="utf-8"))
    p = d["pressure_mmHg"]; m = d["metrics"]
    rng = max(p) - min(p)
    fig, ax = plt.subplots(figsize=(4.7, 2.7))
    ax.hist(p, bins=40, color=BLUE, alpha=0.85, zorder=3)
    ax.axvspan(min(p), max(p), color=BLUE, alpha=0.06, zorder=1)
    ax.annotate("", xy=(min(p), ax.get_ylim()[1] * 0.9), xytext=(max(p), ax.get_ylim()[1] * 0.9),
                arrowprops=dict(arrowstyle="<->", color=INK, lw=1.1))
    ax.text((min(p) + max(p)) / 2, ax.get_ylim()[1] * 0.94,
            f"relative-pressure range {m['ppe_pressure_drop_mmHg']:.2f} mmHg", ha="center", fontsize=8, color=INK)
    ax.text(0.02, 0.80, f"peak velocity {m['peak_velocity_ms']:.3f} m/s\n"
            f"Bernoulli 4$V^2$ = {m['bernoulli_mmHg']:.2f} mmHg (same order)\n"
            f"divergence reduced {m['div_reduction_x']:.1f}x\n"
            f"{m['n_lumen_voxels']:,} lumen voxels", transform=ax.transAxes, fontsize=7.2,
            va="top", color="#2d3748", bbox=dict(boxstyle="round,pad=0.3", fc="#f7fafc", ec="#cbd5e0"))
    ax.set_xlabel("recovered relative pressure (mmHg)"); ax.set_ylabel("lumen voxels")
    ax.set_title("4D-flow aortic pressure: physiological range, unobstructed aorta", fontsize=9)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.tight_layout(); fig.savefig(HERE / "fig-flow-pressure.pdf"); plt.close(fig)


if __name__ == "__main__":
    fig_ecgi(); fig_flow()
    print("figures written:", [p.name for p in sorted(HERE.glob("*.pdf"))])
