# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo-based blog built with Astro, deployed on Cloudflare Workers. It uses pnpm as the package manager and includes both a frontend (Astro static site) and a backend (Hono API).

## Development Commands

### Root Level Commands
```bash
# Install all dependencies
pnpm install

# Run frontend development server
pnpm dev

# Run backend development server
pnpm dev:backend

# Build the frontend for production
pnpm build

# Preview production build
pnpm preview

# Sync content from external sources
pnpm sync
```

### Frontend Commands (apps/frontend)
```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Sync content (uses Bun runtime)
pnpm sync

# Deploy to Cloudflare Workers
pnpm deploy

# Update docs and commit
pnpm doc:update
```

### Backend Commands (apps/backend)
```bash
# Start Wrangler development server
pnpm dev

# Deploy to production
pnpm deploy

# Generate Cloudflare types
pnpm cf-typegen
```

## Architecture

### Monorepo Structure
- **apps/frontend/** - Astro static site generator
- **apps/backend/** - Hono API for Cloudflare Workers
- **script/** - Content synchronization scripts
- **public/** - Static assets

### Frontend Stack
- **Astro 5.15.7** - Static site generator with Islands architecture
- **TypeScript** - Type safety
- **Preact** - Interactive components
- **Tailwind CSS v4** - Styling
- **@tailwindcss/typography** - Typography styling for content

### Backend Stack
- **Hono** - Minimal web framework
- **Cloudflare Workers** - Edge computing platform
- **D1 Database** - Data persistence

### Content System
Three content collections managed in `src/content/`:
- **blog/** - Full blog posts with hero images and complete metadata
- **pebbles/** - Short notes and thoughts
- **log/** - Daily logs with weather information

Each content type has Zod schema validation for type checking.

### Key Features
- **MDX Support** - Mix Markdown with JSX components
- **Code Highlighting** - Shiki with dark/light theme support
- **Math Rendering** - KaTeX for mathematical expressions
- **Table of Contents** - Auto-generated with remark-toc
- **Dark/Light Theme** - System preference with manual toggle
- **OG Image Generation** - Satori for social media images
- **Reaction System** - Backend API for user reactions
- **Content Synchronization** - External markdown processing

## Development Workflow

### Local Development
1. Run `pnpm install` at root
2. Start frontend with `pnpm dev`
3. Start backend with `pnpm dev:backend`
4. Sync content with `pnpm sync` if needed

### Content Management
- Content is synced from external sources via `script/main.ts`
- The sync process converts double-bracket links to markdown
- Images are processed and optimized during sync
- Frontmatter schema validation ensures type safety

### Deployment
- Frontend builds to static files
- Backend deploys as Cloudflare Workers
- Uses Wrangler for deployment configuration
- Assets served from Cloudflare's edge network

## Important Notes

- Package manager is **pnpm** (not yarn as mentioned in README)
- Content sync requires **Bun** runtime
- Biome is used for linting/formatting but no config file present
- TypeScript paths are configured with `@/` prefix for app imports
- All content is type-validated with Zod schemas
- The sync script is complex (625 lines) and handles multiple content types