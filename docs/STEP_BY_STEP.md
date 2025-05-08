# Media Manager – Step-by-Step Build Plan

## 1. Project Setup

1. Install Node.js 18+, pnpm, and Supabase CLI.
2. Clone the repo and install dependencies:
    ```bash
    git clone https://github.com/yourusername/media-manager.git
    cd media-manager
    pnpm install
    ```
3. Start Supabase locally and apply migrations:
    ```bash
    npm install -g supabase
    supabase start
    pnpm sync
    ```
4. Create `.env.local` with Supabase keys.
5. Start the dev server:
    ```bash
    pnpm dev
    ```

## 2. Database & Types

1. Design tables for media items, EXIF, thumbnails, and analysis results.
2. Use Supabase migrations for schema changes.
3. Generate TypeScript types from Supabase.

## 3. Core Features

### 3.1 Media Browsing

- Implement `/app/browse/` page and server action for paginated, filtered media fetching.
- Build `MediaListContainer`, `MediaGrid`, `MediaCard`, `MediaDetail`, and `MediaFilters` components.
- Add selection context and keyboard navigation.

### 3.2 Thumbnail Generation

- Create thumbnail processor using `sharp` for images
- Implement `/actions/thumbnails/generate-thumbnails.ts` and stats retrieval.
- Store thumbnails in Supabase Storage and link to file items.

### 3.3 EXIF Data Processing

- Use `sharp` to extract metadata in `/actions/exif/process-exif.ts`.
- Implement normalization for timestamps, GPS coordinates, and technical values.
- Create database functions for unprocessed files and statistics.
- Use additional libraries like `date-fns` and `geolib` for specialized processing.
- Store normalized EXIF in a dedicated table with searchable formats.
- Display comprehensive EXIF data in media detail view with map visualization for location data.

### 3.4 Media Analysis

- Use Ollama.js and a custom vision model "minicpm-v:latest" for content analysis.
- Implement `/actions/analysis/process-analysis.ts` and stats retrieval.
- Store results in an analysis table and expose in the UI.

### 3.5 Admin Dashboard

- Build admin pages for:
  - **Media Scanning**: Discover and import new media files
  - **File Types**: Manage supported file formats and mime types
  - **EXIF Processing**: Monitor and trigger EXIF data extraction
  - **Analysis**: Review AI analysis results and processing stats
  - **Thumbnails**: Track thumbnail generation and regenerate as needed

- Implement core admin components:
  - `AdminLayout`: Shared layout with navigation sidebar
  - `StatsCard`: Reusable component for displaying processing statistics
  - `ProcessingQueue`: Visual representation of background tasks
  - `ActionButton`: Standardized button for triggering server actions

- Create server actions for admin operations:
  - `/actions/admin/scan-directory.ts`: Discover new media files
  - `/actions/admin/process-batch.ts`: Generic batch processing controller
  - `/actions/admin/update-settings.ts`: Modify application settings

- Display processing statistics:
  - Show counts of total/processed/remaining items
  - Calculate and display completion percentages
  - Visualize trends with simple charts and progress indicators
  - Display error rates and common failure reasons

- Implement manual triggers for:
  - Scanning specific directories
  - Processing EXIF data for selected items
  - Running analysis on priority items
  - Regenerating thumbnails with updated settings

- Add system health monitoring:
  - Database connection status
  - Storage utilization metrics
  - Processing queue length
  - Recent errors and warnings

- Implement role-based access control for admin functions

## 4. UI & Component Standards

- Use Tailwind CSS and shadcn/ui for styling.
- Organize components by feature, use PascalCase for components, camelCase for hooks/utilities.
- Follow accessibility and composition patterns from `docs/STANDARDS.md`.

## 5. Development Workflow

- Use Biome for linting/formatting: `pnpm lint`, `pnpm format`.
- Sync types and migrations: `pnpm types`, `pnpm sync`.
- Test core logic and document components.

## 6. Performance & Refactoring

- Use batch processing, efficient queries, and memoized components.
- Optimize thumbnail and analysis pipelines for VLM/AI compatibility.
- Regularly review and simplify architecture as described in `docs/DEV.md`.

---
For details on each feature, see the respective docs in `/docs`.
