import React from 'react';
import { Alert, AlertTitle, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Error as ErrorIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

export interface ValidationRule {
  /** Rule name/key */
  key: string;
  /** Rule description */
  message: string;
  /** Validation function */
  validate: (value: any, formData?: Record<string, any>) => boolean;
  /** Whether this rule is required for form submission */
  required?: boolean;
}

export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Field-specific errors */
  fieldErrors: Record<string, string[]>;
}

export interface FormValidationProps {
  /** Validation rules */
  rules: ValidationRule[];
  /** Form data to validate */
  data: Record<string, any>;
  /** Whether to show validation results */
  showValidation?: boolean;
  /** Whether to show only errors or all rules */
  showOnlyErrors?: boolean;
  /** Custom title for validation section */
  title?: string;
  /** Severity level */
  severity?: 'error' | 'warning' | 'info' | 'success';
}

/**
 * Form validation component that displays validation rules and results
 */
export const FormValidation: React.FC<FormValidationProps> = ({
  rules,
  data,
  showValidation = true,
  showOnlyErrors = false,
  title = 'Validation',
  severity = 'error',
}) => {
  if (!showValidation || rules.length === 0) {
    return null;
  }

  const validationResults = rules.map((rule) => ({
    ...rule,
    isValid: rule.validate(data[rule.key], data),
  }));

  const errors = validationResults.filter((result) => !result.isValid);
  const hasErrors = errors.length > 0;

  // Don't show anything if there are no errors and we're only showing errors
  if (showOnlyErrors && !hasErrors) {
    return null;
  }

  const displaySeverity = hasErrors ? 'error' : severity;

  return (
    <Alert severity={displaySeverity} sx={{ mt: 2 }}>
      <AlertTitle>{title}</AlertTitle>
      <List dense>
        {validationResults.map((result) => {
          // Skip valid rules if only showing errors
          if (showOnlyErrors && result.isValid) {
            return null;
          }

          return (
            <ListItem key={result.key} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {result.isValid ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : (
                  <ErrorIcon color="error" fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={result.message}
                primaryTypographyProps={{
                  variant: 'body2',
                  color: result.isValid ? 'text.secondary' : 'error.main',
                }}
              />
            </ListItem>
          );
        })}
      </List>
    </Alert>
  );
};

/**
 * Hook for form validation logic
 */
export const useFormValidation = (rules: ValidationRule[]) => {
  const validateForm = (data: Record<string, any>): ValidationResult => {
    const errors: string[] = [];
    const fieldErrors: Record<string, string[]> = {};

    rules.forEach((rule) => {
      const isValid = rule.validate(data[rule.key], data);
      
      if (!isValid) {
        errors.push(rule.message);
        
        if (!fieldErrors[rule.key]) {
          fieldErrors[rule.key] = [];
        }
        fieldErrors[rule.key].push(rule.message);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors,
    };
  };

  const validateField = (fieldName: string, value: any, formData?: Record<string, any>): string[] => {
    const fieldRules = rules.filter((rule) => rule.key === fieldName);
    const fieldErrors: string[] = [];

    fieldRules.forEach((rule) => {
      const isValid = rule.validate(value, formData);
      if (!isValid) {
        fieldErrors.push(rule.message);
      }
    });

    return fieldErrors;
  };

  return {
    validateForm,
    validateField,
  };
};

// Common validation rules
export const commonValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    key: 'required',
    message,
    validate: (value) => {
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return value !== null && value !== undefined && value !== '';
    },
    required: true,
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    key: 'email',
    message,
    validate: (value) => {
      if (!value) return true; // Allow empty if not required
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    key: 'minLength',
    message: message || `Must be at least ${min} characters long`,
    validate: (value) => {
      if (!value) return true; // Allow empty if not required
      return String(value).length >= min;
    },
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    key: 'maxLength',
    message: message || `Must be no more than ${max} characters long`,
    validate: (value) => {
      if (!value) return true; // Allow empty if not required
      return String(value).length <= max;
    },
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    key: 'url',
    message,
    validate: (value) => {
      if (!value) return true; // Allow empty if not required
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
  }),

  number: (message = 'Please enter a valid number'): ValidationRule => ({
    key: 'number',
    message,
    validate: (value) => {
      if (!value) return true; // Allow empty if not required
      return !isNaN(Number(value));
    },
  }),

  min: (min: number, message?: string): ValidationRule => ({
    key: 'min',
    message: message || `Must be at least ${min}`,
    validate: (value) => {
      if (!value) return true; // Allow empty if not required
      return Number(value) >= min;
    },
  }),

  max: (max: number, message?: string): ValidationRule => ({
    key: 'max',
    message: message || `Must be no more than ${max}`,
    validate: (value) => {
      if (!value) return true; // Allow empty if not required
      return Number(value) <= max;
    },
  }),
};

export default FormValidation;