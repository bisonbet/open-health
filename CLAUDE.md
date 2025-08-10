# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production (includes Prisma generate)
npm start            # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes to database
npx prisma db seed   # Seed database with initial data
```

### Container Operations
```bash
# Development with all services
docker compose -f docker-compose.yaml --env-file .env --profile ollama,docling up -d

# Production with GPU support
docker compose -f docker-compose.yaml -f docker-compose.gpu.yml --env-file .env --profile ollama,docling up -d

# Rebuild after .env changes
docker compose --env-file .env up -d --build
```

## Architecture Overview

OpenHealth is a Next.js application that provides AI-powered health data management with local privacy focus. The system integrates document parsing, vision processing, and LLM chat capabilities.

### Core Components

**Health Data Pipeline:**
- Document parsing via Docling service (IBM's document AI)
- Vision analysis via Ollama for image-based health records
- Structured data extraction using comprehensive Zod schemas (`src/lib/health-data/parser/schema.ts`)
- Storage in PostgreSQL via Prisma ORM

**AI Integration:**
- Multiple LLM provider support (Ollama primary, others configurable)
- Assistant modes with customizable system prompts and contexts
- Chat rooms with message history and streaming responses
- Vision processing for health document images

**Authentication & Security:**
- NextAuth.js with custom user registration
- Encrypted health data storage
- OAuth2 server implementation for external integrations

### Key Directories

- `src/app/api/` - API routes for health data, chat, auth
- `src/lib/health-data/parser/` - Document and vision parsing logic
- `src/components/` - React components organized by feature
- `prisma/` - Database schema and seed data
- `src/auth.ts` & `src/auth.config.ts` - Authentication configuration

### Health Data Schema

The application uses extensive Zod schemas for health data validation, supporting 200+ medical test types including:
- Blood tests (CBC, lipid panels, hormone levels)
- Imaging studies (CT, MRI, ultrasound)
- Vital signs and physical measurements
- Specialty tests (cardiac markers, tumor markers)

Each test result includes:
- Value and unit fields
- Optional confidence scores for OCR-extracted data
- Source tracking (text, image, or both)

### Document Processing Flow

1. Upload via `src/components/source/source-add-screen.tsx`
2. API processing at `src/app/api/health-data-parser/`
3. Docling service converts PDFs/images to structured data
4. Vision models extract additional context from images
5. Data stored as HealthData records with structured JSON

### Development Environment

- Requires PostgreSQL database
- Docling service for document parsing (runs in container)
- Ollama for LLM and vision models
- Environment variables in `.env` (copy from `.env.example`)
- Generate encryption key: `echo $(head -c 32 /dev/urandom | base64)`

The application is designed to run completely locally for maximum privacy, with Docker Compose handling service orchestration.