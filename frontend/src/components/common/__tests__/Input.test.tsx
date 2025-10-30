import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Input, { PasswordInput, SearchInput, MultiSelectInput, NumberInput } from '../Input';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Input', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders input with label', () => {
    renderWithTheme(
      <Input
        value=""
        onChange={mockOnChange}
        label="Test Input"
      />
    );
    
    const input = screen.getByLabelText('Test Input');
    expect(input).toBeInTheDocument();
  });

  it('calls onChange when value changes', () => {
    renderWithTheme(
      <Input
        value=""
        onChange={mockOnChange}
        label="Test Input"
      />
    );
    
    const input = screen.getByLabelText('Test Input');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('new value');
  });

  it('displays error message', () => {
    renderWithTheme(
      <Input
        value=""
        onChange={mockOnChange}
        label="Test Input"
        error="This field is required"
      />
    );
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    renderWithTheme(
      <Input
        value=""
        onChange={mockOnChange}
        label="Test Input"
        helperText="Enter your name"
      />
    );
    
    expect(screen.getByText('Enter your name')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    renderWithTheme(
      <Input
        value=""
        onChange={mockOnChange}
        label="Test Input"
        disabled
      />
    );
    
    const input = screen.getByLabelText('Test Input');
    expect(input).toBeDisabled();
  });

  it('is read-only when readOnly prop is true', () => {
    renderWithTheme(
      <Input
        value="read only value"
        onChange={mockOnChange}
        label="Test Input"
        readOnly
      />
    );
    
    const input = screen.getByLabelText('Test Input');
    expect(input).toHaveAttribute('readonly');
  });

  it('shows required indicator', () => {
    renderWithTheme(
      <Input
        value=""
        onChange={mockOnChange}
        label="Test Input"
        required
      />
    );
    
    const input = screen.getByLabelText('Test Input *');
    expect(input).toBeInTheDocument();
  });
});

describe('PasswordInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders password input with hidden text', () => {
    renderWithTheme(
      <PasswordInput
        value="secret"
        onChange={mockOnChange}
        label="Password"
      />
    );
    
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles password visibility', () => {
    renderWithTheme(
      <PasswordInput
        value="secret"
        onChange={mockOnChange}
        label="Password"
      />
    );
    
    const input = screen.getByLabelText('Password');
    const toggleButton = screen.getByLabelText('toggle password visibility');
    
    expect(input).toHaveAttribute('type', 'password');
    
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
    
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('shows password strength when showStrength is true', () => {
    renderWithTheme(
      <PasswordInput
        value="StrongPassword123!"
        onChange={mockOnChange}
        label="Password"
        showStrength
      />
    );
    
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('does not show strength for empty password', () => {
    renderWithTheme(
      <PasswordInput
        value=""
        onChange={mockOnChange}
        label="Password"
        showStrength
      />
    );
    
    expect(screen.queryByText('Weak')).not.toBeInTheDocument();
    expect(screen.queryByText('Strong')).not.toBeInTheDocument();
  });
});

describe('SearchInput', () => {
  const mockOnChange = jest.fn();
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnSearch.mockClear();
  });

  it('renders search input with search icon', () => {
    renderWithTheme(
      <SearchInput
        value=""
        onChange={mockOnChange}
        onSearch={mockOnSearch}
        label="Search"
      />
    );
    
    const input = screen.getByLabelText('Search');
    expect(input).toBeInTheDocument();
  });

  it('shows clear button when value is present', () => {
    renderWithTheme(
      <SearchInput
        value="search term"
        onChange={mockOnChange}
        onSearch={mockOnSearch}
        label="Search"
      />
    );
    
    const clearButton = screen.getByLabelText('clear search');
    expect(clearButton).toBeInTheDocument();
  });

  it('clears value when clear button is clicked', () => {
    renderWithTheme(
      <SearchInput
        value="search term"
        onChange={mockOnChange}
        onSearch={mockOnSearch}
        label="Search"
      />
    );
    
    const clearButton = screen.getByLabelText('clear search');
    fireEvent.click(clearButton);
    
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('calls onSearch when Enter is pressed', () => {
    renderWithTheme(
      <SearchInput
        value="search term"
        onChange={mockOnChange}
        onSearch={mockOnSearch}
        label="Search"
      />
    );
    
    const input = screen.getByLabelText('Search');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });
    
    expect(mockOnSearch).toHaveBeenCalledWith('search term');
  });

  it('debounces search calls', async () => {
    renderWithTheme(
      <SearchInput
        value=""
        onChange={mockOnChange}
        onSearch={mockOnSearch}
        label="Search"
        debounceMs={100}
      />
    );
    
    const input = screen.getByLabelText('Search');
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(mockOnSearch).not.toHaveBeenCalled();
    
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test');
    }, { timeout: 200 });
  });
});

describe('MultiSelectInput', () => {
  const mockOnChange = jest.fn();
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders multi-select input', () => {
    renderWithTheme(
      <MultiSelectInput
        value={[]}
        onChange={mockOnChange}
        options={options}
        label="Multi Select"
      />
    );
    
    const input = screen.getByLabelText('Multi Select');
    expect(input).toBeInTheDocument();
  });

  it('displays selected values as chips', () => {
    renderWithTheme(
      <MultiSelectInput
        value={['option1', 'option2']}
        onChange={mockOnChange}
        options={options}
        label="Multi Select"
      />
    );
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    renderWithTheme(
      <MultiSelectInput
        value={[]}
        onChange={mockOnChange}
        options={options}
        label="Multi Select"
        disabled
      />
    );
    
    const input = screen.getByLabelText('Multi Select');
    expect(input).toBeDisabled();
  });
});

describe('NumberInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders number input', () => {
    renderWithTheme(
      <NumberInput
        value={0}
        onChange={mockOnChange}
        label="Number"
      />
    );
    
    const input = screen.getByLabelText('Number');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
  });

  it('calls onChange with number value', () => {
    renderWithTheme(
      <NumberInput
        value={0}
        onChange={mockOnChange}
        label="Number"
      />
    );
    
    const input = screen.getByLabelText('Number');
    fireEvent.change(input, { target: { value: '42' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(42);
  });

  it('handles empty value', () => {
    renderWithTheme(
      <NumberInput
        value={42}
        onChange={mockOnChange}
        label="Number"
      />
    );
    
    const input = screen.getByLabelText('Number');
    fireEvent.change(input, { target: { value: '' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(0);
  });

  it('applies min and max constraints', () => {
    renderWithTheme(
      <NumberInput
        value={5}
        onChange={mockOnChange}
        label="Number"
        min={0}
        max={10}
      />
    );
    
    const input = screen.getByLabelText('Number');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '10');
  });

  it('clamps value to min constraint', () => {
    renderWithTheme(
      <NumberInput
        value={5}
        onChange={mockOnChange}
        label="Number"
        min={10}
      />
    );
    
    const input = screen.getByLabelText('Number');
    fireEvent.change(input, { target: { value: '5' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(10);
  });

  it('clamps value to max constraint', () => {
    renderWithTheme(
      <NumberInput
        value={5}
        onChange={mockOnChange}
        label="Number"
        max={3}
      />
    );
    
    const input = screen.getByLabelText('Number');
    fireEvent.change(input, { target: { value: '5' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(3);
  });
});