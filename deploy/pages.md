# Deploy, GitHub Pages (static, deterministic replay)

The deploy for this product (public repo, static SPA): the app + the committed artifacts are served
statically; there is no backend at request time. The offline GPU bake is committed (`data/derived` +
`models/*.onnx`), so the workflow `.github/workflows/deploy-pages.yml` is a pure frontend build (no Python,
no retraining on CI):

1. build the frontend (`cd frontend && npm ci && npm run build`; `copy-data.mjs` overlays the committed
   `data/derived` + `models` into `public/`);
2. upload `frontend/dist` and deploy to Pages.

Enable once per product: repo Settings -> Pages -> Source = GitHub Actions (or
`gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow`). Custom domain: set via
`gh api PUT repos/<owner>/<repo>/pages -f cname=cardiopinn.fasl-work.com` (the CNAME file alone does not set
the domain on Actions deploys). The wildcard `*.fasl-work.com` already resolves; a Pages CNAME overrides it.

Fallback (heavy artifacts): if the baked 3D-mesh + field traces outgrow the Pages limits, host the same
static bundle via nginx on the ml box (`cardiopinn.ml.fasl-work.com`), per the deploy-classes note. The
`app/` FastAPI backend stays dormant unless a real request-time need appears.
