import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VirtualizedList from '../VirtualizedList';

// Mock data for testing
const generateMockItems = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    name: `Item ${index}`,
    value: `Value ${index}`,
  }));
};

describe('VirtualizedList', () => {
  const mockItems = generateMockItems(1000);
  const itemHeight = 50;
  const containerHeight = 300;

  const renderItem = (item: typeof mockItems[0], index: number) => (
    <div data-testid={`item-${index}`}>
      {item.name}: {item.value}
    </div>
  );

  const keyExtractor = (item: typeof mockItems[0], index: number) => item.id;

  it('should render only visible items', () => {
    render(
      <VirtualizedList
        items={mockItems}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
      />
    );

    // Should render approximately 6-7 visible items (300px / 50px = 6) plus overscan
    const visibleItems = screen.getAllByTestId(/item-\d+/);
    expect(visibleItems.length).toBeLessThan(20); // Much less than 1000 total items
    expect(visibleItems.length).toBeGreaterThan(5); // But more than just visible items
  });

  it('should render first items initially', () => {
    render(
      <VirtualizedList
        items={mockItems}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
      />
    );

    // Should render first item
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
    expect(screen.getByText('Item 0: Value 0')).toBeInTheDocument();
  });

  it('should update visible items when scrolled', () => {
    const { container } = render(
      <VirtualizedList
        items={mockItems}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
      />
    );

    const scrollContainer = container.firstChild as HTMLElement;

    // Scroll down significantly
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 2000 } });

    // Should now render items around index 40 (2000px / 50px = 40)
    expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
    
    // Should have items around the scrolled position
    const visibleItems = screen.getAllByTestId(/item-\d+/);
    expect(visibleItems.length).toBeGreaterThan(0);
  });

  it('should handle empty items array', () => {
    render(
      <VirtualizedList
        items={[]}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
      />
    );

    // Should not render any items
    expect(screen.queryByTestId(/item-\d+/)).not.toBeInTheDocument();
  });

  it('should handle single item', () => {
    const singleItem = [mockItems[0]];
    
    render(
      <VirtualizedList
        items={singleItem}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
      />
    );

    expect(screen.getByTestId('item-0')).toBeInTheDocument();
    expect(screen.getByText('Item 0: Value 0')).toBeInTheDocument();
  });

  it('should respect overscan parameter', () => {
    render(
      <VirtualizedList
        items={mockItems}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        overscan={10}
      />
    );

    // With higher overscan, should render more items
    const visibleItems = screen.getAllByTestId(/item-\d+/);
    expect(visibleItems.length).toBeGreaterThan(15); // More items due to higher overscan
  });

  it('should maintain scroll position', () => {
    const { container } = render(
      <VirtualizedList
        items={mockItems}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
      />
    );

    const scrollContainer = container.firstChild as HTMLElement;
    const scrollTop = 1000;

    fireEvent.scroll(scrollContainer, { target: { scrollTop } });

    // Scroll position should be maintained
    expect(scrollContainer.scrollTop).toBe(scrollTop);
  });
});