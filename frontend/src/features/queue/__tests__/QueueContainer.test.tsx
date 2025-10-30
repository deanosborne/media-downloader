import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QueueContainer from '../QueueContainer';
import { useAppContext } from '../../../store/AppContext';
import { useQueue } from '../../../hooks/useQueue';
import { QueueStatus, MediaType } from '../../../types';

// Mock the hooks
jest.mock('../../../store/AppContext');
jest.mock('../../../hooks/useQueue');

const mockUseAppContext = useAppContext as jest.MockedFunction<typeof useAppContext>;
const mockUseQueue = useQueue as jest.MockedFunction<typeof useQueue>;

const mockQueueItems = [
  {
    id: '1',
    type: MediaType.MOVIE,
    name: 'Test Movie 1',
    year: 2023,
    tmdbId: 12345,
    isSeasonPack: false,
    status: QueueStatus.IN_PROGRESS,
    progress: 45,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: '2',
    type: MediaType.TV_SHOW,
    name: 'Test TV Show',
    year: 2022,
    tmdbId: 67890,
    season: 1,
    episode: 1,
    isSeasonPack: false,
    status: QueueStatus.COMPLETED,
    progress: 100,
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
  {
    id: '3',
    type: MediaType.BOOK,
    name: 'Test Book',
    year: 2021,
    tmdbId: 11111,
    isSeasonPack: false,
    status: QueueStatus.ERROR,
    progress: 0,
    error: 'Download failed',
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03'),
  },
];

const mockActions = {
  addToQueue: jest.fn(),
  updateQueueItem: jest.fn(),
  removeFromQueue: jest.fn(),
  refreshQueue: jest.fn(),
  clearQueueError: jest.fn(),
  updateConfig: jest.fn(),
  updateConfigSection: jest.fn(),
  refreshConfig: jest.fn(),
  clearConfigError: jest.fn(),
  updateUserPreferences: jest.fn(),
  resetUserPreferences: jest.fn(),
  clearUserError: jest.fn(),
};

const mockState = {
  queue: {
    items: mockQueueItems,
    loading: false,
    error: null,
    lastUpdated: new Date(),
  },
  config: { data: null, loading: false, error: null, isValid: false },
  user: { preferences: {} as any, loading: false, error: null },
};

describe('QueueContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAppContext.mockReturnValue({
      state: mockState,
      actions: mockActions,
    });
    
    mockUseQueue.mockReturnValue({
      data: mockQueueItems,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders queue list with items', () => {
    render(<QueueContainer />);
    
    expect(screen.getByText(/Test Movie 1/)).toBeInTheDocument();
    expect(screen.getByText(/Test TV Show/)).toBeInTheDocument();
    expect(screen.getByText(/Test Book/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseAppContext.mockReturnValue({
      state: {
        ...mockState,
        queue: { ...mockState.queue, loading: true },
      },
      actions: mockActions,
    });
    
    render(<QueueContainer />);
    
    // Loading state should be passed to QueueList
    expect(screen.getByText('Download Queue (3 items)')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const error = 'Failed to load queue';
    mockUseAppContext.mockReturnValue({
      state: {
        ...mockState,
        queue: { ...mockState.queue, error },
      },
      actions: mockActions,
    });
    
    render(<QueueContainer />);
    
    expect(screen.getAllByText(error)[0]).toBeInTheDocument();
  });

  it('calls removeFromQueue when item is removed', async () => {
    render(<QueueContainer />);
    
    const removeButtons = screen.getAllByLabelText('Remove from Queue');
    fireEvent.click(removeButtons[0]);
    
    await waitFor(() => {
      expect(mockActions.removeFromQueue).toHaveBeenCalledWith('1');
    });
  });

  it('calls updateQueueItem when item is retried', async () => {
    render(<QueueContainer />);
    
    // Find the retry button for the error item
    const retryButton = screen.getByLabelText('Retry Download');
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(mockActions.updateQueueItem).toHaveBeenCalledWith('3', {
        status: 'not_started',
        error: undefined,
        progress: 0,
      });
    });
  });

  it('calls refreshQueue when refresh all is clicked', async () => {
    render(<QueueContainer />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockActions.refreshQueue).toHaveBeenCalled();
    });
  });

  it('removes completed items when clear completed is clicked', async () => {
    render(<QueueContainer />);
    
    const clearButton = screen.getByText('Clear Completed');
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(mockActions.removeFromQueue).toHaveBeenCalledWith('2'); // Completed item
    });
  });

  it('handles auto refresh', () => {
    render(<QueueContainer autoRefresh refreshInterval={1000} />);
    
    expect(mockUseQueue).toHaveBeenCalledWith({
      refetchInterval: 1000,
    });
  });

  it('disables auto refresh when specified', () => {
    render(<QueueContainer autoRefresh={false} />);
    
    expect(mockUseQueue).toHaveBeenCalledWith({
      refetchInterval: undefined,
    });
  });

  it('renders in compact mode', () => {
    render(<QueueContainer compact />);
    
    // Should still render items but in compact mode
    expect(screen.getByText(/Test Movie 1/)).toBeInTheDocument();
  });

  it('hides stats when specified', () => {
    render(<QueueContainer showStats={false} />);
    
    // Stats should be hidden
    expect(screen.queryByText('Download Queue (3 items)')).not.toBeInTheDocument();
  });

  it('handles hook error', () => {
    const hookError = new Error('Hook error');
    mockUseQueue.mockReturnValue({
      data: undefined,
      loading: false,
      error: hookError,
      refetch: jest.fn(),
    });
    
    render(<QueueContainer />);
    
    expect(screen.getByText('Hook error')).toBeInTheDocument();
  });

  it('handles empty queue', () => {
    mockUseAppContext.mockReturnValue({
      state: {
        ...mockState,
        queue: { ...mockState.queue, items: [] },
      },
      actions: mockActions,
    });
    
    mockUseQueue.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    
    render(<QueueContainer />);
    
    expect(screen.getByText('Queue is Empty')).toBeInTheDocument();
  });

  it('handles refresh item action', async () => {
    const mockRefetch = jest.fn();
    mockUseQueue.mockReturnValue({
      data: mockQueueItems,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    
    render(<QueueContainer />);
    
    const refreshButtons = screen.getAllByLabelText('Refresh Status');
    fireEvent.click(refreshButtons[0]);
    
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('handles errors in queue actions gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockActions.removeFromQueue.mockRejectedValue(new Error('Remove failed'));
    
    render(<QueueContainer />);
    
    const removeButtons = screen.getAllByLabelText('Remove from Queue');
    fireEvent.click(removeButtons[0]);
    
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Failed to remove item from queue:', expect.any(Error));
    });
    
    consoleError.mockRestore();
  });
});