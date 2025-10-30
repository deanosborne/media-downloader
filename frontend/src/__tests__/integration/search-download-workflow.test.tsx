import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setupIntegrationTest, cleanupIntegrationTest, mockApiResponses } from './setup';
import MediaSearchContainer from '../../features/search/MediaSearchContainer';
import QueueContainer from '../../features/queue/QueueContainer';
import App from '../../App';

describe('Search and Download Workflow Integration Tests', () => {
  beforeEach(() => {
    setupIntegrationTest();
  });

  afterEach(() => {
    cleanupIntegrationTest();
  });

  describe('Media Search Integration', () => {
    it('should search for media and display results', async () => {
      const user = userEvent.setup();
      const { cleanup } = renderWithProviders(<MediaSearchContainer />);

      try {
        // Find search input
        const searchInput = screen.getByPlaceholderText(/search for movies/i);
        expect(searchInput).toBeInTheDocument();

        // Type search query
        await user.type(searchInput, 'test movie');

        // Wait for debounced search
        await waitFor(() => {
          expect(screen.getByText('Test Movie')).toBeInTheDocument();
        }, { timeout: 3000 });

        // Verify search results are displayed
        expect(screen.getByText('Test Movie')).toBeInTheDocument();
        expect(screen.getByText('Test TV Show')).toBeInTheDocument();
        expect(screen.getByText('2023')).toBeInTheDocument();
        expect(screen.getByText('2022')).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });

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
      } finally {
        cleanup();
      }
    });
  });

  describe('Queue Management Integration', () => {
    it('should display queue items with correct status', async () => {
      const { cleanup } = renderWithProviders(<QueueContainer />);

      try {
        await waitFor(() => {
          expect(screen.getByText('Test Movie')).toBeInTheDocument();
        });

        // Verify different queue item statuses
        expect(screen.getByText(/downloading/i)).toBeInTheDocument();
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
        expect(screen.getByText(/error/i)).toBeInTheDocument();

        // Verify progress information
        expect(screen.getByText('45%')).toBeInTheDocument();
        expect(screen.getByText('2.5 MB/s')).toBeInTheDocument();
        expect(screen.getByText('00:15:30')).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });
  });
});