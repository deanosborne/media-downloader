# TMDB Service Migration Guide

This document outlines how to migrate from the legacy `tmdbService.ts` to the new `TMDBService.ts` that extends `BaseService`.

## Key Changes

### 1. Class Structure
- **Old**: Simple class with direct axios usage
- **New**: Extends `BaseService` with comprehensive error handling, retry logic, and caching

### 2. Dependencies
- **Old**: Only requires `ConfigManager`
- **New**: Requires `ConfigManager`, `ILogger`, and `IServiceCache`

### 3. Error Handling
- **Old**: Basic try-catch with console.error
- **New**: Comprehensive error transformation with typed service errors

### 4. Caching
- **Old**: No caching
- **New**: Built-in caching with configurable TTL

### 5. Logging
- **Old**: Console logging only
- **New**: Structured logging with different levels

## Migration Steps

### Step 1: Update Imports

**Before:**
```typescript
import { initializeTMDBService, searchMedia } from './services/tmdbService.js';
```

**After:**
```typescript
import { TMDBService } from './services/TMDBService.js';
import { ServiceFactory } from './services/ServiceFactory.js';
```

### Step 2: Update Service Initialization

**Before:**
```typescript
const tmdbService = initializeTMDBService(configManager);
```

**After:**
```typescript
// Option 1: Direct instantiation
import { Logger } from './utils/Logger.js';
import { ServiceCache } from './utils/ServiceCache.js';

const logger = new Logger();
const cache = new ServiceCache();
const tmdbService = new TMDBService(configManager, logger, cache);

// Option 2: Using ServiceFactory
const serviceFactory = ServiceFactory.getInstance(configManager, logger, cache);
const tmdbService = serviceFactory.getTMDBService();

// Option 3: Using convenience function
import { createTMDBService } from './services/ServiceFactory.js';
const tmdbService = createTMDBService(configManager);
```

### Step 3: Update Method Calls

The method signatures remain the same, but error handling is improved:

**Before:**
```typescript
try {
  const results = await searchMedia('The Matrix', 'Movie');
  // Handle results
} catch (error) {
  console.error('Search failed:', error);
}
```

**After:**
```typescript
try {
  const results = await tmdbService.searchMedia('The Matrix', 'Movie');
  // Handle results - same format as before
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle auth error specifically
  } else if (error instanceof RateLimitError) {
    // Handle rate limiting
  } else {
    // Handle other errors
  }
}
```

### Step 4: Update Response Handling

The response format is now more strongly typed:

**Before:**
```typescript
const results = await searchMedia('query');
// results is any[]
```

**After:**
```typescript
const results = await tmdbService.searchMedia('query');
// results is MediaSearchResult[] with proper typing
```

## New Features Available

### 1. Caching
```typescript
// Results are automatically cached
const results1 = await tmdbService.searchMedia('The Matrix'); // API call
const results2 = await tmdbService.searchMedia('The Matrix'); // From cache

// Clear cache if needed
await tmdbService.clearCache();

// Get cache statistics
const stats = tmdbService.getCacheStats();
```

### 2. Better Error Handling
```typescript
import { 
  AuthenticationError, 
  RateLimitError, 
  TimeoutError, 
  ExternalServiceError 
} from '../types/service.js';

try {
  const results = await tmdbService.searchMedia('query');
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Invalid API key
  } else if (error instanceof RateLimitError) {
    // Rate limit exceeded
  } else if (error instanceof TimeoutError) {
    // Request timeout
  } else if (error instanceof ExternalServiceError) {
    // Other API errors
  }
}
```

### 3. Structured Logging
```typescript
// Logs are automatically generated with structured data
// Debug logs show request/response details
// Info logs show operation completion
// Error logs show detailed error information
```

### 4. Retry Logic
```typescript
// Automatic retry on network errors and 5xx responses
// Configurable retry count and delay
// Exponential backoff
```

## Backward Compatibility

The legacy functions are still available for backward compatibility:

```typescript
// These still work but are deprecated
import { searchMedia, getTVShowDetails } from './services/tmdbService.js';

const results = await searchMedia('query');
const details = await getTVShowDetails(123);
```

However, they don't benefit from the new features like caching, improved error handling, and structured logging.

## Configuration Changes

### Required Configuration
```typescript
// Minimum required configuration (same as before)
await config.set('tmdb.apiKey', 'your-api-key');

// Optional configuration
await config.set('tmdb.baseUrl', 'https://api.themoviedb.org/3'); // Custom base URL
```

### Service Configuration
```typescript
// Custom service configuration
const tmdbService = new TMDBService(config, logger, cache, {
  timeout: 15000,     // Custom timeout
  retries: 3,         // Custom retry count
  retryDelay: 2000    // Custom retry delay
});
```

## Testing

The new service includes comprehensive unit and integration tests:

```bash
# Run unit tests
npm test -- TMDBService.test.ts

# Run integration tests (requires TMDB_API_KEY environment variable)
TMDB_API_KEY=your-key RUN_INTEGRATION_TESTS=true npm test -- TMDBService.integration.test.ts
```

## Performance Improvements

1. **Caching**: Reduces API calls for repeated requests
2. **Connection Reuse**: HTTP client reuses connections
3. **Request Deduplication**: Multiple identical requests are handled efficiently
4. **Timeout Management**: Prevents hanging requests

## Security Improvements

1. **Header Sanitization**: Sensitive headers are redacted in logs
2. **Input Validation**: Better validation of API responses
3. **Error Information**: Sensitive information is not exposed in error messages

## Monitoring and Observability

1. **Structured Logging**: All operations are logged with context
2. **Request Tracing**: Each request has detailed timing information
3. **Cache Metrics**: Cache hit/miss statistics available
4. **Error Classification**: Errors are properly categorized

## Rollback Plan

If issues arise, you can quickly rollback by:

1. Reverting import statements to use legacy functions
2. The old service file remains available during transition
3. No database or configuration changes are required

## Timeline

1. **Phase 1**: Deploy new service alongside legacy (current)
2. **Phase 2**: Update calling code to use new service
3. **Phase 3**: Remove legacy service exports (future)