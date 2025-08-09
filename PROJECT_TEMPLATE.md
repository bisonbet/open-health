# OpenHealth Project Template

This template demonstrates the recommended structure and patterns for starting new projects based on the OpenHealth architecture.

## Recommended Project Structure

```
my-new-project/
├── src/
│   ├── app/                     # Next.js App Router pages and API routes
│   │   ├── api/                 # API routes
│   │   ├── (auth)/              # Authentication pages
│   │   └── page.tsx             # Main page
│   ├── components/              # Reusable React components
│   │   ├── ui/                  # UI primitives
│   │   ├── layout/              # Layout components
│   │   └── shared/              # Shared components
│   ├── lib/                     # Utility functions and business logic
│   ├── hooks/                   # Custom React hooks
│   ├── context/                 # React Context providers
│   ├── styles/                  # Global styles and CSS
│   └── types/                   # TypeScript type definitions
├── prisma/                      # Database schema and migrations
├── public/                      # Static assets
├── components.json              # shadcn/ui configuration
├── package.json                 # Dependencies and scripts
└── README.md                    # Project documentation
```

## Key Configuration Files

### package.json (Example)
```json
{
  "name": "my-new-project",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "npx prisma generate && next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "prisma": "^6.5.0",
    "@prisma/client": "^6.5.0",
    "next-auth": "^5.0.0-beta.25",
    "tailwindcss": "^3.4.1",
    "postcss": "^8",
    "autoprefixer": "^10.4.20"
  },
  "devDependencies": {
    "@tailwindcss/typography": "^0.5.16",
    "eslint": "^9",
    "eslint-config-next": "15.1.6"
  }
}
```

### tsconfig.json (Example)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Authentication Setup Pattern

### src/lib/auth.ts
```typescript
import { NextAuthConfig } from "next-auth";

export const authConfig = {
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        session: async ({session, token}) => {
            if (token.sub && session.user) session.user.id = token.sub;
            return session;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
```

## Database Schema Pattern

### prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  name         String?
  email        String   @unique
  password     String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

## API Route Pattern

### src/app/api/users/route.ts
```typescript
import { NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prisma';

export async function GET() {
    try {
        const prisma = createPrismaClient();
        const users = await prisma.user.findMany();
        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}
```

## Component Pattern

### src/components/ui/button.tsx
```typescript
import * as React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
    
    const variantClasses = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline: "border border-input hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "underline-offset-4 hover:underline text-primary"
    };
    
    const sizeClasses = {
      default: "h-10 py-2 px-4",
      sm: "h-9 px-3 rounded-md",
      lg: "h-11 px-8 rounded-md",
      icon: "h-10 w-10"
    };

    return (
      <button
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
```

## Key Design Principles

1. **Modularity**: Separate concerns with clear directory structure
2. **Type Safety**: Comprehensive TypeScript usage throughout
3. **Reusability**: Component-based architecture with shared primitives
4. **Scalability**: Containerized deployment patterns
5. **Security**: Proper authentication and authorization patterns
6. **Performance**: Optimized data fetching and caching strategies

## Development Workflow

1. **Setup**: Clone repository and install dependencies
2. **Database**: Run Prisma migrations to set up schema
3. **Development**: Start dev server with `npm run dev`
4. **Testing**: Write tests for components and API routes
5. **Deployment**: Build and deploy using Docker containers

## Environment Configuration

### .env.example
```
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
NEXTAUTH_SECRET="your-secret-key-here"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

This template provides a foundation for new projects following the established patterns and best practices of the OpenHealth codebase.
