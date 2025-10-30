import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import FormField from '../FormField';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('FormField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders text input correctly', () => {
    renderWithTheme(
      <FormField
        type="text"
        name="test"
        label="Test Field"
        value="test value"
        onChange={mockOnChange}
      />
    );
    
    const input = screen.getByLabelText('Test Field');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('test value');
  });

  it('renders email input correctly', () => {
    renderWithTheme(
      <FormField
        type="email"
        name="email"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
      />
    );
    
    const input = screen.getByLabelText('Email');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'email');
  });

  it('renders password input correctly', () => {
    renderWithTheme(
      <FormField
        type="password"
        name="password"
        label="Password"
        value="secret"
        onChange={mockOnChange}
      />
    );
    
    const input = screen.getByLabelText('Password');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders textarea correctly', () => {
    renderWithTheme(
      <FormField
        type="textarea"
        name="description"
        label="Description"
        value="Long text"
        onChange={mockOnChange}
        rows={5}
      />
    );
    
    const textarea = screen.getByLabelText('Description');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('Long text');
  });

  it('renders select with options', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ];
    
    renderWithTheme(
      <FormField
        type="select"
        name="select"
        label="Select Option"
        value="option1"
        onChange={mockOnChange}
        options={options}
      />
    );
    
    expect(screen.getByText('Select Option')).toBeInTheDocument();
  });

  it('renders checkbox correctly', () => {
    renderWithTheme(
      <FormField
        type="checkbox"
        name="checkbox"
        label="Check me"
        value={true}
        onChange={mockOnChange}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('renders switch correctly', () => {
    renderWithTheme(
      <FormField
        type="switch"
        name="switch"
        label="Toggle me"
        value={false}
        onChange={mockOnChange}
      />
    );
    
    const switchElement = screen.getByRole('checkbox'); // Switch uses checkbox role
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).not.toBeChecked();
  });

  it('renders radio group with options', () => {
    const options = [
      { value: 'radio1', label: 'Radio 1' },
      { value: 'radio2', label: 'Radio 2' },
    ];
    
    renderWithTheme(
      <FormField
        type="radio"
        name="radio"
        label="Choose Option"
        value="radio1"
        onChange={mockOnChange}
        options={options}
      />
    );
    
    expect(screen.getByText('Choose Option')).toBeInTheDocument();
    expect(screen.getByLabelText('Radio 1')).toBeChecked();
    expect(screen.getByLabelText('Radio 2')).not.toBeChecked();
  });

  it('renders slider correctly', () => {
    renderWithTheme(
      <FormField
        type="slider"
        name="slider"
        label="Volume"
        value={50}
        onChange={mockOnChange}
        min={0}
        max={100}
      />
    );
    
    expect(screen.getByText('Volume')).toBeInTheDocument();
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
  });

  it('handles text input changes', () => {
    renderWithTheme(
      <FormField
        type="text"
        name="test"
        label="Test Field"
        value=""
        onChange={mockOnChange}
      />
    );
    
    const input = screen.getByLabelText('Test Field');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('new value');
  });

  it('handles checkbox changes', () => {
    renderWithTheme(
      <FormField
        type="checkbox"
        name="checkbox"
        label="Check me"
        value={false}
        onChange={mockOnChange}
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it('handles number input changes', () => {
    renderWithTheme(
      <FormField
        type="number"
        name="number"
        label="Number"
        value={0}
        onChange={mockOnChange}
      />
    );
    
    const input = screen.getByLabelText('Number');
    fireEvent.change(input, { target: { value: '42' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(42);
  });

  it('displays error message', () => {
    renderWithTheme(
      <FormField
        type="text"
        name="test"
        label="Test Field"
        value=""
        onChange={mockOnChange}
        error="This field is required"
      />
    );
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    renderWithTheme(
      <FormField
        type="text"
        name="test"
        label="Test Field"
        value=""
        onChange={mockOnChange}
        helperText="Enter your name"
      />
    );
    
    expect(screen.getByText('Enter your name')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    renderWithTheme(
      <FormField
        type="text"
        name="test"
        label="Test Field"
        value=""
        onChange={mockOnChange}
        required
      />
    );
    
    const input = screen.getByLabelText('Test Field *');
    expect(input).toBeInTheDocument();
  });

  it('disables field when disabled prop is true', () => {
    renderWithTheme(
      <FormField
        type="text"
        name="test"
        label="Test Field"
        value=""
        onChange={mockOnChange}
        disabled
      />
    );
    
    const input = screen.getByLabelText('Test Field');
    expect(input).toBeDisabled();
  });
});