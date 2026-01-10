# Media Manager

A comprehensive media management system that automatically processes, analyzes, and organizes large photo collections. Runs distributed workers to extract metadata, detect duplicates, identify problematic images, and generate AI-powered descriptions—all through an intuitive web interface.

<!-- [Live Demo](https://...) -->

## Features

- **Automatic File Processing** – Scans folders, detects file types, and queues images for analysis
- **EXIF Extraction** – Fast and slow processors for comprehensive metadata extraction from images
- **Thumbnail Generation** – Creates optimized thumbnails at multiple quality levels for efficient storage and display
- **Duplicate Detection** – Identifies and manages duplicate images with visual hashing
- **Quality Analysis** – Detects blurry photos and other quality issues automatically
- **Object Detection** – Uses TensorFlow to identify objects and scenes in images
- **AI Descriptions** – Generates accurate image descriptions via local LLM integration
- **Content Filtering** – Detects and flags sensitive content for automatic handling
- **EXIF Correction** – Fixes incorrect date metadata in images
- **Distributed Queue System** – Handles processing of large collections (250,000+ files) efficiently

## Getting Started

### Prerequisites

- **Node.js** v18+ (npm v10+)
- **Supabase** (running locally via Docker)
- **macOS/Linux** (development environment)

### Installation & Development

1. Clone the repository:
   ```bash
   git clone https://github.com/pkibbey/media-manager.git
   cd media-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase locally and configure environment variables:
   ```bash
   # Copy the example environment file and update with your local Supabase credentials
   cp .env.example .env.local
   ```

4. Generate Supabase types:
   ```bash
   npm run types
   ```

5. Start the development server and workers:
   ```bash
   npm run dev
   ```

   Or run specific services:
   ```bash
   npm run web        # Start Next.js web UI only
   npm run workers    # Start all processing workers
   ```

## Project Structure

**packages/web-ui** – Next.js web interface for managing media, viewing analysis results, and monitoring processing queues

**packages/workers/** – Distributed worker processes:
- `folder-scan` – Scans file systems and populates media database
- `exif` – Extracts image metadata (fast and slow processors)
- `thumbnails` – Generates optimized thumbnail variants
- `visual-hash` – Creates perceptual hashes for duplicate detection
- `duplicates` – Identifies and manages duplicate images
- `blurry-photos` – Detects and flags out-of-focus images
- `object-detection` – Runs TensorFlow object detection models
- `advanced` – Generates AI descriptions via local LLM (Ollama)
- `fix-image-dates` – Corrects EXIF date metadata
- `warnings` – Flags quality and content issues

**packages/shared** – Shared TypeScript utilities, types, database clients (Supabase, Redis), and environment configuration

**supabase/** – Database schema and local configuration

## Tech Stack

- **Next.js** v15 – React framework for web UI
- **TypeScript** – Type-safe development
- **Supabase** – PostgreSQL database with real-time capabilities
- **Redis** – Job queue management
- **TensorFlow** – Object detection models
- **Ollama** – Local LLM for image descriptions
- **Turborepo** – Monorepo build orchestration
- **Biome** – Code linting and formatting

## Usage

[Add usage examples and instructions here]

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please open an issue on [GitHub Issues](https://github.com/pkibbey/media-manager/issues).

---

**Repository:** [pkibbey/media-manager](https://github.com/pkibbey/media-manager)

Generated with ❤️
