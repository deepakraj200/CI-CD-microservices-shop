# Shop Microservices — End-to-End CI/CD

A small e-commerce backend split into three microservices, with a complete
CI/CD pipeline on GitHub Actions that tests, builds, scans, publishes and
deploys to Kubernetes (staging → production).

## Architecture

```
client ──▶ gateway (Node, :8080) ──▶ product (Python/Flask, :5001)
                     │
                     └──────────▶ order (Node, :5002) ──▶ product
```

| Service | Stack | Responsibility |
|---|---|---|
| `gateway` | Node 20 / Express | Single entry point, routes `/api/products` and `/api/orders` |
| `product` | Python 3.12 / Flask + gunicorn | Product catalog |
| `order` | Node 20 / Express | Creates orders, validates stock via `product` |

Data is in-memory to keep the project focused on the pipeline; swap in a database
(e.g. Postgres) when you extend it.

## Repository layout

```
services/{gateway,order,product}/   source, tests, Dockerfile per service
docker-compose.yml                  local stack
scripts/smoke-test.sh               end-to-end check used locally, in CI and after deploys
k8s/base + k8s/overlays/{staging,prod}   Kustomize manifests
.github/workflows/ci.yml            CI pipeline
.github/workflows/cd.yml            CD pipeline
.github/actions/deploy/             reusable deploy action
```

## Run locally

```bash
make up        # docker compose up --build
make smoke     # runs scripts/smoke-test.sh against localhost:8080
make down
```

Without Docker: `make install && make lint && make test`.
(Run `npm install` once in `services/gateway` and `services/order` and commit the
generated `package-lock.json` files — CI uses `npm ci`.)

## Pipeline

### CI (`ci.yml`) — on every PR and push to `main`

1. **Lint & test** each service in parallel (ESLint + `node --test`, flake8 + pytest), plus `npm audit`.
2. **Validate manifests** — render both Kustomize overlays and check them with kubeconform.
3. **Integration** — `docker compose up` the whole stack and run the smoke test.
4. **Build, scan, push** (main only) — build each image, scan with Trivy (fails on HIGH/CRITICAL
   fixable vulnerabilities, results uploaded to the Security tab), then push to GHCR tagged with
   the commit SHA and `latest`.

### CD (`cd.yml`) — after CI succeeds on `main`

1. **Staging** — pin the image tags to the commit SHA, `kubectl apply -k`, wait for rollouts,
   run the smoke test through `kubectl port-forward`. Any failure triggers `rollout undo`.
2. **Production** — same steps, gated by the `production` environment's required reviewers.

You can also redeploy any previously built commit via **Run workflow** with its SHA.

## One-time setup

1. **Replace placeholders**
   - `your-org` in `k8s/` is a placeholder image owner; the CD pipeline substitutes the real
     lower-cased repository owner automatically.
   - Ingress hosts (`shop.example.com`, `staging.shop.example.com`) in `k8s/`.
2. **GitHub environments** (Settings → Environments): create `staging` and `production`;
   add required reviewers to `production`.
3. **Secrets** (per environment):
   - `KUBE_CONFIG_STAGING` and `KUBE_CONFIG_PROD`: base64-encoded kubeconfig
     (`base64 -w0 ~/.kube/config`).
4. **GHCR access**: either make the three `shop-*` packages public, or create an image pull
   secret named in each namespace and reference it from the Deployments.
5. **Cluster prerequisites**: an NGINX ingress controller and metrics-server (for the HPA).

## Extending

- Add a service: create `services/<name>/`, add it to the matrix in `ci.yml`, the compose file, and `k8s/base`.
- Move to GitOps: replace the `deploy` action with an Argo CD or Flux sync of `k8s/overlays/*`.
- Add DAST, SBOM generation (`docker/build-push-action` `sbom: true`) or image signing with cosign.
