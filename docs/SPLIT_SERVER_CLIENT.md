# Splitting Out Heavy Server-Side Processing from Next.js (Selective Migration)

This guide helps you move only the routes and logic that require heavy server-side processing (e.g., GPU, native binaries, or long-running CPU tasks) out of your Next.js app into a dedicated backend, while keeping the rest of your app as a pure frontend.

---

## 1. Identify Heavy Server-Side Routes/Actions

- Review your `src/actions/` and `src/lib/` for functions that:
  - Use native modules (e.g., `sharp`, `fluent-ffmpeg`, `dcraw`, TensorFlow, etc.)
  - Require GPU or heavy CPU (e.g., advanced analysis, face/object detection, RAW image processing)
  - Are not compatible with Next.js edge/serverless (e.g., need local file access, spawn processes)
- Examples from your codebase:
  - `src/actions/analysis/process-advanced-analysis.ts`
  - `src/actions/analysis/process-for-faces.ts`
  - `src/actions/analysis/process-for-objects.ts`
  - `src/actions/thumbnails/process-thumbnails.ts`
  - `src/lib/raw-processor.ts`, `src/lib/thumbnail-generators.ts`

## 2. Set Up a Dedicated Processing Server

- Create a new folder (e.g., `processing-server/`) in your repo or a separate repo.
- Use Node.js (Express, Fastify, etc.) and install all required native/ML/image libraries.
- See `docs/GPU_PROCESSING_SETUP.md` for detailed setup (hardware, dependencies, PM2, etc.).
- Implement REST endpoints (e.g., `/process`, `/thumbnails`) that:
  - Accept requests from your Next.js app
  - Run the heavy processing
  - Return results or update your database

## 3. Refactor Next.js Actions to Call the Processing Server

- In your Next.js app, create an API client (see `docs/GPU_PROCESSING_SETUP.md`):
  - Use `fetch` or `axios` to call the processing server endpoints
  - Pass necessary data (mediaId, imageUrl, analysisType, etc.)
- Update server actions (e.g., `processForFaces`, `process-advanced-analysis`) to:
  - Call the processing server instead of running logic locally
  - Optionally, store results in Supabase after receiving them
- Example pattern:
  ```ts
  import { callProcessingApi } from '@/lib/processing-api';
  export async function processForFaces(mediaId: string) {
    const { success, results, processingTime } = await callProcessingApi('/process', { mediaId, analysisType: 'faces' });
    // ...store results in DB if needed
  }
  ```

## 4. Update Environment Variables

- Add the processing server URL to your `.env.local`:
  ```env
  PROCESSING_API_URL=http://your-processing-server:3001
  ```
- Use this in your API client to route requests.

## 5. Test Integration

- Run both the Next.js frontend and the processing server locally.
- Trigger heavy processing actions from the UI and verify they:
  - Call the processing server
  - Return results and update the UI/database as expected
- Check logs and error handling on both sides.

## 6. Deployment

- Deploy the processing server to a machine with the required hardware (GPU, etc.).
- Use PM2 or similar to keep it running (see `docs/GPU_PROCESSING_SETUP.md`).
- Deploy the Next.js frontend as usual (Vercel, etc.), with the processing server URL set in env vars.

## 7. Maintain and Extend

- For any new heavy processing, add endpoints to the processing server and update the frontend to call them.
- Keep the interface between frontend and backend clean and well-documented.

---

**References:**
- `docs/GPU_PROCESSING_SETUP.md`
- `docs/TIERED_PROCESSING.md`
- `docs/THUMBNAILS.md`
- `src/actions/analysis/`, `src/actions/thumbnails/`, `src/lib/`

---

*Edit this file as needed for your specific project details and workflow.*

<!-- The rest of this file contains the original full-split instructions. Keep for reference. -->

---

# Migrating Next.js App to Separate Pure Server-side and Pure Front-end Projects

This guide will help you split your current Next.js app into two distinct parts:
- **Pure Server-side (API/backend)**
- **Pure Front-end (UI/client)**

Both can remain in the same repository, but will be developed and deployed independently.

---

## 1. Plan Your Directory Structure

- `/server` — All backend/server-side code (API, database, server actions)
- `/client` — All front-end code (UI, static assets, client-only logic)
- `/shared` (optional) — Shared types, utilities, and constants

Example:
```
repo-root/
  client/
    ... (React/Next.js or other front-end framework)
  server/
    ... (API, server actions, DB logic)
  shared/
    ... (TypeScript types, utils)
  README.md
```

---

## 2. Move Server-side Code

- Move all API routes, server actions, and database logic from `src/app/api`, `src/actions`, and `src/lib` (server-only) into `/server`.
- Move Supabase config and migrations into `/server`.
- If you use server-only TypeScript types, move them to `/shared`.

---

## 3. Move Front-end Code

- Move all UI components, pages, and client-side logic from `src/app`, `src/components`, and `src/hooks` into `/client`.
- Move global styles (e.g., `globals.css`) into `/client`.
- If you use client-only TypeScript types, move them to `/shared`.

---

## 4. Refactor Imports

- Update all import paths to reflect the new structure.
- For shared code (types, utils), import from `/shared`.
- For API calls, update the client to call the new server endpoints (e.g., via REST or RPC).

---

## 5. Set Up Communication

- Decide on the API protocol (REST, GraphQL, tRPC, etc.).
- Refactor the front-end to fetch data from the server via HTTP requests instead of direct function calls.
- Remove all server-only code from the client bundle.

---

## 6. Update Build & Dev Scripts

- Add separate `package.json` files for `/client` and `/server`.
- Update scripts for development and production:
  - `cd client && pnpm dev` (front-end)
  - `cd server && pnpm dev` (back-end)
- Optionally, add root-level scripts to run both with a tool like `concurrently`.

---

## 7. Update Documentation

- Document the new structure and development workflow in `README.md`.
- Add instructions for running, building, and deploying both apps.

---

## 8. Test Everything

- Ensure the front-end can communicate with the back-end.
- Test all major features and flows.
- Fix any issues with imports, types, or API calls.

---

## 9. Clean Up

- Remove any unused files or code.
- Update linting, formatting, and CI/CD configs as needed.

---

## 10. (Optional) Monorepo Tooling

- Consider using a monorepo tool (e.g., Turborepo, Nx) for easier management.

---

## Example Directory Layout After Migration

```
repo-root/
  client/
    src/
      components/
      pages/
      hooks/
      ...
    package.json
    ...
  server/
    src/
      api/
      actions/
      lib/
      ...
    supabase/
    package.json
    ...
  shared/
    types/
    utils/
    ...
  README.md
```

---

**Tip:** Migrate incrementally. Start by moving and wiring up one feature end-to-end before refactoring the entire codebase.
