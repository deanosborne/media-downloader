import React from 'react';
import {
  TextField,
  FormControl,
  FormLabel,
  FormHelperText,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Checkbox,
  Radio,
  RadioGroup,
  Slider,
  Box,
  Typography,
  SxProps,
  Theme,
} from '@mui/material';

export type FormFieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'textarea' 
  | 'select' 
  | 'checkbox' 
  | 'switch' 
  | 'radio' 
  | 'slider';

export interface FormFieldOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FormFieldProps {
  /** Field type */
  type: FormFieldType;
  /** Field name/id */
  name: string;
  /** Field label */
  label: string;
  /** Field value */
  value: any;
  /** Change handler */
  onChange: (value: any) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Options for select/radio fields */
  options?: FormFieldOption[];
  /** Min/max values for number/slider fields */
  min?: number;
  max?: number;
  /** Step value for number/slider fields */
  step?: number;
  /** Number of rows for textarea */
  rows?: number;
  /** Custom styling */
  sx?: SxProps<Theme>;
  /** Full width */
  fullWidth?: boolean;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Additional props to pass to underlying component */
  inputProps?: Record<string, any>;
}

/**
 * Unified form field component that handles different input types
 */
export const FormField: React.FC<FormFieldProps> = ({
  type,
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required = false,
  disabled = false,
  placeholder,
  options = [],
  min,
  max,
  step,
  rows = 4,
  sx,
  fullWidth = true,
  size = 'medium',
  inputProps,
}) => {
  const hasError = Boolean(error);
  const displayHelperText = error || helperText;

  const handleChange = (event: any) => {
    const { value: eventValue, checked } = event.target;
    
    switch (type) {
      case 'checkbox':
      case 'switch':
        onChange(checked);
        break;
      case 'number':
      case 'slider':
        onChange(Number(eventValue));
        break;
      default:
        onChange(eventValue);
    }
  };

  const renderField = () => {
    switch (type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
        return (
          <TextField
            name={name}
            label={label}
            type={type}
            value={value || ''}
            onChange={handleChange}
            onBlur={onBlur}
            error={hasError}
            helperText={displayHelperText}
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            fullWidth={fullWidth}
            size={size}
            inputProps={{
              min,
              max,
              step,
              ...inputProps,
            }}
            sx={sx}
          />
        );

      case 'textarea':
        return (
          <TextField
            name={name}
            label={label}
            value={value || ''}
            onChange={handleChange}
            onBlur={onBlur}
            error={hasError}
            helperText={displayHelperText}
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            fullWidth={fullWidth}
            size={size}
            multiline
            rows={rows}
            inputProps={inputProps}
            sx={sx}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth={fullWidth} error={hasError} size={size} sx={sx}>
            <FormLabel required={required}>{label}</FormLabel>
            <Select
              name={name}
              value={value || ''}
              onChange={handleChange}
              onBlur={onBlur}
              disabled={disabled}
              displayEmpty
            >
              {placeholder && (
                <MenuItem value="" disabled>
                  {placeholder}
                </MenuItem>
              )}
              {options.map((option) => (
                <MenuItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {displayHelperText && (
              <FormHelperText>{displayHelperText}</FormHelperText>
            )}
          </FormControl>
        );

      case 'checkbox':
        return (
          <FormControl error={hasError} sx={sx}>
            <FormControlLabel
              control={
                <Checkbox
                  name={name}
                  checked={Boolean(value)}
                  onChange={handleChange}
                  onBlur={onBlur}
                  disabled={disabled}
                  size={size}
                  inputProps={inputProps}
                />
              }
              label={label}
              required={required}
            />
            {displayHelperText && (
              <FormHelperText>{displayHelperText}</FormHelperText>
            )}
          </FormControl>
        );

      case 'switch':
        return (
          <FormControl error={hasError} sx={sx}>
            <FormControlLabel
              control={
                <Switch
                  name={name}
                  checked={Boolean(value)}
                  onChange={handleChange}
                  onBlur={onBlur}
                  disabled={disabled}
                  size={size}
                  inputProps={inputProps}
                />
              }
              label={label}
              required={required}
            />
            {displayHelperText && (
              <FormHelperText>{displayHelperText}</FormHelperText>
            )}
          </FormControl>
        );

      case 'radio':
        return (
          <FormControl error={hasError} sx={sx}>
            <FormLabel required={required}>{label}</FormLabel>
            <RadioGroup
              name={name}
              value={value || ''}
              onChange={handleChange}
              onBlur={onBlur}
            >
              {options.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio size={size} />}
                  label={option.label}
                  disabled={disabled || option.disabled}
                />
              ))}
            </RadioGroup>
            {displayHelperText && (
              <FormHelperText>{displayHelperText}</FormHelperText>
            )}
          </FormControl>
        );

      case 'slider':
        return (
          <FormControl fullWidth={fullWidth} error={hasError} sx={sx}>
            <Box sx={{ px: 1 }}>
              <Typography variant="body2" gutterBottom>
                {label} {required && '*'}
              </Typography>
              <Slider
                name={name}
                value={value || min || 0}
                onChange={(_, newValue) => onChange(newValue)}
                onBlur={onBlur}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                valueLabelDisplay="auto"
                size={size}
                {...inputProps}
              />
              {displayHelperText && (
                <FormHelperText>{displayHelperText}</FormHelperText>
              )}
            </Box>
          </FormControl>
        );

      default:
        return null;
    }
  };

  return renderField();
};

export default FormField;