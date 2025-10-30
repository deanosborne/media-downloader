import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import FormValidation, { useFormValidation, commonValidationRules } from '../FormValidation';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('FormValidation', () => {
  const mockRules = [
    {
      key: 'name',
      message: 'Name is required',
      validate: (value: string) => Boolean(value && value.trim().length > 0),
      required: true,
    },
    {
      key: 'email',
      message: 'Email must be valid',
      validate: (value: string) => {
        if (!value) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
    },
  ];

  it('renders validation results correctly', () => {
    const data = { name: '', email: 'invalid-email' };
    
    renderWithTheme(
      <FormValidation
        rules={mockRules}
        data={data}
        showValidation={true}
      />
    );
    
    expect(screen.getByText('Validation')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email must be valid')).toBeInTheDocument();
  });

  it('shows only errors when showOnlyErrors is true', () => {
    const data = { name: 'John', email: 'invalid-email' };
    
    renderWithTheme(
      <FormValidation
        rules={mockRules}
        data={data}
        showValidation={true}
        showOnlyErrors={true}
      />
    );
    
    expect(screen.getByText('Email must be valid')).toBeInTheDocument();
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('does not render when showValidation is false', () => {
    const data = { name: '', email: '' };
    
    renderWithTheme(
      <FormValidation
        rules={mockRules}
        data={data}
        showValidation={false}
      />
    );
    
    expect(screen.queryByText('Validation')).not.toBeInTheDocument();
  });

  it('shows custom title', () => {
    const data = { name: '', email: '' };
    
    renderWithTheme(
      <FormValidation
        rules={mockRules}
        data={data}
        showValidation={true}
        title="Form Errors"
      />
    );
    
    expect(screen.getByText('Form Errors')).toBeInTheDocument();
  });

  it('shows success state when all validations pass', () => {
    const data = { name: 'John', email: 'john@example.com' };
    
    renderWithTheme(
      <FormValidation
        rules={mockRules}
        data={data}
        showValidation={true}
        severity="success"
      />
    );
    
    expect(screen.getByText('Validation')).toBeInTheDocument();
    // Should show success icons for valid fields
  });
});

describe('useFormValidation', () => {
  const mockRules = [
    {
      key: 'name',
      message: 'Name is required',
      validate: (value: string) => Boolean(value && value.trim().length > 0),
      required: true,
    },
    {
      key: 'email',
      message: 'Email must be valid',
      validate: (value: string) => {
        if (!value) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      },
    },
  ];

  it('validates form correctly', () => {
    const { result } = renderHook(() => useFormValidation(mockRules));
    
    const validData = { name: 'John', email: 'john@example.com' };
    const validResult = result.current.validateForm(validData);
    
    expect(validResult.isValid).toBe(true);
    expect(validResult.errors).toHaveLength(0);
    expect(validResult.fieldErrors).toEqual({});
  });

  it('returns errors for invalid form', () => {
    const { result } = renderHook(() => useFormValidation(mockRules));
    
    const invalidData = { name: '', email: 'invalid-email' };
    const invalidResult = result.current.validateForm(invalidData);
    
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors).toHaveLength(2);
    expect(invalidResult.fieldErrors.name).toContain('Name is required');
    expect(invalidResult.fieldErrors.email).toContain('Email must be valid');
  });

  it('validates individual field correctly', () => {
    const { result } = renderHook(() => useFormValidation(mockRules));
    
    const validFieldErrors = result.current.validateField('name', 'John');
    expect(validFieldErrors).toHaveLength(0);
    
    const invalidFieldErrors = result.current.validateField('name', '');
    expect(invalidFieldErrors).toContain('Name is required');
  });
});

describe('commonValidationRules', () => {
  it('required rule works correctly', () => {
    const rule = commonValidationRules.required();
    
    expect(rule.validate('')).toBe(false);
    expect(rule.validate('   ')).toBe(false);
    expect(rule.validate('value')).toBe(true);
    expect(rule.validate(null)).toBe(false);
    expect(rule.validate(undefined)).toBe(false);
  });

  it('email rule works correctly', () => {
    const rule = commonValidationRules.email();
    
    expect(rule.validate('')).toBe(true); // Allow empty if not required
    expect(rule.validate('invalid-email')).toBe(false);
    expect(rule.validate('test@example.com')).toBe(true);
    expect(rule.validate('user+tag@domain.co.uk')).toBe(true);
  });

  it('minLength rule works correctly', () => {
    const rule = commonValidationRules.minLength(5);
    
    expect(rule.validate('')).toBe(true); // Allow empty if not required
    expect(rule.validate('abc')).toBe(false);
    expect(rule.validate('abcde')).toBe(true);
    expect(rule.validate('abcdef')).toBe(true);
  });

  it('maxLength rule works correctly', () => {
    const rule = commonValidationRules.maxLength(5);
    
    expect(rule.validate('')).toBe(true);
    expect(rule.validate('abc')).toBe(true);
    expect(rule.validate('abcde')).toBe(true);
    expect(rule.validate('abcdef')).toBe(false);
  });

  it('url rule works correctly', () => {
    const rule = commonValidationRules.url();
    
    expect(rule.validate('')).toBe(true); // Allow empty if not required
    expect(rule.validate('invalid-url')).toBe(false);
    expect(rule.validate('http://example.com')).toBe(true);
    expect(rule.validate('https://www.example.com/path')).toBe(true);
  });

  it('number rule works correctly', () => {
    const rule = commonValidationRules.number();
    
    expect(rule.validate('')).toBe(true); // Allow empty if not required
    expect(rule.validate('abc')).toBe(false);
    expect(rule.validate('123')).toBe(true);
    expect(rule.validate('123.45')).toBe(true);
    expect(rule.validate('-123')).toBe(true);
  });

  it('min rule works correctly', () => {
    const rule = commonValidationRules.min(10);
    
    expect(rule.validate('')).toBe(true); // Allow empty if not required
    expect(rule.validate('5')).toBe(false);
    expect(rule.validate('10')).toBe(true);
    expect(rule.validate('15')).toBe(true);
  });

  it('max rule works correctly', () => {
    const rule = commonValidationRules.max(10);
    
    expect(rule.validate('')).toBe(true); // Allow empty if not required
    expect(rule.validate('5')).toBe(true);
    expect(rule.validate('10')).toBe(true);
    expect(rule.validate('15')).toBe(false);
  });
});