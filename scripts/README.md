# scripts/, environment + pipeline orchestration (cross-platform)

Local scripts so anyone can configure the env and run the flow. Every script ships in BOTH `*.sh`
(macOS/Linux/Git-Bash) and `*.ps1` (Windows PowerShell).

| Script | What it does |
|---|---|
| `setup.sh` / `setup.ps1` | create `.venv-pipeline`, install torch (CUDA) + `data-pipeline/requirements.txt` + the editable package; print next commands |
| `precompute.sh` / `precompute.ps1` | run the offline bake: `python -m cardiopinnlab.pipeline "$@"` (all verticals, or one) |
| `dev.sh` / `dev.ps1` | run the web app against the committed artifacts (`cd frontend && npm run dev`) |
| `smoke.sh` / `smoke.ps1` | the light tests + the committed-artifact contract check |

Rules: idempotent; detect `.venv-pipeline/bin/python` vs `.venv-pipeline/Scripts/python.exe`; never use a
global Python/Node; pin nothing here (versions live in the requirements files).

## Guards (run in CI, kept local-runnable)

| Script | What it enforces |
|---|---|
| `check_artifacts.py` | CONTRACT 2: every manifest has its artifact and vice versa, byte sizes match, lane == gate verdict |
| `check_template_residue.py` | an instantiated product ships no template residue (armed once `.template-source` is deleted) |
| `check_content_standards.py` | no em-dash (`U+2014`/`U+2015`) and no pictographic emoji in tracked content (ADR-0067) |
