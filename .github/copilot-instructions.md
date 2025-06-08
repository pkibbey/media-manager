# GitHub Copilot Instructions for media-manager

## General Guidelines
- This project uses NPM as the primary package manager.
- This project is written in TypeScript.
- The web framework used is Next.JS.
- Follow the YAGNI (You Aren't Gonna Need It) principle; only implement features that are necessary.
- Follow the single responsibility principle; each function should do one thing and do it well.
- Avoid premature optimization; focus on writing clear and maintainable code first.

## Specific Tooling
- **Package Manager:** NPM
- **Linter:** Biome
- **Testing Framework:** None (no tests needed at this time)

## Code Style
- Comments should be clear and concise.

## Development Practices
- Assume that there will always be a development server running in the background, which will automatically reload when changes are made.
- Supabase is used for database management, and only ever run locally.
- We should focus on smaller, incremental changes rather than large, sweeping changes.