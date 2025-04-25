# Media Manager

A modern web application for organizing, viewing, and managing your media collection. Built with Next.js, TypeScript, and Supabase.

![Media Manager Screenshot](public/video-placeholder.png)

## Features

- **Media Browsing**: Browse your media files with advanced filtering options
- **Thumbnail Generation**: Automatic thumbnail creation for images and videos 
- **EXIF Data Processing**: Extract and display EXIF metadata from your media files
- **Media Organization**: Manage your media by folders and file types
- **Timestamp Correction**: Tools for fixing and standardizing timestamps across files
- **Admin Dashboard**: Complete admin interface for managing your media library

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database & Storage**: Supabase
- **Media Processing**: Sharp, fluent-ffmpeg, exif-reader
- **Form Handling**: React Hook Form with Zod validation
- **Code Quality**: Biome for linting and formatting

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm
- Supabase CLI

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/media-manager.git
cd media-manager
```

2. Install dependencies

```bash
pnpm install
```

3. Set up Supabase locally

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Start Supabase locally
supabase start

# Apply migrations and generate types
pnpm sync
```

4. Set up environment variables

Create a `.env.local` file in the root directory and add the following:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-local-supabase-service-role-key>
```

5. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Development Workflow

- `pnpm dev` - Start the development server
- `pnpm build` - Build the application for production
- `pnpm start` - Start the production server
- `pnpm lint` - Run Biome linting
- `pnpm format` - Format code with Biome
- `pnpm types` - Generate Supabase TypeScript types
- `pnpm sync` - Apply Supabase migrations and update types

## Project Structure

- `/src/app` - Next.js App Router pages and layouts
  - `/actions` - Server actions for data manipulation
  - `/api` - API routes
  - `/admin` - Admin panel pages
  - `/browse` - Media browsing interface
- `/src/components` - React components
  - `/admin` - Admin interface components
  - `/browse` - Browse view components
  - `/media` - Media display components
  - `/ui` - Reusable UI components
- `/src/hooks` - Custom React hooks
- `/src/lib` - Utility functions and shared logic
- `/src/types` - TypeScript type definitions
- `/supabase` - Supabase configuration and migrations

## Contributing

Please read [docs/standards.md](docs/standards.md) for details on coding standards.

### Development Standards

This project follows specific coding standards and architectural patterns. Before contributing, familiarize yourself with:

- Component organization and naming conventions
- TypeScript usage and type safety practices
- State management patterns
- Styling approach using Tailwind CSS
- Server vs. client components in Next.js

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Supabase](https://supabase.io/) - Open source Firebase alternative
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Re-usable UI components