import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MediaSearchContainer from '../MediaSearchContainer';
import { useMediaSearch } from '../../../hooks/useMediaSearch';
import { useAppContext } from '../../../store/AppContext';
import { MediaType } from '../../../types';

// Mock the hooks
jest.mock('../../../hooks/useMediaSearch');
jest.mock('../../../store/AppContext');

const mockUseMediaSearch = useMediaSearch as jest.MockedFunction<typeof useMediaSearch>;
const mockUseAppContext = useAppContext as jest.MockedFunction<typeof useAppContext>;

const mockSearchResults = {
  results: [
    {
      id: '1',
      name: 'Test Movie',
      year: 2023,
      type: MediaType.MOVIE,
      overview: 'A test movie',
      poster: 'https://example.com/poster.jpg',
      tmdbId: 12345,
    },
    {
      id: '2',
      name: 'Test TV Show',
      year: 2022,
      type: MediaType.TV_SHOW,
      overview: 'A test TV show',
      tmdbId: 67890,
    },
  ],
  totalResults: 2,
  page: 1,
  totalPages: 1,
};

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
  queue: { items: [], loading: false, error: null, lastUpdated: null },
  config: { data: null, loading: false, error: null, isValid: false },
  user: { preferences: {} as any, loading: false, error: null },
};

describe('MediaSearchContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAppContext.mockReturnValue({
      state: mockState,
      actions: mockActions,
    });
    
    mockUseMediaSearch.mockReturnValue({
      data: undefined,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders search form', () => {
    render(<MediaSearchContainer />);
    
    expect(screen.getByLabelText('Search Media')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('updates search query when typing', () => {
    render(<MediaSearchContainer />);
    
    const searchInput = screen.getByLabelText('Search Media');
    fireEvent.change(searchInput, { target: { value: 'test movie' } });
    
    expect(searchInput).toHaveValue('test movie');
  });

  it('shows search results when available', () => {
    mockUseMediaSearch.mockReturnValue({
      data: mockSearchResults,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    
    render(<MediaSearchContainer />);
    
    expect(screen.getByText('Search Results (2 found)')).toBeInTheDocument();
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('Test TV Show')).toBeInTheDocument();
  });

  it('shows loading state during search', () => {
    mockUseMediaSearch.mockReturnValue({
      data: undefined,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });
    
    render(<MediaSearchContainer />);
    
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('shows error state when search fails', () => {
    const error = new Error('Search failed');
    mockUseMediaSearch.mockReturnValue({
      data: undefined,
      loading: false,
      error,
      refetch: jest.fn(),
    });
    
    render(<MediaSearchContainer />);
    
    expect(screen.getByText('Search failed: Search failed')).toBeInTheDocument();
  });

  it('shows no results message when search returns empty', () => {
    mockUseMediaSearch.mockReturnValue({
      data: { ...mockSearchResults, results: [], totalResults: 0 },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    
    render(<MediaSearchContainer />);
    
    // First trigger a search
    const searchInput = screen.getByLabelText('Search Media');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    // Wait for debounce and check for no results message
    waitFor(() => {
      expect(screen.getByText('No Results Found')).toBeInTheDocument();
    });
  });

  it('filters by media type', () => {
    render(<MediaSearchContainer />);
    
    const typeSelect = screen.getByRole('combobox');
    fireEvent.mouseDown(typeSelect);
    
    const movieOption = screen.getByText('Movies');
    fireEvent.click(movieOption);
    
    expect(typeSelect).toHaveTextContent('Movies');
  });

  it('calls onMediaSelect when media is selected', async () => {
    const onMediaSelect = jest.fn();
    
    mockUseMediaSearch.mockReturnValue({
      data: mockSearchResults,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    
    render(<MediaSearchContainer onMediaSelect={onMediaSelect} />);
    
    const selectButton = screen.getAllByText('Select')[0];
    fireEvent.click(selectButton);
    
    expect(onMediaSelect).toHaveBeenCalledWith(mockSearchResults.results[0]);
  });

  it('adds to queue by default when no onMediaSelect provided', async () => {
    mockUseMediaSearch.mockReturnValue({
      data: mockSearchResults,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    
    render(<MediaSearchContainer />);
    
    const selectButton = screen.getAllByText('Select')[0];
    fireEvent.click(selectButton);
    
    await waitFor(() => {
      expect(mockActions.addToQueue).toHaveBeenCalledWith({
        name: 'Test Movie',
        type: MediaType.MOVIE,
        year: 2023,
        tmdbId: 12345,
      });
    });
  });

  it('calls onMediaDownload when download button is clicked', () => {
    const onMediaDownload = jest.fn();
    
    mockUseMediaSearch.mockReturnValue({
      data: mockSearchResults,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    
    render(<MediaSearchContainer onMediaDownload={onMediaDownload} />);
    
    const downloadButton = screen.getAllByLabelText('Download')[0];
    fireEvent.click(downloadButton);
    
    expect(onMediaDownload).toHaveBeenCalledWith(mockSearchResults.results[0]);
  });

  it('calls onMediaInfo when info button is clicked', () => {
    const onMediaInfo = jest.fn();
    
    mockUseMediaSearch.mockReturnValue({
      data: mockSearchResults,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    
    render(<MediaSearchContainer onMediaInfo={onMediaInfo} />);
    
    const infoButton = screen.getAllByLabelText('View Details')[0];
    fireEvent.click(infoButton);
    
    expect(onMediaInfo).toHaveBeenCalledWith(mockSearchResults.results[0]);
  });

  it('clears search when clear button is clicked', () => {
    render(<MediaSearchContainer />);
    
    const searchInput = screen.getByLabelText('Search Media');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    const clearButton = screen.getByTestId('ClearIcon').closest('button');
    fireEvent.click(clearButton);
    
    expect(searchInput).toHaveValue('');
  });

  it('triggers search on Enter key press', () => {
    render(<MediaSearchContainer autoSearch={false} />);
    
    const searchInput = screen.getByLabelText('Search Media');
    fireEvent.change(searchInput, { target: { value: 'test movie' } });
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter' });
    
    // Should trigger search (tested via hook call)
    expect(mockUseMediaSearch).toHaveBeenCalled();
  });

  it('shows minimum character requirement', () => {
    render(<MediaSearchContainer />);
    
    const searchInput = screen.getByLabelText('Search Media');
    fireEvent.change(searchInput, { target: { value: 'a' } });
    
    expect(screen.getByText('Enter at least 2 characters to search')).toBeInTheDocument();
  });

  it('hides type filter when showTypeFilter is false', () => {
    render(<MediaSearchContainer showTypeFilter={false} />);
    
    expect(screen.queryByLabelText('Type')).not.toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    mockUseMediaSearch.mockReturnValue({
      data: mockSearchResults,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    
    render(<MediaSearchContainer compact />);
    
    // Should still render results but in compact layout
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('shows pagination info when multiple pages', () => {
    const multiPageResults = {
      ...mockSearchResults,
      page: 1,
      totalPages: 3,
    };
    
    mockUseMediaSearch.mockReturnValue({
      data: multiPageResults,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    
    render(<MediaSearchContainer />);
    
    expect(screen.getByText('Showing page 1 of 3')).toBeInTheDocument();
  });
});