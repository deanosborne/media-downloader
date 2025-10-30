import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Button, { IconButtonComponent, FloatingButton, ButtonGroup, PrimaryButton, SecondaryButton, DangerButton } from '../Button';

// Mock icon component
const MockIcon = () => <span data-testid="mock-icon">Icon</span>;

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Button', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders button with text', () => {
    renderWithTheme(
      <Button onClick={mockOnClick}>
        Click me
      </Button>
    );
    
    const button = screen.getByText('Click me');
    expect(button).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    renderWithTheme(
      <Button onClick={mockOnClick}>
        Click me
      </Button>
    );
    
    const button = screen.getByText('Click me');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    renderWithTheme(
      <Button onClick={mockOnClick} disabled>
        Click me
      </Button>
    );
    
    const button = screen.getByText('Click me');
    expect(button).toBeDisabled();
  });

  it('is disabled when loading prop is true', () => {
    renderWithTheme(
      <Button onClick={mockOnClick} loading>
        Click me
      </Button>
    );
    
    const button = screen.getByText('Click me');
    expect(button).toBeDisabled();
  });

  it('shows loading spinner when loading', () => {
    renderWithTheme(
      <Button onClick={mockOnClick} loading>
        Click me
      </Button>
    );
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });

  it('shows loading text when loading and loadingText is provided', () => {
    renderWithTheme(
      <Button onClick={mockOnClick} loading loadingText="Saving...">
        Save
      </Button>
    );
    
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('renders with start icon', () => {
    renderWithTheme(
      <Button onClick={mockOnClick} startIcon={<MockIcon />}>
        Add Item
      </Button>
    );
    
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('renders with end icon', () => {
    renderWithTheme(
      <Button onClick={mockOnClick} endIcon={<MockIcon />}>
        Add Item
      </Button>
    );
    
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('applies different variants', () => {
    const variants = ['text', 'outlined', 'contained'] as const;
    
    variants.forEach((variant) => {
      const { unmount } = renderWithTheme(
        <Button onClick={mockOnClick} variant={variant}>
          {variant} Button
        </Button>
      );
      
      expect(screen.getByText(`${variant} Button`)).toBeInTheDocument();
      unmount();
    });
  });

  it('applies different colors', () => {
    const colors = ['primary', 'secondary', 'error', 'warning', 'info', 'success'] as const;
    
    colors.forEach((color) => {
      const { unmount } = renderWithTheme(
        <Button onClick={mockOnClick} color={color}>
          {color} Button
        </Button>
      );
      
      expect(screen.getByText(`${color} Button`)).toBeInTheDocument();
      unmount();
    });
  });

  it('applies different sizes', () => {
    const sizes = ['small', 'medium', 'large'] as const;
    
    sizes.forEach((size) => {
      const { unmount } = renderWithTheme(
        <Button onClick={mockOnClick} size={size}>
          {size} Button
        </Button>
      );
      
      expect(screen.getByText(`${size} Button`)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders as full width when fullWidth is true', () => {
    renderWithTheme(
      <Button onClick={mockOnClick} fullWidth>
        Full Width Button
      </Button>
    );
    
    const button = screen.getByText('Full Width Button');
    expect(button).toBeInTheDocument();
  });
});

describe('IconButtonComponent', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders icon button', () => {
    renderWithTheme(
      <IconButtonComponent
        icon={<MockIcon />}
        onClick={mockOnClick}
        aria-label="Add item"
      />
    );
    
    const button = screen.getByRole('button', { name: 'Add item' });
    expect(button).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    renderWithTheme(
      <IconButtonComponent
        icon={<MockIcon />}
        onClick={mockOnClick}
        loading
        aria-label="Add item"
      />
    );
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    renderWithTheme(
      <IconButtonComponent
        icon={<MockIcon />}
        onClick={mockOnClick}
        disabled
        aria-label="Add item"
      />
    );
    
    const button = screen.getByRole('button', { name: 'Add item' });
    expect(button).toBeDisabled();
  });
});

describe('FloatingButton', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders floating action button', () => {
    renderWithTheme(
      <FloatingButton
        icon={<MockIcon />}
        onClick={mockOnClick}
      />
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders extended FAB with text', () => {
    renderWithTheme(
      <FloatingButton
        variant="extended"
        icon={<MockIcon />}
        onClick={mockOnClick}
      >
        Add Item
      </FloatingButton>
    );
    
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    renderWithTheme(
      <FloatingButton
        icon={<MockIcon />}
        onClick={mockOnClick}
        loading
      />
    );
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });
});

describe('ButtonGroup', () => {
  const mockOnClick1 = jest.fn();
  const mockOnClick2 = jest.fn();

  beforeEach(() => {
    mockOnClick1.mockClear();
    mockOnClick2.mockClear();
  });

  it('renders group of buttons', () => {
    const buttons = [
      { key: 'button1', children: 'Button 1', onClick: mockOnClick1 },
      { key: 'button2', children: 'Button 2', onClick: mockOnClick2 },
    ];
    
    renderWithTheme(
      <ButtonGroup buttons={buttons} />
    );
    
    expect(screen.getByText('Button 1')).toBeInTheDocument();
    expect(screen.getByText('Button 2')).toBeInTheDocument();
  });

  it('calls respective onClick handlers', () => {
    const buttons = [
      { key: 'button1', children: 'Button 1', onClick: mockOnClick1 },
      { key: 'button2', children: 'Button 2', onClick: mockOnClick2 },
    ];
    
    renderWithTheme(
      <ButtonGroup buttons={buttons} />
    );
    
    fireEvent.click(screen.getByText('Button 1'));
    fireEvent.click(screen.getByText('Button 2'));
    
    expect(mockOnClick1).toHaveBeenCalledTimes(1);
    expect(mockOnClick2).toHaveBeenCalledTimes(1);
  });
});

describe('Pre-configured Button Variants', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders PrimaryButton', () => {
    renderWithTheme(
      <PrimaryButton onClick={mockOnClick}>
        Primary
      </PrimaryButton>
    );
    
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('renders SecondaryButton', () => {
    renderWithTheme(
      <SecondaryButton onClick={mockOnClick}>
        Secondary
      </SecondaryButton>
    );
    
    expect(screen.getByText('Secondary')).toBeInTheDocument();
  });

  it('renders DangerButton', () => {
    renderWithTheme(
      <DangerButton onClick={mockOnClick}>
        Delete
      </DangerButton>
    );
    
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});