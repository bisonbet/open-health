# OpenHealth Patterns and Best Practices

## Component Architecture Patterns

### 1. Atomic Design System
The application follows an atomic design approach with components organized from:
- **Atoms**: Basic UI elements (buttons, inputs, labels)
- **Molecules**: Combinations of atoms (form elements, cards)
- **Organisms**: Complex components built from molecules (navigation bars, chat interfaces)

### 2. Modal Routing System
Using Next.js App Router's modal routing capabilities:
- Built-in support for nested routes and modals
- Clean separation between main content and modal views
- Consistent navigation patterns throughout the application

### 3. Reusable UI Components
Common components are abstracted for reusability:
- **Button**: Consistent styling with multiple variants
- **Card**: Standardized card layout with consistent spacing
- **Input Fields**: Form elements with proper validation
- **Dialog**: Modal dialogs with consistent behavior

## Data Management Patterns

### 1. Prisma Integration
- **Singleton Pattern**: Global Prisma client instance for efficient database connections
- **Type Safety**: Strongly-typed queries using Prisma's TypeScript support
- **Database Schema**: Well-defined relationships between entities
- **Error Handling**: Proper error handling for database operations

### 2. State Management
- **React Context**: For theme management and authentication state
- **SWR**: Data fetching and caching with automatic revalidation
- **Local State**: Component-level state management for UI interactions

### 3. API Route Patterns
- **RESTful Design**: Consistent endpoint naming and HTTP methods
- **Error Handling**: Standardized error responses with appropriate status codes
- **Authentication Middleware**: Protected routes with proper authorization checks
- **Data Validation**: Input validation using Zod schemas

## Authentication and Authorization

### 1. JWT-based Authentication
- **Session Management**: JWT tokens for secure session handling
- **Token Refresh**: Proper token lifecycle management
- **User Roles**: User-based permissions and access control
- **Middleware Protection**: Route-level protection for authenticated routes

### 2. NextAuth.js Integration
- **Provider Architecture**: Extensible authentication provider system
- **Session Callbacks**: Custom session handling with user ID injection
- **OAuth Support**: Ready-to-use OAuth integration patterns
- **Security Best Practices**: Secure token handling and storage

## Data Processing Patterns

### 1. Health Data Pipeline
- **Document Parsing**: Multi-stage processing (docling for document parsing)
- **Data Standardization**: Consistent data format across different sources
- **AI Integration**: Flexible LLM provider integration
- **Metadata Handling**: Rich metadata storage for health documents

### 2. Vision Processing
- **Ollama Integration**: Local vision model processing
- **Image Handling**: Proper image format and size management
- **Async Processing**: Non-blocking document processing
- **Error Recovery**: Graceful handling of processing failures

## Performance Optimization Patterns

### 1. Code Splitting
- **Next.js Automatic Code Splitting**: Efficient bundle loading
- **Lazy Loading**: Components loaded on demand
- **Route-based Splitting**: Separate bundles for different application sections

### 2. Caching Strategies
- **SWR**: Stale-while-revalidate caching for API data
- **Database Indexing**: Optimized Prisma queries with proper indexing
- **Component Caching**: Memoization of expensive computations

## Internationalization Patterns

### 1. next-intl Implementation
- **Server-side Translations**: Preloaded translation messages
- **Locale Detection**: Automatic locale detection and handling
- **Message Bundling**: Efficient message loading per route
- **Type Safety**: Strongly-typed translation keys

### 2. Responsive Design
- **Tailwind CSS**: Utility-first responsive design approach
- **Mobile-first**: Mobile-friendly component layouts
- **Flexible Grids**: Responsive grid systems for different screen sizes

## Configuration and Environment Patterns

### 1. Environment Management
- **.env.example**: Complete environment variable template
- **Dynamic Loading**: Environment-based configuration loading
- **Security**: Sensitive data handling (encryption keys, API secrets)
- **Validation**: Environment variable validation during startup

### 2. TypeScript Configuration
- **Strict Mode**: Comprehensive TypeScript strict mode settings
- **Type Definitions**: Extensive type definitions for all application components
- **Generic Types**: Reusable generic types and interfaces
- **Union Types**: Proper use of union types for flexible data structures

## Error Handling Patterns

### 1. API Error Responses
- **Consistent Format**: Standardized error response structure
- **HTTP Status Codes**: Appropriate status codes for different error types
- **Logging**: Proper error logging and monitoring
- **User Feedback**: Meaningful error messages for end users

### 2. Component Error Boundaries
- **Graceful Degradation**: Components that handle errors gracefully
- **Loading States**: Proper loading indicators during async operations
- **Fallback UI**: Default UI when components fail to render

## Testing and Quality Assurance

### 1. Type Safety
- **Comprehensive Type Coverage**: All data structures typed
- **Interface Design**: Well-defined interfaces for component props
- **Generic Constraints**: Proper use of TypeScript generics

### 2. Code Quality
- **ESLint Configuration**: Consistent code style enforcement
- **Prettier Integration**: Automated code formatting
- **Prisma Validation**: Database schema validation

## Containerization Patterns

### 1. Docker Compose Setup
- **Multi-profile Support**: Different profiles for different deployment scenarios
- **Service Isolation**: Separate containers for different services (Ollama, docling, web app)
- **Environment Configuration**: Flexible environment variable handling
- **GPU Optimization**: Support for NVIDIA GPU acceleration

### 2. Development Workflow
- **Local Development**: Docker-based local development setup
- **Hot Reloading**: Fast refresh during development
- **Debugging Support**: Containerized debugging capabilities
