# cloudops-insight
Cloud resource monitoring, FinOps and incident management platform.

## Frontend development

The CloudOps Insight frontend uses:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- TanStack Query
- TanStack Table
- Zustand
- Apache ECharts

### Start locally

```powershell
Set-Location frontend
npm install
Copy-Item .env.example .env.local
npm run dev