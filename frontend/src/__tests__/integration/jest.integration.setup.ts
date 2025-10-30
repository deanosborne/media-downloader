import '@testing-library/jest-dom';

// Mock problematic components
jest.mock('../../components/FolderBrowser', () => {
  return require('./__mocks__/FolderBrowser').default;
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollTo
window.scrollTo = jest.fn();

// Mock HTMLElement.scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock fetch globally (will be overridden in individual tests)
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
) as jest.Mock;

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  // Reset fetch mock
  (global.fetch as jest.Mock).mockClear();
  
  // Mock console methods
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.error = originalError;
  console.warn = originalWarn;
  
  // Clean up any remaining timers
  jest.clearAllTimers();
  jest.useRealTimers();
});

// Global test timeout
jest.setTimeout(30000);

// Suppress specific warnings that are expected in tests
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args[0];
  
  // Suppress React warnings that are expected in error boundary tests
  if (
    typeof message === 'string' &&
    (message.includes('Error boundaries should implement getDerivedStateFromError') ||
     message.includes('The above error occurred in the') ||
     message.includes('React will try to recreate this component'))
  ) {
    return;
  }
  
  originalConsoleError.apply(console, args);
};

// Add custom matchers for integration tests
expect.extend({
  toBeAccessible(received) {
    // Basic accessibility checks
    const hasAriaLabel = received.getAttribute('aria-label');
    const hasRole = received.getAttribute('role');
    const hasTabIndex = received.getAttribute('tabindex');
    
    const pass = hasAriaLabel || hasRole || hasTabIndex !== null;
    
    if (pass) {
      return {
        message: () => `expected element not to be accessible`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected element to have accessibility attributes (aria-label, role, or tabindex)`,
        pass: false,
      };
    }
  },
  
  toHaveLoadingState(received) {
    const hasLoadingSpinner = received.querySelector('[data-testid="loading-spinner"]');
    const hasLoadingText = received.textContent?.includes('Loading');
    const hasAriaLive = received.querySelector('[aria-live]');
    
    const pass = hasLoadingSpinner || hasLoadingText || hasAriaLive;
    
    if (pass) {
      return {
        message: () => `expected element not to have loading state`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected element to have loading state indicators`,
        pass: false,
      };
    }
  },
  
  toHaveErrorState(received) {
    const hasErrorMessage = received.textContent?.toLowerCase().includes('error');
    const hasRetryButton = received.querySelector('button[aria-label*="retry"], button[aria-label*="try again"]');
    const hasErrorIcon = received.querySelector('[data-testid="error-icon"]');
    
    const pass = hasErrorMessage || hasRetryButton || hasErrorIcon;
    
    if (pass) {
      return {
        message: () => `expected element not to have error state`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected element to have error state indicators`,
        pass: false,
      };
    }
  }
});

// Extend Jest matchers type definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toHaveLoadingState(): R;
      toHaveErrorState(): R;
    }
  }
}