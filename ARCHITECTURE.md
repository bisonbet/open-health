# OpenHealth Architecture Overview

## Project Structure

OpenHealth is a Next.js 15 application built with TypeScript that serves as a health data management platform with AI integration. The project follows a modular structure that separates concerns and promotes reusability.

### Directory Structure
```
.
├── src/
│   ├── app/                     # Next.js App Router pages and API routes
│   ├── components/              # Reusable React components
│   ├── lib/                     # Utility functions and business logic
│   ├── hooks/                   # Custom React hooks
│   ├── context/                 # React Context providers
│   ├── styles/                  # Global styles and CSS
│   ├── types/                   # TypeScript type definitions
│   └── config/                  # Configuration files
├── prisma/                      # Database schema and migrations
├── public/                      # Static assets
├── components.json              # shadcn/ui configuration
├── package.json                 # Dependencies and scripts
└── README.md                    # Project documentation
```

## Core Technologies

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety throughout the application
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Accessible and customizable UI components
- **next-themes** - Theme management (light/dark mode)
- **next-intl** - Internationalization support

### Backend
- **Prisma ORM** - Database access and migrations
- **PostgreSQL** - Primary database
- **NextAuth.js v5** - Authentication and session management
- **LangChain** - LLM integration framework
- **Ollama** - Local LLM inference
- **docling** - Document parsing

## Authentication Architecture

The application uses JWT-based authentication with NextAuth.js v5:

1. **Session Management**: JWT strategy with proper token handling
2. **User Model**: Comprehensive user entity with roles and permissions
3. **Protected Routes**: Middleware to secure API routes and pages
4. **OAuth Integration**: Extensible provider architecture

## Data Flow Architecture

### Health Data Processing Pipeline
```
[Health Data Sources] 
        ↓
[Document Parser (docling)] 
        ↓
[Data Standardization]
        ↓
[LLM Processing (Ollama, Anthropic, Google GenAI)]
        ↓
[Contextual Conversations]
```

### API Routes Structure
The application follows a RESTful pattern for API routes:

```
/src/app/api/
├── assistant-modes/          # Assistant mode management
├── auth/                     # Authentication endpoints
├── chat-rooms/               # Chat room functionality
├── health-data/              # Health data handling
├── llm-providers/            # LLM provider configuration
└── static/                   # Static file handling
```

## Database Schema

The Prisma schema defines a comprehensive data model:

### Core Entities
- **User**: Authentication and user profile management
- **HealthData**: Structured health information with various types
- **ChatRoom**: Conversation contexts with assistant modes
- **AssistantMode**: AI assistant configurations
- **LLMProvider**: LLM provider configurations
- **ChatMessage**: Message history in conversations

### Key Relationships
- Users can create multiple chat rooms and health data entries
- Chat rooms are associated with specific assistant modes and LLM providers
- Assistant modes can be public or private
- Health data is processed through document parsers and stored with metadata

## Design Patterns

### Component Architecture
- **Atomic Design**: Components organized from atoms to molecules to organisms
- **Reusable UI**: Common components like buttons, cards, forms are abstracted
- **Modal System**: Built-in modal routing system using Next.js App Router

### Data Management
- **Type Safety**: Comprehensive TypeScript interfaces for all data structures
- **Prisma Integration**: Database access through strongly-typed Prisma client
- **Caching Strategy**: SWR for data fetching and caching

### API Design
- **Consistent Endpoints**: RESTful patterns with proper HTTP methods
- **Error Handling**: Standardized error responses and status codes
- **Authentication Middleware**: Protected routes with proper authorization checks

## Deployment Architecture

### Containerization
The application supports Docker deployment with multiple profiles:
- **Ollama Profile**: Local LLM inference support
- **Docling Profile**: Document parsing support
- **GPU Support**: NVIDIA GPU optimization

### Environment Configuration
- **.env.example**: Complete environment variable template
- **Dynamic Configuration**: Environment-based configuration loading
- **Security**: Encryption key management for sensitive data

## Key Design Decisions

1. **Privacy Focus**: All processing can be done locally for maximum privacy
2. **Modularity**: Clear separation between document parsing, LLM processing, and UI
3. **Extensibility**: Plugin-like architecture for adding new LLM providers
4. **Type Safety**: Full TypeScript implementation for compile-time error checking
5. **Scalability**: Containerized deployment with Docker Compose support
6. **User Experience**: Progressive enhancement with proper loading states and feedback

## Security Considerations

- **Data Encryption**: Support for encryption keys in environment variables
- **Authentication**: JWT-based session management
- **Authorization**: Role-based access control through user relationships
- **Input Sanitization**: Proper validation and sanitization of all data inputs

## Performance Optimization

- **Code Splitting**: Next.js automatic code splitting
- **Caching**: SWR for efficient data fetching
- **Lazy Loading**: Components loaded on demand
- **Database Indexing**: Optimized Prisma schema with proper indexing
