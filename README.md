# BAM Presentation Summary v1

This folder is the GitHub/Vercel-ready copy of the current app.

## Recommended v1 deploy

Use Vercel for this version. The app is a Vite frontend with a PDF endpoint at
`api/presentation-summary/pdf.js`, and `vercel.json` already keeps that API
function and the Thai font assets in the deployment.

Do not use GitHub Pages for the first PDF-enabled link. GitHub Pages can host
the built frontend, but it will not run this serverless PDF endpoint.

## Local run

```powershell
npm install
npm run dev
```

Open the URL printed by the dev server. The local dev server serves both the
Vite app and `/api/presentation-summary/pdf`.

## Push and deploy

1. Create a GitHub repository for the contents of this folder.
2. Push this folder as the repository root.
3. Import that repository into Vercel.
4. Keep the default Vercel install/build settings. `vercel.json` sets the
   output directory and the PDF function settings.
5. After deployment, test the flow that ends at
   `ยืนยันการสร้างใบสรุปนำเสนอ`.

## PDF endpoint

The default frontend endpoint is:

```text
/api/presentation-summary/pdf
```

That default is correct when the frontend and API are deployed together on
Vercel. If the PDF API moves to another host later, set
`VITE_PRESENTATION_PDF_ENDPOINT` during the Vite build and make sure the API
host supports cross-origin browser requests.

## Current PDF strategy

The web endpoint renders the app preview with headless Chromium and downloads
the result as a PDF. The Excel/PowerShell experiment in `server/` is local
only and is not called by the Vercel PDF route.
