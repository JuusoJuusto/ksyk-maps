# Overview

KSYK Navigator is a campus navigation and management system for Kulosaaren yhteiskoulu (a Finnish school). The application provides an interactive campus map, staff directory, room search functionality, and administrative tools. It supports multilingual content (English and Finnish) and features both public-facing navigation tools and admin-only management capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built as a **React Single Page Application (SPA)** using modern React patterns:
- **Component Library**: Radix UI components with shadcn/ui styling system for consistent, accessible UI components
- **Styling**: Tailwind CSS with CSS custom properties for theming and design tokens
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Internationalization**: react-i18next for multilingual support (English/Finnish)
- **Build System**: Vite for fast development and optimized production builds

**Key Design Decisions:**
- Chose Radix UI for accessibility-first components with full keyboard navigation support
- Used Tailwind CSS for rapid styling with consistent design system
- Implemented TanStack Query for efficient API state management with built-in caching and error handling
- Selected Wouter over React Router for smaller bundle size in this focused application

## Backend Architecture

The backend follows a **RESTful API architecture** with Express.js:
- **Web Framework**: Express.js with TypeScript for type-safe server-side development
- **Database Layer**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Authentication**: Replit Auth integration with OpenID Connect for secure user management
- **Session Management**: Express sessions stored in PostgreSQL for scalability
- **API Structure**: Resource-based REST endpoints with proper HTTP status codes and error handling

**Key Design Decisions:**
- Chose Drizzle ORM for compile-time type safety and better developer experience compared to traditional ORMs
- Implemented Replit Auth for seamless integration with the Replit ecosystem and OAuth2 security
- Used PostgreSQL session storage instead of memory storage for production scalability
- Structured API routes by resource type (buildings, rooms, staff, events) for maintainability

## Data Storage

**Database Schema Design:**
- **PostgreSQL** as the primary database with Neon serverless hosting
- **Schema Structure**: Organized into logical entities (users, buildings, rooms, staff, events, announcements)
- **Multilingual Support**: Dedicated columns for English and Finnish content (nameEn, nameFi, descriptionEn, descriptionFi)
- **Relationships**: Foreign key relationships between buildings and rooms, with proper indexing
- **Session Storage**: Dedicated sessions table for authentication state persistence

**Key Design Decisions:**
- Selected PostgreSQL for ACID compliance and strong relationship support needed for campus data
- Implemented multilingual columns rather than separate translation tables for performance
- Used UUIDs as primary keys for better distributed system compatibility
- Designed normalized schema to prevent data duplication while maintaining query performance

## External Dependencies

**Authentication & Infrastructure:**
- **Replit Auth**: OpenID Connect authentication system integrated with Replit platform
- **Neon Database**: Serverless PostgreSQL hosting with automatic scaling
- **WebSocket Support**: WebSocket constructor for real-time database connections

**Development & Build Tools:**
- **Vite**: Frontend build tool and development server
- **Drizzle Kit**: Database migration and schema management
- **TypeScript**: Type checking across frontend and backend
- **ESBuild**: Server-side code bundling for production

**UI & Styling:**
- **Google Fonts**: Inter font family for consistent typography
- **Radix UI Primitives**: Accessible component foundations
- **Tailwind CSS**: Utility-first styling framework
- **Lucide Icons**: Consistent icon system

**Key Integration Decisions:**
- Integrated with Replit ecosystem for seamless deployment and authentication
- Used Neon for serverless PostgreSQL to handle variable traffic patterns
- Selected Vite for fast development experience with hot module replacement
- Chose TypeScript throughout the stack for type safety and better developer experience