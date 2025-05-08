# Development Roadmap

## Refactoring Goals

- Rebuild the app incrementally with a focus on simplicity
- Optimize thumbnail generation for vision LLM compatibility
- Simplify UI architecture by reducing unnecessary complexity
- Reconsider streaming UI updates for simpler implementation

## Database Improvements

- Store EXIF data in a dedicated table linked to media items
- Track thumbnail data in its own table with processing states
- Trim data types and field counts to essentials
- Design for query efficiency and simpler data structure
- Follow single responsibility principle in database functions

## UI Improvements

- Merge admin folders tab with scan tab and file types tab
- Remove destructive actions (use database UI instead)
- Simplify stats fetching pattern

## Processing Improvements

- Extract only EXIF properties relevant for VLM analysis
- Use accurate mime-type detection rather than trusting extensions
- Track processing state in feature-specific tables
- Implement importance scoring for timeline photo selection


- Tables
  - exif_data needs further props when we get to the exif types
  - Make sure to use Shadcn components instead of basic html elements
  - always export functions as default