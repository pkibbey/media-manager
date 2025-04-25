# Media Manager - Coding Standards & Practices

This document outlines the coding standards, architectural patterns, and development practices used in the Media Manager project. Following these guidelines ensures consistency and maintainability across the codebase.

## Table of Contents

1. [Project Architecture](#project-architecture)
2. [Directory Structure](#directory-structure)
3. [Component Organization](#component-organization)
4. [TypeScript Usage](#typescript-usage)
5. [State Management](#state-management)
6. [Data Fetching](#data-fetching)
7. [Styling Approach](#styling-approach)
8. [Form Handling](#form-handling)
9. [UI Component Patterns](#ui-component-patterns)
10. [Error Handling](#error-handling)
11. [Performance Considerations](#performance-considerations)
12. [Linting and Formatting](#linting-and-formatting)

## Project Architecture

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom theming
- **UI Components**: Shadcn/UI components with Radix primitives
- **Backend**: Supabase for database and storage
- **Package Manager**: pnpm
- **Linting/Formatting**: Biome

### Core Principles

1. **Server vs. Client Components**: Clearly mark client components with `'use client'` directive at the top
2. **Feature-based Organization**: Co-locate components, hooks, and utilities within feature folders
3. **Type Safety**: Comprehensive TypeScript types for all database models and component props
4. **Progressive Enhancement**: Design UI for functionality without JavaScript first, then enhance

## Directory Structure

```
/src
  /app                 # Next.js App Router pages and layouts
    /actions           # Server actions for data manipulation
    /api               # API routes
    /...               # Feature-specific routes
  /components
    /admin             # Admin-specific components
    /browse            # Browse-related components
    /media             # Media display components
    /ui                # Reusable UI components
  /hooks               # React hooks
  /lib                 # Utility functions and shared logic
  /types               # TypeScript type definitions
```

## Component Organization

### Component File Structure

- Each component should be in its own file
- Complex components should be broken down into sub-components in a directory:

```
/thumbnail-generator
  index.tsx            # Main component that composes sub-components
  ThumbnailStats.tsx   # Sub-component
  ThumbnailBatchControls.tsx # Sub-component
  useThumbnailGenerator.ts  # Custom hook for component logic
  ...
```

### Component Naming Conventions

- React components use PascalCase: `MediaCard.tsx`
- Hooks use camelCase with `use` prefix: `useMediaFilters.ts`
- Utility functions use camelCase: `formatBytes.ts`
- Server actions use kebab-case: `process-exif.ts`

## TypeScript Usage

### Type Definitions

- Database types are generated from Supabase schema: `src/types/supabase.ts`
- Feature-specific types are defined in domain-specific files: `src/types/media-types.ts`
- Component props should use explicit interface definitions:

```typescript
interface ThumbnailProgressDisplayProps {
  isProcessingAll: boolean;
  progress: number;
  processed: number;
  total: number;
  // ...other props
}
```

### Type Safety Practices

- Avoid `any` type when possible
- Use discriminated unions for state management
- Define return types for functions
- Use non-null assertions (`!`) only when you can guarantee values are non-null

## State Management

- Use React hooks (`useState`, `useReducer`) for local component state
- Extract complex state logic into custom hooks
- Use React Context for state that needs to be shared between multiple components
- Prefer server-side state management where possible
- For form state, use `react-hook-form`

## Data Fetching

### Server Actions

- Use Next.js server actions for data mutations
- Define actions in `/app/actions/` directory
- Return typed responses with success/error indicators:

```typescript
export async function getMediaStats(): Promise<{
  success: boolean;
  data?: MediaStats;
  error?: string;
}> {
  // Implementation
}
```

### Supabase Integration

- Use the server-side Supabase client for authenticated requests
- Handle errors consistently with try/catch blocks
- Use RPC functions for complex database operations

## Styling Approach

### Tailwind Usage

- Use utility classes for styling
- Use `cn()` utility for conditional class merging
- Create consistent spacing with Tailwind's spacing scale
- Use semantic color variables defined in `globals.css`

### Component Styling

- Use Tailwind's variants for component states
- Define component variants with `cva` from `class-variance-authority`
- Use data attributes for styling based on component state

```typescript
const buttonVariants = cva(
  "base-styles-here",
  {
    variants: {
      variant: {
        default: "styles-for-default",
        // ...other variants
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);
```

## Form Handling

- Use `react-hook-form` for form state management
- Define form schemas with `zod` for validation
- Use the `FormField` pattern for consistent form controls
- Extract form logic into custom hooks for reusability

## UI Component Patterns

### Composition Pattern

- Build complex components by composing smaller, focused components
- Use the Radix UI primitives as building blocks
- Export both the composed component and its parts for flexibility

### Accessibility

- Use semantic HTML elements
- Include proper ARIA attributes
- Ensure keyboard navigation works for all interactive elements
- Use Radix UI primitives that have accessibility built-in

## Error Handling

- Use structured error responses:

```typescript
return {
  success: false,
  error: error instanceof Error ? error.message : 'Unknown error occurred',
};
```

- Use toast notifications for user-facing errors
- Log errors to console in development
- Use try/catch blocks around async operations

## Performance Considerations

- Use custom hooks like `useWindowWidth` for optimized window event handling
- Debounce frequent events (search inputs, resize events)
- Split code into smaller components to optimize renders
- Use `useCallback` and `useMemo` for expensive operations
- Leverage Next.js image optimization for media assets

## Linting and Formatting

- Use Biome for linting and formatting
- Follow the configuration in `biome.json`
- Run formatting before committing: `pnpm format`
- Fix lint issues: `pnpm lint`

### Commit Practices

- Run `pnpm types` to generate updated Supabase types
- Use `pnpm sync` to synchronize database migrations and types

---

This document is a living guide. As the project evolves, these standards may be updated to reflect new best practices and patterns.