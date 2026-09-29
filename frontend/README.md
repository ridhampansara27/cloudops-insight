# CloudOps Insight frontend

React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Base UI, TanStack Query/Table, and ECharts. Production serves the built SPA through NGINX behind Cloudflare Tunnel on OCI OKE.

## Run locally

```powershell
# From frontend/
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:5173`. Start FastAPI and PostgreSQL/Redis as described in the [root README](../README.md). `VITE_API_BASE_URL` is an origin such as `http://localhost:8000`; the API client appends `/api/v1`. Vite exposes `VITE_*` variables to the browser, so never put secrets in them.

## Checks

```powershell
npm run check
```

`npm run check` runs ESLint, TypeScript checks, and a production build. `npm run preview` serves a local build on port 4173. The development server is not the production web server. Review [security exceptions](docs/security-exceptions.md) before changing routing mode or React Router major version.
