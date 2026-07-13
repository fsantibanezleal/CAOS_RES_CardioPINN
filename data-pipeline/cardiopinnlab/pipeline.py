"""The offline pipeline orchestrator + CLI (ADR-0057). For each research vertical it runs the vertical's
build() (ground truth + PINN training + evaluation + ONNX export on the local GPU) and the uniform export
stage (CONTRACT 2: trace + ONNX + manifest), then writes the flat index.json the web reads first.

    python -m cardiopinnlab.pipeline                       # all verticals
    python -m cardiopinnlab.pipeline act-eikonal-mapping   # one vertical
    python -m cardiopinnlab.pipeline act-eikonal-mapping --seed 7
"""
from __future__ import annotations

import argparse
from pathlib import Path

from . import registry
from .core.manifest import build_index
from .io.formats import write_json
from .stages import export

# data-pipeline/cardiopinnlab/pipeline.py -> parents[2] = repo root (works under `pip install -e .` too)
REPO_ROOT = Path(__file__).resolve().parents[2]
DERIVED = REPO_ROOT / "data" / "derived"
MANIFESTS = DERIVED / "manifests"
MODELS = REPO_ROOT / "models"


def precompute(case_id: str, seed: int = 42) -> dict:
    case = registry.get_case(case_id)
    bake = case.build(seed)
    return export.run(
        case=case, bake=bake, seed=seed,
        derived_dir=str(DERIVED), manifests_dir=str(MANIFESTS), models_dir=str(MODELS),
    )


def run_all(seed: int = 42) -> list[dict]:
    entries = []
    for c in registry.list_cases():
        m = precompute(c.id, seed=seed)
        entries.append({"case_id": c.id, "category": c.category, "title": c.title,
                        "manifest_path": f"manifests/{c.id}.json", "lane": m["lane"]})
    write_json(MANIFESTS / "index.json", build_index(entries))
    return entries


def main() -> None:
    ap = argparse.ArgumentParser(prog="cardiopinnlab.pipeline")
    ap.add_argument("case", nargs="?", default="all", help="a vertical id, or 'all'")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    if args.case == "all":
        entries = run_all(args.seed)
        print(f"precomputed {len(entries)} verticals -> {DERIVED}")
        for e in entries:
            print(f"  {e['case_id']:26s} [{e['category']}]  lane={e['lane']}")
        print(f"index -> {MANIFESTS / 'index.json'}")
    else:
        m = precompute(args.case, args.seed)
        onnx = m.get("onnx")
        onnx_s = f"onnx={onnx['bytes']}B parity={onnx['parity_max_abs']:.1e}" if onnx else "replay-only"
        print(f"precomputed {args.case}: lane={m['lane']} {onnx_s} metrics={m['metrics']}")


if __name__ == "__main__":
    main()
