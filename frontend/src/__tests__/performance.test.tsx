import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MediaCard from '../components/common/MediaCard';
import VirtualizedList from '../components/common/VirtualizedList';
import { MediaItem, MediaType } from '../types';

// Mock theme for testing
const theme = createTheme();

// Helper to wrap components with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

// Mock media items for testing
const createMockMediaItem = (id: number): MediaItem => ({
  id: id.toString(),
  name: `Test Movie ${id}`,
  type: MediaType.MOVIE,
  year: 2020 + (id % 5),
  overview: `This is a test movie description for movie ${id}. It has a longer description to test text truncation and rendering performance.`,
  poster: `https://example.com/poster${id}.jpg`,
  tmdbId: id,
});

describe('Performance Tests', () => {
  describe('MediaCard Performance', () => {
    it('should render MediaCard efficiently', () => {
      const mediaItem = createMockMediaItem(1);
      const onSelect = jest.fn();

      const startTime = performance.now();
      
      renderWithTheme(
        <MediaCard
          media={mediaItem}
          onSelect={onSelect}
          loading={false}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in less than 50ms
      expect(renderTime).toBeLessThan(50);
      expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
    });

    it('should handle multiple MediaCard renders efficiently', () => {
      const mediaItems = Array.from({ length: 50 }, (_, i) => createMockMediaItem(i));
      const onSelect = jest.fn();

      const startTime = performance.now();

      renderWithTheme(
        <div>
          {mediaItems.map(item => (
            <MediaCard
              key={item.id}
              media={item}
              onSelect={onSelect}
              loading={false}
            />
          ))}
        </div>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render 50 cards in less than 500ms
      expect(renderTime).toBeLessThan(500);
      expect(screen.getByText('Test Movie 0')).toBeInTheDocument();
      expect(screen.getByText('Test Movie 49')).toBeInTheDocument();
    });

    it('should not re-render when props do not change', () => {
      const mediaItem = createMockMediaItem(1);
      const onSelect = jest.fn();

      const { rerender } = renderWithTheme(
        <MediaCard
          media={mediaItem}
          onSelect={onSelect}
          loading={false}
        />
      );

      // Re-render with same props
      const startTime = performance.now();
      
      rerender(
        <ThemeProvider theme={theme}>
          <MediaCard
            media={mediaItem}
            onSelect={onSelect}
            loading={false}
          />
        </ThemeProvider>
      );

      const endTime = performance.now();
      const rerenderTime = endTime - startTime;

      // Re-render should be very fast due to memoization
      expect(rerenderTime).toBeLessThan(10);
    });
  });

  describe('VirtualizedList Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => createMockMediaItem(i));
      
      const renderItem = (item: MediaItem, index: number) => (
        <div data-testid={`item-${index}`}>
          {item.name}
        </div>
      );

      const keyExtractor = (item: MediaItem) => item.id;

      const startTime = performance.now();

      render(
        <VirtualizedList
          items={largeDataset}
          itemHeight={50}
          containerHeight={400}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render 10,000 items virtually in less than 100ms
      expect(renderTime).toBeLessThan(100);

      // Should only render visible items
      const renderedItems = screen.getAllByTestId(/item-\d+/);
      expect(renderedItems.length).toBeLessThan(50); // Much less than 10,000
    });

    it('should scroll smoothly through large datasets', async () => {
      const largeDataset = Array.from({ length: 5000 }, (_, i) => createMockMediaItem(i));
      
      const renderItem = (item: MediaItem, index: number) => (
        <div data-testid={`item-${index}`}>
          {item.name}
        </div>
      );

      const keyExtractor = (item: MediaItem) => item.id;

      const { container } = render(
        <VirtualizedList
          items={largeDataset}
          itemHeight={50}
          containerHeight={400}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
        />
      );

      const scrollContainer = container.firstChild as HTMLElement;

      // Perform multiple scroll operations
      const scrollOperations = [500, 1000, 2000, 3000, 1500];
      
      for (const scrollTop of scrollOperations) {
        const startTime = performance.now();
        
        fireEvent.scroll(scrollContainer, { target: { scrollTop } });
        
        const endTime = performance.now();
        const scrollTime = endTime - startTime;

        // Each scroll operation should be fast
        expect(scrollTime).toBeLessThan(20);
      }
    });
  });

  describe('Memory Usage', () => {
    it('should not create memory leaks with frequent re-renders', () => {
      const mediaItem = createMockMediaItem(1);
      const onSelect = jest.fn();

      const { rerender, unmount } = renderWithTheme(
        <MediaCard
          media={mediaItem}
          onSelect={onSelect}
          loading={false}
        />
      );

      // Perform many re-renders
      for (let i = 0; i < 100; i++) {
        rerender(
          <ThemeProvider theme={theme}>
            <MediaCard
              media={{ ...mediaItem, name: `Updated ${i}` }}
              onSelect={onSelect}
              loading={i % 2 === 0}
            />
          </ThemeProvider>
        );
      }

      // Should not throw or cause issues
      expect(screen.getByText('Updated 99')).toBeInTheDocument();

      // Cleanup should work properly
      unmount();
    });

    it('should handle component unmounting gracefully', () => {
      const mediaItems = Array.from({ length: 100 }, (_, i) => createMockMediaItem(i));
      
      const { unmount } = renderWithTheme(
        <div>
          {mediaItems.map(item => (
            <MediaCard
              key={item.id}
              media={item}
              onSelect={jest.fn()}
              loading={false}
            />
          ))}
        </div>
      );

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Event Handler Performance', () => {
    it('should handle rapid click events efficiently', () => {
      const mediaItem = createMockMediaItem(1);
      const onSelect = jest.fn();

      renderWithTheme(
        <MediaCard
          media={mediaItem}
          onSelect={onSelect}
          loading={false}
        />
      );

      const selectButton = screen.getByText('Select');

      // Rapid clicks
      const startTime = performance.now();
      
      for (let i = 0; i < 50; i++) {
        fireEvent.click(selectButton);
      }

      const endTime = performance.now();
      const clickTime = endTime - startTime;

      // Should handle 50 clicks in less than 100ms
      expect(clickTime).toBeLessThan(100);
      expect(onSelect).toHaveBeenCalledTimes(50);
    });
  });
});