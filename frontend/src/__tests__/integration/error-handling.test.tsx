import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setupIntegrationTest, cleanupIntegrationTest } from './setup';
import MediaSearchContainer from '../../features/search/MediaSearchContainer';
import QueueContainer from '../../features/queue/QueueContainer';
import SettingsContainer from '../../features/settings/SettingsContainer';
import App from '../../App';

describe('Error Handling and Edge Cases Integration Tests', () => {
  beforeEach(() => {
    setupIntegrationTest();
  });

  afterEach(() => {
    cleanupIntegrationTest();
  });

  describe('Network Error Handling', () => {
    it('should handle API timeout errors', async () => {
      const user = userEvent.setup();
      const mockResponses = {
        '/api/search': new Promise(() => {}) // Never resolves (timeout simulation)
      };

      const { cleanup } = renderWithProviders(
        <MediaSearchContainer />,
        { mockResponses }
      );

      try {
        const searchInput = screen.getByPlaceholderText(/search for movies/i);
        await user.type(searchInput, 'test');

        // Should show loading state
        await waitFor(() => {
          expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
        });

        // After timeout, should show error
        await waitFor(() => {
          expect(screen.getByText(/request timeout/i)).toBeInTheDocument();
        }, { timeout: 10000 });
      } finally {
        cleanup();
      }
    });

    it('should handle network connectivity issues', async () => {
      const user = userEvent.setup();
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      const { cleanup } = renderWithProviders(<MediaSearchContainer />);

      try {
        const searchInput = screen.getByPlaceholderText(/search for movies/i);
        await user.type(searchInput, 'test');

        await waitFor(() => {
          expect(screen.getByText(/network error/i)).toBeInTheDocument();
        });

        // Should show retry option
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });

    it('should handle server errors (5xx)', async () => {
      const user = userEvent.setup();
      const mockResponses = {
        '/api/search': {
          success: false,
          error: 'Internal server error',
          status: 500
        }
      };

      const { cleanup } = renderWithProviders(
        <MediaSearchContainer />,
        { mockResponses }
      );

      try {
        const searchInput = screen.getByPlaceholderText(/search for movies/i);
        await user.type(searchInput, 'test');

        await waitFor(() => {
          expect(screen.getByText(/server error/i)).toBeInTheDocument();
        });

        // Should suggest trying again later
        expect(screen.getByText(/try again later/i)).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });

    it('should handle rate limiting (429)', async () => {
      const user = userEvent.setup();
      const mockResponses = {
        '/api/search': {
          success: false,
          error: 'Rate limit exceeded',
          status: 429,
          retryAfter: 60
        }
      };

      const { cleanup } = renderWithProviders(
        <MediaSearchContainer />,
        { mockResponses }
      );

      try {
        const searchInput = screen.getByPlaceholderText(/search for movies/i);
        await user.type(searchInput, 'test');

        await waitFor(() => {
          expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
        });

        // Should show retry countdown
        expect(screen.getByText(/retry in 60 seconds/i)).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });
  });

  describe('Data Validation and Edge Cases', () => {
    it('should handle empty search results', async () => {
      const user = userEvent.setup();
      const mockResponses = {
        '/api/search': {
          success: true,
          data: {
            results: [],
            pagination: {
              page: 1,
              totalPages: 0,
              total: 0
            }
          }
        }
      };

      const { cleanup } = renderWithProviders(
        <MediaSearchContainer />,
        { mockResponses }
      );

      try {
        const searchInput = screen.getByPlaceholderText(/search for movies/i);
        await user.type(searchInput, 'nonexistent movie');

        await waitFor(() => {
          expect(screen.getByText(/no results found/i)).toBeInTheDocument();
        });

        // Should suggest search tips
        expect(screen.getByText(/try different keywords/i)).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });

    it('should handle malformed API responses', async () => {
      const user = userEvent.setup();
      const mockResponses = {
        '/api/search': {
          success: true,
          data: {
            // Missing required fields
            results: [
              {
                id: '1',
                // Missing name, type, year
                overview: 'Incomplete data'
              }
            ]
          }
        }
      };

      const { cleanup } = renderWithProviders(
        <MediaSearchContainer />,
        { mockResponses }
      );

      try {
        const searchInput = screen.getByPlaceholderText(/search for movies/i);
        await user.type(searchInput, 'test');

        await waitFor(() => {
          expect(screen.getByText(/invalid data received/i)).toBeInTheDocument();
        });
      } finally {
        cleanup();
      }
    });

    it('should handle very long search queries', async () => {
      const user = userEvent.setup();
      const longQuery = 'a'.repeat(1000);
      
      const mockResponses = {
        '/api/search': {
          success: false,
          error: 'Query too long',
          status: 400
        }
      };

      const { cleanup } = renderWithProviders(
        <MediaSearchContainer />,
        { mockResponses }
      );

      try {
        const searchInput = screen.getByPlaceholderText(/search for movies/i);
        await user.type(searchInput, longQuery);

        await waitFor(() => {
          expect(screen.getByText(/query too long/i)).toBeInTheDocument();
        });
      } finally {
        cleanup();
      }
    });

    it('should handle special characters in search', async () => {
      const user = userEvent.setup();
      const specialQuery = '!@#$%^&*()[]{}|\\:";\'<>?,./';
      
      const mockResponses = {
        '/api/search': {
          success: true,
          data: {
            results: [],
            pagination: { page: 1, totalPages: 0, total: 0 }
          }
        }
      };

      const { cleanup } = renderWithProviders(
        <MediaSearchContainer />,
        { mockResponses }
      );

      try {
        const searchInput = screen.getByPlaceholderText(/search for movies/i);
        await user.type(searchInput, specialQuery);

        // Should handle gracefully without crashing
        await waitFor(() => {
          expect(screen.getByText(/no results found/i)).toBeInTheDocument();
        });
      } finally {
        cleanup();
      }
    });
  });

  describe('Queue Error Scenarios', () => {
    it('should handle queue loading failures', async () => {
      const mockResponses = {
        '/api/queue': {
          success: false,
          error: 'Queue service unavailable'
        }
      };

      const { cleanup } = renderWithProviders(
        <QueueContainer />,
        { mockResponses }
      );

      try {
        await waitFor(() => {
          expect(screen.getByText(/queue service unavailable/i)).toBeInTheDocument();
        });

        // Should show retry option
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });

    it('should handle corrupted queue data', async () => {
      const mockResponses = {
        '/api/queue': {
          success: true,
          data: [
            {
              id: '1',
              // Missing required fields
              status: 'downloading'
              // Missing name, type, progress, etc.
            },
            null, // Null item
            {
              id: '2',
              name: 'Valid Item',
              type: 'movie',
              status: 'completed',
              progress: 100
            }
          ]
        }
      };

      const { cleanup } = renderWithProviders(
        <QueueContainer />,
        { mockResponses }
      );

      try {
        await waitFor(() => {
          // Should show valid items and handle invalid ones gracefully
          expect(screen.getByText('Valid Item')).toBeInTheDocument();
        });

        // Should show warning about corrupted data
        expect(screen.getByText(/some items could not be displayed/i)).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });

    it('should handle download operation failures', async () => {
      const user = userEvent.setup();
      const mockResponses = {
        '/api/queue': {
          success: true,
          data: [
            {
              id: '1',
              name: 'Test Movie',
              type: 'movie',
              status: 'downloading',
              progress: 50
            }
          ]
        },
        '/api/queue/1/cancel': {
          success: false,
          error: 'Cannot cancel download'
        }
      };

      const { cleanup } = renderWithProviders(
        <QueueContainer />,
        { mockResponses }
      );

      try {
        await waitFor(() => {
          expect(screen.getByText('Test Movie')).toBeInTheDocument();
        });

        // Try to cancel download
        const cancelButton = screen.getByLabelText(/cancel/i);
        await user.click(cancelButton);

        await waitFor(() => {
          expect(screen.getByText(/cannot cancel download/i)).toBeInTheDocument();
        });
      } finally {
        cleanup();
      }
    });
  });

  describe('Settings Error Scenarios', () => {
    it('should handle configuration save failures', async () => {
      const user = userEvent.setup();
      const mockResponses = {
        '/api/config': {
          success: true,
          data: {
            'download.path': '/downloads'
          }
        },
        '/api/config/update': {
          success: false,
          error: 'Permission denied'
        }
      };

      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={jest.fn()} />,
        { mockResponses }
      );

      try {
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Modify settings
        const downloadPathInput = screen.getByLabelText(/download path/i);
        await user.clear(downloadPathInput);
        await user.type(downloadPathInput, '/new/path');

        // Try to save
        const saveButton = screen.getByRole('button', { name: /save/i });
        await user.click(saveButton);

        await waitFor(() => {
          expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
        });

        // Should keep dialog open with unsaved changes
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByDisplayValue('/new/path')).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });

    it('should handle invalid configuration values', async () => {
      const user = userEvent.setup();
      const mockResponses = {
        '/api/config': {
          success: true,
          data: {
            'download.minSeeders': 5
          }
        },
        '/api/config/update': {
          success: false,
          error: 'Invalid value: minimum seeders must be positive'
        }
      };

      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={jest.fn()} />,
        { mockResponses }
      );

      try {
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Enter invalid value
        const seedersInput = screen.getByLabelText(/minimum seeders/i);
        await user.clear(seedersInput);
        await user.type(seedersInput, '-1');

        const saveButton = screen.getByRole('button', { name: /save/i });
        await user.click(saveButton);

        await waitFor(() => {
          expect(screen.getByText(/minimum seeders must be positive/i)).toBeInTheDocument();
        });
      } finally {
        cleanup();
      }
    });
  });

  describe('Component Error Boundaries', () => {
    it('should catch and display component errors', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Create a component that throws an error
      const ErrorComponent = () => {
        throw new Error('Test component error');
      };

      const { cleanup } = renderWithProviders(<ErrorComponent />);

      try {
        await waitFor(() => {
          expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        });

        // Should show error boundary UI
        expect(screen.getByText(/reload the page/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
      } finally {
        consoleSpy.mockRestore();
        cleanup();
      }
    });

    it('should recover from component errors', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      let shouldThrow = true;
      const ConditionalErrorComponent = () => {
        if (shouldThrow) {
          throw new Error('Conditional error');
        }
        return <div>Component recovered</div>;
      };

      const { cleanup } = renderWithProviders(<ConditionalErrorComponent />);

      try {
        // Should show error boundary
        await waitFor(() => {
          expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        });

        // Fix the error condition
        shouldThrow = false;

        // Click retry
        const retryButton = screen.getByRole('button', { name: /retry/i });
        await user.click(retryButton);

        // Should recover
        await waitFor(() => {
          expect(screen.getByText('Component recovered')).toBeInTheDocument();
        });
      } finally {
        consoleSpy.mockRestore();
        cleanup();
      }
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle large datasets without memory leaks', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Movie ${i}`,
        type: 'movie',
        year: 2020 + (i % 4),
        overview: `Overview for movie ${i}`,
        poster: `https://example.com/poster-${i}.jpg`
      }));

      const mockResponses = {
        '/api/search': {
          success: true,
          data: {
            results: largeDataset,
            pagination: {
              page: 1,
              totalPages: 1000,
              total: 10000
            }
          }
        }
      };

      const { cleanup } = renderWithProviders(
        <MediaSearchContainer />,
        { mockResponses }
      );

      try {
        const searchInput = screen.getByPlaceholderText(/search for movies/i);
        await userEvent.type(searchInput, 'movie');

        // Should handle large dataset gracefully
        await waitFor(() => {
          expect(screen.getByText('Movie 0')).toBeInTheDocument();
        });

        // Should use virtualization for performance
        expect(screen.queryByText('Movie 9999')).not.toBeInTheDocument();
      } finally {
        cleanup();
      }
    });

    it('should handle rapid user interactions', async () => {
      const user = userEvent.setup();
      const { cleanup } = renderWithProviders(<MediaSearchContainer />);

      try {
        const searchInput = screen.getByPlaceholderText(/search for movies/i);

        // Rapid typing should be debounced
        await user.type(searchInput, 'a');
        await user.type(searchInput, 'b');
        await user.type(searchInput, 'c');
        await user.type(searchInput, 'd');
        await user.type(searchInput, 'e');

        // Should only make one API call after debounce
        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledTimes(1);
        });
      } finally {
        cleanup();
      }
    });
  });

  describe('Browser Compatibility Edge Cases', () => {
    it('should handle missing browser APIs gracefully', async () => {
      // Mock missing IntersectionObserver
      const originalIntersectionObserver = window.IntersectionObserver;
      delete (window as any).IntersectionObserver;

      const { cleanup } = renderWithProviders(<MediaSearchContainer />);

      try {
        // Should still render without IntersectionObserver
        expect(screen.getByPlaceholderText(/search for movies/i)).toBeInTheDocument();
      } finally {
        window.IntersectionObserver = originalIntersectionObserver;
        cleanup();
      }
    });

    it('should handle localStorage unavailability', async () => {
      const user = userEvent.setup();
      
      // Mock localStorage throwing errors
      const mockLocalStorage = {
        getItem: jest.fn().mockImplementation(() => {
          throw new Error('localStorage unavailable');
        }),
        setItem: jest.fn().mockImplementation(() => {
          throw new Error('localStorage unavailable');
        })
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
      });

      const { cleanup } = renderWithProviders(<App />);

      try {
        // Should still function without localStorage
        const searchInput = screen.getByPlaceholderText(/search for movies/i);
        await user.type(searchInput, 'test');

        // Should not crash
        expect(searchInput).toHaveValue('test');
      } finally {
        cleanup();
      }
    });
  });
});