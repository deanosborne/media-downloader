# Development Guide

## Project Structure

This project has been refactored with a modern, TypeScript-first architecture:

```
media-downloader/
├── backend/src/           # TypeScript backend source
│   ├── config/           # Configuration management
│   ├── controllers/      # HTTP request handlers
│   ├── services/         # Business logic layer
│   ├── repositories/     # Data access layer
│   ├── models/          # Data models and validation
│   ├── middleware/      # Express middleware
│   ├── utils/           # Shared utilities
│   └── types/           # TypeScript type definitions
├── frontend/src/         # React TypeScript frontend
│   ├── components/      # Reusable UI components
│   ├── features/        # Feature-specific modules
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API client services
│   ├── utils/           # Shared utilities
│   ├── types/           # TypeScript types
│   └── store/           # State management
└── tests/               # Test files
```

## Setup

1. **Install dependencies:**
   ```bash
   npm run install-all
   ```

2. **Development mode:**
   ```bash
   npm run dev
   ```
   This starts both backend and frontend in watch mode.

## Available Scripts

### Development
- `npm run dev` - Start both backend and frontend in development mode
- `npm run dev:backend` - Start only backend in development mode
- `npm run dev:frontend` - Start only frontend in development mode

### Building
- `npm run build` - Build both backend and frontend for production
- `npm run build:backend` - Build only backend
- `npm run build:frontend` - Build only frontend

### Testing
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Code Quality
- `npm run lint` - Lint all code
- `npm run lint:fix` - Fix linting issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

### Utilities
- `npm run clean` - Clean build artifacts

## Development Workflow

1. **Start development servers:**
   ```bash
   npm run dev
   ```

2. **Make changes** to TypeScript files in `src/` directories

3. **Run tests** to ensure everything works:
   ```bash
   npm run test
   ```

4. **Check code quality:**
   ```bash
   npm run lint
   npm run type-check
   ```

5. **Format code:**
   ```bash
   npm run format
   ```

## Key Features

- **TypeScript**: Full type safety across backend and frontend
- **Modern tooling**: ESLint, Prettier, Jest configured
- **Path aliases**: Clean imports with `@/` prefix
- **Hot reloading**: Automatic restart/refresh during development
- **Testing**: Jest configured for both backend and frontend
- **Code quality**: Strict linting and formatting rules
- **Build optimization**: Separate build processes for production

## Next Steps

This is the foundation setup. The next tasks will implement:
1. Configuration management system
2. Database abstraction layer
3. Service layer refactoring
4. Frontend architecture improvements
5. Comprehensive testing
6. Performance optimizations
7. Security enhancements

Each component will be built incrementally while maintaining this solid foundation.