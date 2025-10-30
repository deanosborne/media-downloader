import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import QueueItem from '../QueueItem';
import { QueueItem as QueueItemType, QueueStatus, MediaType } from '../../../types';

const mockQueueItem: QueueItemType = {
  id: '1',
  type: MediaType.MOVIE,
  name: 'Test Movie',
  year: 2023,
  tmdbId: 12345,
  isSeasonPack: false,
  status: QueueStatus.NOT_STARTED,
  progress: 0,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
};

describe('QueueItem', () => {
  it('renders queue item information correctly', () => {
    render(<QueueItem item={mockQueueItem} />);
    
    expect(screen.getByText(/Test Movie \(2023\)/)).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText(/Movie •/)).toBeInTheDocument();
  });

  it('displays progress bar for in-progress items', () => {
    const inProgressItem: QueueItemType = {
      ...mockQueueItem,
      status: QueueStatus.IN_PROGRESS,
      progress: 45,
    };
    
    render(<QueueItem item={inProgressItem} />);
    
    expect(screen.getByText('Downloading')).toBeInTheDocument();
    expect(screen.getByText(/45% complete/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error message for failed items', () => {
    const errorItem: QueueItemType = {
      ...mockQueueItem,
      status: QueueStatus.ERROR,
      error: 'Download failed: Network error',
    };
    
    render(<QueueItem item={errorItem} />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Download failed: Network error')).toBeInTheDocument();
  });

  it('shows completed status for finished items', () => {
    const completedItem: QueueItemType = {
      ...mockQueueItem,
      status: QueueStatus.COMPLETED,
      progress: 100,
    };
    
    render(<QueueItem item={completedItem} />);
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('formats TV show episodes correctly', () => {
    const tvEpisode: QueueItemType = {
      ...mockQueueItem,
      type: MediaType.TV_SHOW,
      name: 'Test TV Show',
      season: 1,
      episode: 5,
      episodeName: 'Test Episode',
    };
    
    render(<QueueItem item={tvEpisode} />);
    
    expect(screen.getByText(/Test TV Show \(2023\) - S01E05 - Test Episode/)).toBeInTheDocument();
  });

  it('formats season pack correctly', () => {
    const seasonPack: QueueItemType = {
      ...mockQueueItem,
      type: MediaType.TV_SHOW,
      name: 'Test TV Show',
      season: 2,
      isSeasonPack: true,
    };
    
    render(<QueueItem item={seasonPack} />);
    
    expect(screen.getByText(/Test TV Show \(2023\) - Season 2 \(Full Season\)/)).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = jest.fn();
    render(<QueueItem item={mockQueueItem} onRemove={onRemove} />);
    
    fireEvent.click(screen.getByLabelText('Remove from Queue'));
    
    expect(onRemove).toHaveBeenCalledWith('1');
  });

  it('calls onRetry when retry button is clicked for error items', () => {
    const onRetry = jest.fn();
    const errorItem: QueueItemType = {
      ...mockQueueItem,
      status: QueueStatus.ERROR,
      error: 'Download failed',
    };
    
    render(<QueueItem item={errorItem} onRetry={onRetry} />);
    
    fireEvent.click(screen.getByLabelText('Retry Download'));
    
    expect(onRetry).toHaveBeenCalledWith('1');
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = jest.fn();
    render(<QueueItem item={mockQueueItem} onRefresh={onRefresh} />);
    
    fireEvent.click(screen.getByLabelText('Refresh Status'));
    
    expect(onRefresh).toHaveBeenCalledWith('1');
  });

  it('disables buttons when loading', () => {
    const onRemove = jest.fn();
    render(<QueueItem item={mockQueueItem} onRemove={onRemove} loading />);
    
    const removeButton = screen.getByLabelText('Remove from Queue');
    expect(removeButton).toBeDisabled();
  });

  it('shows retry button only for error items', () => {
    render(<QueueItem item={mockQueueItem} onRetry={jest.fn()} />);
    
    expect(screen.queryByLabelText('Retry Download')).not.toBeInTheDocument();
    
    const errorItem: QueueItemType = {
      ...mockQueueItem,
      status: QueueStatus.ERROR,
    };
    
    render(<QueueItem item={errorItem} onRetry={jest.fn()} />);
    
    expect(screen.getByLabelText('Retry Download')).toBeInTheDocument();
  });

  it('handles items without year', () => {
    const itemWithoutYear: QueueItemType = {
      ...mockQueueItem,
      year: undefined,
    };
    
    render(<QueueItem item={itemWithoutYear} />);
    
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.queryByText('(2023)')).not.toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(<QueueItem item={mockQueueItem} compact />);
    
    // Should still render all essential information
    expect(screen.getByText(/Test Movie/)).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});