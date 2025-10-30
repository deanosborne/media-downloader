import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MediaCard from '../MediaCard';
import { MediaItem, MediaType } from '../../../types';

const mockMedia: MediaItem = {
  id: '1',
  name: 'Test Movie',
  year: 2023,
  type: MediaType.MOVIE,
  overview: 'This is a test movie overview that should be displayed in the card.',
  poster: 'https://example.com/poster.jpg',
  tmdbId: 12345,
};

describe('MediaCard', () => {
  it('renders media information correctly', () => {
    render(<MediaCard media={mockMedia} />);
    
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('Movie')).toBeInTheDocument();
    expect(screen.getByText(/This is a test movie overview/)).toBeInTheDocument();
  });

  it('renders poster image when provided', () => {
    render(<MediaCard media={mockMedia} />);
    
    const poster = screen.getByAltText('Test Movie');
    expect(poster).toBeInTheDocument();
    expect(poster).toHaveAttribute('src', 'https://example.com/poster.jpg');
  });

  it('calls onSelect when select button is clicked', () => {
    const onSelect = jest.fn();
    render(<MediaCard media={mockMedia} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('Select'));
    
    expect(onSelect).toHaveBeenCalledWith(mockMedia);
  });

  it('calls onDownload when download button is clicked', () => {
    const onDownload = jest.fn();
    render(<MediaCard media={mockMedia} onDownload={onDownload} />);
    
    const downloadButton = screen.getByLabelText('Download');
    fireEvent.click(downloadButton);
    
    expect(onDownload).toHaveBeenCalledWith(mockMedia);
  });

  it('calls onInfo when info button is clicked', () => {
    const onInfo = jest.fn();
    render(<MediaCard media={mockMedia} onInfo={onInfo} />);
    
    const infoButton = screen.getByLabelText('View Details');
    fireEvent.click(infoButton);
    
    expect(onInfo).toHaveBeenCalledWith(mockMedia);
  });

  it('disables buttons when loading', () => {
    const onSelect = jest.fn();
    render(<MediaCard media={mockMedia} onSelect={onSelect} loading />);
    
    const selectButton = screen.getByText('Select');
    expect(selectButton).toBeDisabled();
  });

  it('hides actions when showActions is false', () => {
    render(<MediaCard media={mockMedia} showActions={false} />);
    
    expect(screen.queryByText('Select')).not.toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(<MediaCard media={mockMedia} compact />);
    
    // In compact mode, overview should not be displayed
    expect(screen.queryByText(/This is a test movie overview/)).not.toBeInTheDocument();
  });

  it('renders different media types with correct colors', () => {
    const tvShow: MediaItem = {
      ...mockMedia,
      type: MediaType.TV_SHOW,
    };
    
    render(<MediaCard media={tvShow} />);
    
    expect(screen.getByText('TV Show')).toBeInTheDocument();
  });

  it('handles media without year', () => {
    const mediaWithoutYear: MediaItem = {
      ...mockMedia,
      year: undefined,
    };
    
    render(<MediaCard media={mediaWithoutYear} />);
    
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.queryByText('2023')).not.toBeInTheDocument();
  });

  it('handles media without poster', () => {
    const mediaWithoutPoster: MediaItem = {
      ...mockMedia,
      poster: undefined,
    };
    
    render(<MediaCard media={mediaWithoutPoster} />);
    
    expect(screen.queryByAltText('Test Movie')).not.toBeInTheDocument();
  });

  it('handles media without overview', () => {
    const mediaWithoutOverview: MediaItem = {
      ...mockMedia,
      overview: undefined,
    };
    
    render(<MediaCard media={mediaWithoutOverview} />);
    
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    // Overview section should not be present
    expect(screen.queryByText(/This is a test movie overview/)).not.toBeInTheDocument();
  });
});