import React, { useState, useCallback } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Autocomplete,
  Chip,
  Box,
  SxProps,
  Theme,
  TextFieldProps,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

export type InputVariant = 'outlined' | 'filled' | 'standard';
export type InputSize = 'small' | 'medium';

export interface BaseInputProps {
  /** Input value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Focus handler */
  onFocus?: () => void;
  /** Input label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Helper text */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Whether input is required */
  required?: boolean;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Whether input is read-only */
  readOnly?: boolean;
  /** Input variant */
  variant?: InputVariant;
  /** Input size */
  size?: InputSize;
  /** Whether input takes full width */
  fullWidth?: boolean;
  /** Custom styling */
  sx?: SxProps<Theme>;
}

/**
 * Base input component with consistent styling
 */
export const Input: React.FC<BaseInputProps & Omit<TextFieldProps, 'onChange' | 'value'>> = ({
  value,
  onChange,
  onBlur,
  onFocus,
  label,
  placeholder,
  helperText,
  error,
  required = false,
  disabled = false,
  readOnly = false,
  variant = 'outlined',
  size = 'medium',
  fullWidth = true,
  sx,
  ...props
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <TextField
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
      onFocus={onFocus}
      label={label}
      placeholder={placeholder}
      helperText={error || helperText}
      error={Boolean(error)}
      required={required}
      disabled={disabled}
      InputProps={{
        readOnly,
      }}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      sx={sx}
      {...props}
    />
  );
};

/**
 * Password input with visibility toggle
 */
export interface PasswordInputProps extends BaseInputProps {
  /** Whether to show password strength indicator */
  showStrength?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  showStrength = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleToggleVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    if (!password) return { score: 0, label: '', color: 'transparent' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#f44336', '#ff9800', '#ffeb3b', '#8bc34a', '#4caf50'];
    
    return {
      score,
      label: labels[score - 1] || '',
      color: colors[score - 1] || 'transparent',
    };
  };

  const strength = showStrength ? getPasswordStrength(props.value) : null;

  return (
    <Box>
      <Input
        {...props}
        type={showPassword ? 'text' : 'password'}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleToggleVisibility}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      {showStrength && strength && strength.score > 0 && (
        <Box sx={{ mt: 1 }}>
          <Box
            sx={{
              height: 4,
              backgroundColor: 'grey.200',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${(strength.score / 5) * 100}%`,
                backgroundColor: strength.color,
                transition: 'all 0.3s ease',
              }}
            />
          </Box>
          <Box sx={{ mt: 0.5, fontSize: '0.75rem', color: strength.color }}>
            {strength.label}
          </Box>
        </Box>
      )}
    </Box>
  );
};

/**
 * Search input with search icon and clear functionality
 */
export interface SearchInputProps extends BaseInputProps {
  /** Search handler */
  onSearch?: (value: string) => void;
  /** Whether to show clear button */
  showClearButton?: boolean;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  showClearButton = true,
  debounceMs = 300,
  ...props
}) => {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((value: string) => {
    props.onChange(value);

    if (onSearch && debounceMs > 0) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      const timer = setTimeout(() => {
        onSearch(value);
      }, debounceMs);
      
      setDebounceTimer(timer);
    } else if (onSearch) {
      onSearch(value);
    }
  }, [props.onChange, onSearch, debounceMs, debounceTimer]);

  const handleClear = () => {
    handleChange('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && onSearch) {
      onSearch(props.value);
    }
  };

  return (
    <Input
      {...props}
      onChange={handleChange}
      onKeyPress={handleKeyPress}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
        endAdornment: showClearButton && props.value ? (
          <InputAdornment position="end">
            <IconButton
              aria-label="clear search"
              onClick={handleClear}
              edge="end"
              size="small"
            >
              <ClearIcon />
            </IconButton>
          </InputAdornment>
        ) : undefined,
      }}
    />
  );
};

/**
 * Multi-select input with chips
 */
export interface MultiSelectInputProps {
  /** Selected values */
  value: string[];
  /** Change handler */
  onChange: (values: string[]) => void;
  /** Available options */
  options: Array<{ label: string; value: string }>;
  /** Input label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Maximum number of selections */
  maxSelections?: number;
  /** Custom styling */
  sx?: SxProps<Theme>;
}

export const MultiSelectInput: React.FC<MultiSelectInputProps> = ({
  value,
  onChange,
  options,
  label,
  placeholder,
  disabled = false,
  maxSelections,
  sx,
}) => {
  const handleChange = (_: any, newValue: Array<{ label: string; value: string }>) => {
    const values = newValue.map(option => option.value);
    onChange(values);
  };

  const selectedOptions = value.map(val => 
    options.find(option => option.value === val)
  ).filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <Autocomplete
      multiple
      value={selectedOptions}
      onChange={handleChange}
      options={options}
      getOptionLabel={(option) => option.label}
      disabled={disabled}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            variant="outlined"
            label={option.label}
            {...getTagProps({ index })}
            key={option.value}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          variant="outlined"
        />
      )}
      sx={sx}
      limitTags={maxSelections}
    />
  );
};

/**
 * Number input with increment/decrement buttons
 */
export interface NumberInputProps extends Omit<BaseInputProps, 'value' | 'onChange'> {
  /** Number value */
  value: number;
  /** Change handler */
  onChange: (value: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step value */
  step?: number;
  /** Whether to show increment/decrement buttons */
  showControls?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  showControls = false,
  ...props
}) => {
  const handleChange = (stringValue: string) => {
    const numValue = parseFloat(stringValue);
    if (!isNaN(numValue)) {
      let clampedValue = numValue;
      if (min !== undefined) clampedValue = Math.max(min, clampedValue);
      if (max !== undefined) clampedValue = Math.min(max, clampedValue);
      onChange(clampedValue);
    } else if (stringValue === '') {
      onChange(0);
    }
  };

  return (
    <Input
      {...props}
      type="number"
      value={value.toString()}
      onChange={handleChange}
      inputProps={{
        min,
        max,
        step,
      }}
    />
  );
};

export default Input;