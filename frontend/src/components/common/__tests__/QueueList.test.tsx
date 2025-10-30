import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import QueueList from '../QueueList';
import { QueueItem as QueueItemType, QueueStatus, MediaType } from '../../../types';

const mockQueueItems: QueueItemType[] = [
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
    status: QueueStatus.NOT_STARTED,
    progress: 0,
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
  {
    id: '3',
    type: MediaType.MOVIE,
    name: 'Test Movie 2',
    year: 2021,
    tmdbId: 11111,
    isSeasonPack: false,
    status: QueueStatus.COMPLETED,
    progress: 100,
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03'),
  },
  {
    id: '4',
    type: MediaType.BOOK,
    name: 'Test Book',
    year: 2020,
    tmdbId: 22222,
    isSeasonPack: false,
    status: QueueStatus.ERROR,
    progress: 0,
    error: 'Download failed: Network error',
    createdAt: new Date('2023-01-04'),
    updatedAt: new Date('2023-01-04'),
  },
];

describe('QueueList', () => {
  it('renders queue items correctly', () => {
    render(<QueueList items={mockQueueItems} />);
    
    expect(screen.getByText(/Test Movie 1/)).toBeInTheDocument();
    expect(screen.getByText(/Test TV Show/)).toBeInTheDocument();
    expect(screen.getByText(/Test Movie 2/)).toBeInTheDocument();
    expect(screen.getByText(/Test Book/)).toBeInTheDocument();
  });

  it('displays queue statistics', () => {
    render(<QueueList items={mockQueueItems} showStats />);
    
    expect(screen.getByText('Download Queue (4 items)')).toBeInTheDocument();
    expect(screen.getByText('1 Downloading')).toBeInTheDocument();
    expect(screen.getByText('1 Pending')).toBeInTheDocument();
    expect(screen.getByText('1 Completed')).toBeInTheDocument();
    expect(screen.getByText('1 Errors')).toBeInTheDocument();
  });

  it('groups items by status correctly', () => {
    render(<QueueList items={mockQueueItems} />);
    
    expect(screen.getByText('Currently Downloading')).toBeInTheDocument();
    expect(screen.getAllByText('Pending')[0]).toBeInTheDocument();
    expect(screen.getByText('Errors (1)')).toBeInTheDocument();
    expect(screen.getByText('Completed (1)')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(<QueueList items={[]} />);
    
    expect(screen.getByText('Queue is Empty')).toBeInTheDocument();
    expect(screen.getByText('Add some media to your download queue to get started.')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<QueueList items={[]} loading />);
    
    expect(screen.getByText('Loading queue...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const error = 'Failed to load queue';
    render(<QueueList items={[]} error={error} />);
    
    expect(screen.getByText(error)).toBeInTheDocument();
  });

  it('calls onRefreshAll when refresh button is clicked', () => {
    const onRefreshAll = jest.fn();
    render(<QueueList items={mockQueueItems} onRefreshAll={onRefreshAll} />);
    
    fireEvent.click(screen.getByText('Refresh'));
    
    expect(onRefreshAll).toHaveBeenCalled();
  });

  it('calls onClearCompleted when clear completed button is clicked', () => {
    const onClearCompleted = jest.fn();
    render(<QueueList items={mockQueueItems} onClearCompleted={onClearCompleted} />);
    
    fireEvent.click(screen.getByText('Clear Completed'));
    
    expect(onClearCompleted).toHaveBeenCalled();
  });

  it('shows clear completed button only when there are completed items', () => {
    const itemsWithoutCompleted = mockQueueItems.filter(item => item.status !== QueueStatus.COMPLETED);
    
    render(<QueueList items={itemsWithoutCompleted} onClearCompleted={jest.fn()} />);
    
    expect(screen.queryByText('Clear Completed')).not.toBeInTheDocument();
  });

  it('passes callbacks to queue items', () => {
    const onRemoveItem = jest.fn();
    const onRetryItem = jest.fn();
    const onRefreshItem = jest.fn();
    
    render(
      <QueueList
        items={mockQueueItems}
        onRemoveItem={onRemoveItem}
        onRetryItem={onRetryItem}
        onRefreshItem={onRefreshItem}
      />
    );
    
    // Find and click a remove button
    const removeButtons = screen.getAllByLabelText('Remove from Queue');
    fireEvent.click(removeButtons[0]);
    
    expect(onRemoveItem).toHaveBeenCalled();
  });

  it('hides stats when showStats is false', () => {
    render(<QueueList items={mockQueueItems} showStats={false} />);
    
    expect(screen.queryByText('Download Queue (4 items)')).not.toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(<QueueList items={mockQueueItems} compact />);
    
    // In compact mode, section headers should not be displayed
    expect(screen.queryByText('Currently Downloading')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending', { selector: 'h6' })).not.toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    render(<QueueList items={mockQueueItems} loading onRefreshAll={jest.fn()} />);
    
    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeDisabled();
  });

  it('shows retry button in error state', () => {
    const onRefreshAll = jest.fn();
    render(<QueueList items={[]} error="Network error" onRefreshAll={onRefreshAll} />);
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    expect(onRefreshAll).toHaveBeenCalled();
  });
});