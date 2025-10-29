# Design Document

## Overview

This design document outlines the architectural improvements for the media-downloader application. The refactoring will transform the current monolithic structure into a well-organized, maintainable, and scalable architecture following modern software engineering principles.

## Architecture

### Backend Architecture

The backend will be restructured into a layered architecture:

```
backend/
├── src/
│   ├── config/           # Configuration management
│   ├── controllers/      # HTTP request handlers
│   ├── services/         # Business logic layer
│   ├── repositories/     # Data access layer
│   ├── models/          # Data models and validation
│   ├── middleware/      # Express middleware
│   ├── utils/           # Shared utilities
│   └── types/           # TypeScript type definitions
├── tests/               # Test files
└── migrations/          # Database migrations
```

### Frontend Architecture

The frontend will adopt a feature-based structure:

```
frontend/src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components
│   └── forms/          # Form-specific components
├── features/           # Feature-specific modules
│   ├── queue/          # Queue management
│   ├── search/         # Media search
│   └── settings/       # Configuration
├── hooks/              # Custom React hooks
├── services/           # API client services
├── utils/              # Shared utilities
├── types/              # TypeScript types
└── store/              # State management
```

## Components and Interfaces

### Configuration Management

#### ConfigManager Class
```typescript
interface IConfigManager {
  get<T>(key: string): T | undefined;
  set(key: string, value: any): Promise<void>;
  getRequired<T>(key: string): T;
  validate(): Promise<ValidationResult>;
  onConfigChange(callback: (key: string, value: any) => void): void;
}

class ConfigManager implements IConfigManager {
  private config: Map<string, any>;
  private listeners: Set<Function>;
  private dbRepository: ConfigRepository;
}
```

#### Configuration Schema
```typescript
interface AppConfig {
  tmdb: {
    apiKey: string;
    baseUrl: string;
  };
  jackett: {
    url: string;
    apiKey: string;
  };
  realDebrid: {
    apiKey: string;
  };
  plex: {
    url: string;
    token: string;
    paths: {
      movies: string;
      tvShows: string;
      books: string;
      audiobooks: string;
    };
  };
  download: {
    path: string;
    autoDownload: boolean;
    preferredResolution: string;
    minSeeders: number;
  };
}
```

### Service Layer Abstraction

#### Base Service Class
```typescript
abstract class BaseService {
  protected httpClient: AxiosInstance;
  protected config: IConfigManager;
  protected logger: ILogger;

  constructor(config: IConfigManager, logger: ILogger) {
    this.config = config;
    this.logger = logger;
    this.httpClient = this.createHttpClient();
  }

  protected abstract getBaseUrl(): string;
  protected abstract getAuthHeaders(): Record<string, string>;
  
  protected createHttpClient(): AxiosInstance {
    return axios.create({
      baseURL: this.getBaseUrl(),
      timeout: 30000,
      headers: this.getAuthHeaders(),
    });
  }

  protected async handleRequest<T>(request: () => Promise<AxiosResponse<T>>): Promise<T> {
    try {
      const response = await request();
      return response.data;
    } catch (error) {
      this.logger.error('API request failed', { error, service: this.constructor.name });
      throw this.transformError(error);
    }
  }

  protected transformError(error: any): ServiceError {
    // Transform axios errors to consistent service errors
  }
}
```

#### Specific Service Implementations
```typescript
class TMDBService extends BaseService {
  protected getBaseUrl(): string {
    return 'https://api.themoviedb.org/3';
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.getRequired('tmdb.apiKey')}`
    };
  }

  async searchMedia(query: string, type: MediaType): Promise<MediaSearchResult[]> {
    return this.handleRequest(() => 
      this.httpClient.get('/search/multi', { params: { query, type } })
    );
  }
}
```

### Database Layer

#### Repository Pattern
```typescript
interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(criteria?: QueryCriteria): Promise<T[]>;
  create(entity: Partial<T>): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

abstract class BaseRepository<T> implements IRepository<T> {
  protected db: Database;
  protected tableName: string;

  constructor(db: Database, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  async findById(id: string): Promise<T | null> {
    const result = await this.db.get(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return result ? this.mapToEntity(result) : null;
  }

  protected abstract mapToEntity(row: any): T;
  protected abstract mapToRow(entity: Partial<T>): any;
}
```

#### Queue Repository
```typescript
interface QueueItem {
  id: string;
  type: MediaType;
  name: string;
  year?: number;
  tmdbId?: number;
  season?: number;
  episode?: number;
  episodeName?: string;
  isSeasonPack: boolean;
  status: QueueStatus;
  progress: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

class QueueRepository extends BaseRepository<QueueItem> {
  constructor(db: Database) {
    super(db, 'queue');
  }

  async findByStatus(status: QueueStatus): Promise<QueueItem[]> {
    const rows = await this.db.all(
      `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY created_at DESC`,
      [status]
    );
    return rows.map(row => this.mapToEntity(row));
  }

  async updateProgress(id: string, progress: number, speed?: string): Promise<void> {
    await this.db.run(
      `UPDATE ${this.tableName} SET progress = ?, download_speed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [progress, speed, id]
    );
  }
}
```

### Frontend Architecture

#### Custom Hooks for Data Fetching
```typescript
interface UseApiOptions<T> {
  initialData?: T;
  enabled?: boolean;
  refetchInterval?: number;
}

function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  options: UseApiOptions<T> = {}
): {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | undefined>(options.initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!options.enabled && options.enabled !== undefined) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```

#### State Management with Context
```typescript
interface AppState {
  queue: QueueItem[];
  config: AppConfig;
  user: UserPreferences;
}

interface AppContextType {
  state: AppState;
  actions: {
    addToQueue: (item: Partial<QueueItem>) => Promise<void>;
    updateQueueItem: (id: string, updates: Partial<QueueItem>) => Promise<void>;
    removeFromQueue: (id: string) => Promise<void>;
    updateConfig: (config: Partial<AppConfig>) => Promise<void>;
  };
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
```

#### Component Architecture
```typescript
// Presentation Component
interface MediaCardProps {
  media: MediaItem;
  onSelect: (media: MediaItem) => void;
  loading?: boolean;
}

const MediaCard: React.FC<MediaCardProps> = ({ media, onSelect, loading }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{media.name}</Typography>
        <Typography variant="body2">{media.year}</Typography>
      </CardContent>
      <CardActions>
        <Button onClick={() => onSelect(media)} disabled={loading}>
          Select
        </Button>
      </CardActions>
    </Card>
  );
};

// Container Component
const MediaSearchContainer: React.FC = () => {
  const [query, setQuery] = useState('');
  const { data: results, loading } = useMediaSearch(query);
  const { actions } = useAppContext();

  const handleSelect = useCallback(async (media: MediaItem) => {
    await actions.addToQueue(media);
  }, [actions]);

  return (
    <Box>
      <TextField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search media..."
      />
      <Grid container spacing={2}>
        {results?.map(media => (
          <Grid item xs={12} sm={6} md={4} key={media.id}>
            <MediaCard
              media={media}
              onSelect={handleSelect}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
```

## Data Models

### Core Models
```typescript
enum MediaType {
  MOVIE = 'movie',
  TV_SHOW = 'tv_show',
  BOOK = 'book',
  AUDIOBOOK = 'audiobook',
  APPLICATION = 'application'
}

enum QueueStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ERROR = 'error'
}

interface MediaItem {
  id: string;
  name: string;
  year?: number;
  type: MediaType;
  overview?: string;
  poster?: string;
  tmdbId?: number;
}

interface TorrentInfo {
  name: string;
  magnet: string;
  size: number;
  seeders: number;
  peers: number;
  quality: QualityInfo;
}

interface QualityInfo {
  resolution: string;
  codec: string;
  hdr: boolean;
  qualityScore: number;
}
```

## Error Handling

### Error Types
```typescript
abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;
}

class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;
}

class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;
}

class ExternalServiceError extends AppError {
  readonly statusCode = 502;
  readonly isOperational = true;
  
  constructor(service: string, originalError: Error) {
    super(`External service ${service} failed: ${originalError.message}`);
  }
}
```

### Error Middleware
```typescript
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error('Request error', {
    error: err,
    request: {
      method: req.method,
      url: req.url,
      headers: sanitizeHeaders(req.headers),
    }
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      type: err.constructor.name
    });
  }

  // Unexpected errors
  res.status(500).json({
    error: 'Internal server error',
    type: 'UnexpectedError'
  });
};
```

## Testing Strategy

### Backend Testing
```typescript
// Service Testing
describe('TMDBService', () => {
  let service: TMDBService;
  let mockConfig: jest.Mocked<IConfigManager>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockConfig = createMockConfig();
    mockLogger = createMockLogger();
    service = new TMDBService(mockConfig, mockLogger);
  });

  it('should search media successfully', async () => {
    // Mock HTTP response
    nock('https://api.themoviedb.org')
      .get('/3/search/multi')
      .reply(200, mockSearchResponse);

    const results = await service.searchMedia('test query', MediaType.MOVIE);
    
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Test Movie');
  });
});

// Repository Testing
describe('QueueRepository', () => {
  let repository: QueueRepository;
  let db: Database;

  beforeEach(async () => {
    db = await createTestDatabase();
    repository = new QueueRepository(db);
  });

  afterEach(async () => {
    await db.close();
  });

  it('should create queue item', async () => {
    const item = await repository.create({
      name: 'Test Movie',
      type: MediaType.MOVIE,
      status: QueueStatus.NOT_STARTED
    });

    expect(item.id).toBeDefined();
    expect(item.name).toBe('Test Movie');
  });
});
```

### Frontend Testing
```typescript
// Hook Testing
describe('useMediaSearch', () => {
  it('should fetch search results', async () => {
    const mockApiCall = jest.fn().mockResolvedValue([
      { id: '1', name: 'Test Movie' }
    ]);

    const { result, waitForNextUpdate } = renderHook(() =>
      useApi(mockApiCall, ['test query'])
    );

    expect(result.current.loading).toBe(true);
    
    await waitForNextUpdate();
    
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toHaveLength(1);
  });
});

// Component Testing
describe('MediaCard', () => {
  it('should render media information', () => {
    const media = {
      id: '1',
      name: 'Test Movie',
      year: 2023,
      type: MediaType.MOVIE
    };

    render(<MediaCard media={media} onSelect={jest.fn()} />);
    
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
  });

  it('should call onSelect when button clicked', () => {
    const onSelect = jest.fn();
    const media = { id: '1', name: 'Test Movie' };

    render(<MediaCard media={media} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('Select'));
    
    expect(onSelect).toHaveBeenCalledWith(media);
  });
});
```

## Performance Optimizations

### Caching Strategy
```typescript
class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }
}
```

### Database Optimization
```typescript
// Connection pooling
const dbPool = new Pool({
  filename: 'media_queue.db',
  max: 10,
  min: 2,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100,
});

// Query optimization with indexes
const createIndexes = async (db: Database) => {
  await db.run('CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_queue_created_at ON queue(created_at)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_config_key ON config(key)');
};
```

## Security Improvements

### Configuration Encryption
```typescript
class SecureConfigManager extends ConfigManager {
  private encryptionKey: string;

  constructor(encryptionKey: string) {
    super();
    this.encryptionKey = encryptionKey;
  }

  protected encryptValue(value: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  protected decryptValue(encryptedValue: string): string {
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

### Input Validation
```typescript
const validateFilePath = (path: string): boolean => {
  // Prevent directory traversal
  const normalizedPath = path.normalize(path);
  return !normalizedPath.includes('..') && 
         !normalizedPath.startsWith('/etc') &&
         !normalizedPath.startsWith('/root');
};

const sanitizeLogData = (data: any): any => {
  const sensitive = ['password', 'token', 'key', 'secret'];
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '***REDACTED***';
    }
  });
  
  return sanitized;
};
```

This design provides a comprehensive foundation for refactoring the media-downloader application into a maintainable, scalable, and secure codebase while preserving all existing functionality.