import React from 'react';
import {
  Button as MuiButton,
  IconButton,
  Fab,
  LoadingButton,
  ButtonProps as MuiButtonProps,
  IconButtonProps,
  FabProps,
  SxProps,
  Theme,
} from '@mui/material';
import { CircularProgress } from '@mui/material';

export type ButtonVariant = 'text' | 'outlined' | 'contained';
export type ButtonColor = 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface BaseButtonProps {
  /** Button content */
  children?: React.ReactNode;
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether button is in loading state */
  loading?: boolean;
  /** Button size */
  size?: ButtonSize;
  /** Custom styling */
  sx?: SxProps<Theme>;
  /** Additional props */
  [key: string]: any;
}

export interface ButtonProps extends BaseButtonProps {
  /** Button variant */
  variant?: ButtonVariant;
  /** Button color */
  color?: ButtonColor;
  /** Start icon */
  startIcon?: React.ReactNode;
  /** End icon */
  endIcon?: React.ReactNode;
  /** Whether button takes full width */
  fullWidth?: boolean;
  /** Button type for forms */
  type?: 'button' | 'submit' | 'reset';
  /** Loading text to show when loading */
  loadingText?: string;
}

/**
 * Enhanced button component with loading state and consistent styling
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  startIcon,
  endIcon,
  fullWidth = false,
  type = 'button',
  loadingText,
  sx,
  ...props
}) => {
  const isDisabled = disabled || loading;
  const displayText = loading && loadingText ? loadingText : children;
  const displayStartIcon = loading ? <CircularProgress size={16} /> : startIcon;

  return (
    <MuiButton
      variant={variant}
      color={color}
      size={size}
      disabled={isDisabled}
      onClick={onClick}
      startIcon={displayStartIcon}
      endIcon={!loading ? endIcon : undefined}
      fullWidth={fullWidth}
      type={type}
      sx={sx}
      {...props}
    >
      {displayText}
    </MuiButton>
  );
};

/**
 * Icon button component
 */
export interface IconButtonComponentProps extends BaseButtonProps {
  /** Icon to display */
  icon: React.ReactNode;
  /** Button color */
  color?: ButtonColor;
  /** Tooltip text */
  title?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
}

export const IconButtonComponent: React.FC<IconButtonComponentProps> = ({
  icon,
  onClick,
  disabled = false,
  loading = false,
  color = 'default',
  size = 'medium',
  title,
  sx,
  'aria-label': ariaLabel,
  ...props
}) => {
  const isDisabled = disabled || loading;
  const displayIcon = loading ? <CircularProgress size={20} /> : icon;

  return (
    <IconButton
      onClick={onClick}
      disabled={isDisabled}
      color={color}
      size={size}
      title={title}
      aria-label={ariaLabel}
      sx={sx}
      {...props}
    >
      {displayIcon}
    </IconButton>
  );
};

/**
 * Floating action button component
 */
export interface FloatingButtonProps extends BaseButtonProps {
  /** FAB variant */
  variant?: 'circular' | 'extended';
  /** Button color */
  color?: ButtonColor;
  /** Icon to display */
  icon?: React.ReactNode;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'circular',
  color = 'primary',
  size = 'large',
  icon,
  sx,
  ...props
}) => {
  const isDisabled = disabled || loading;
  const displayIcon = loading ? <CircularProgress size={24} color="inherit" /> : icon;

  return (
    <Fab
      variant={variant}
      color={color}
      size={size}
      disabled={isDisabled}
      onClick={onClick}
      sx={sx}
      {...props}
    >
      {variant === 'extended' ? (
        <>
          {displayIcon}
          {children}
        </>
      ) : (
        displayIcon || children
      )}
    </Fab>
  );
};

/**
 * Button group for related actions
 */
export interface ButtonGroupProps {
  /** Button configurations */
  buttons: Array<ButtonProps & { key: string }>;
  /** Group orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Spacing between buttons */
  spacing?: number;
  /** Custom styling */
  sx?: SxProps<Theme>;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  buttons,
  orientation = 'horizontal',
  spacing = 1,
  sx,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        gap: `${spacing * 8}px`,
        ...sx,
      }}
    >
      {buttons.map(({ key, ...buttonProps }) => (
        <Button key={key} {...buttonProps} />
      ))}
    </div>
  );
};

/**
 * Pre-configured button variants for common use cases
 */
export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant' | 'color'>> = (props) => (
  <Button variant="contained" color="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant' | 'color'>> = (props) => (
  <Button variant="outlined" color="primary" {...props} />
);

export const DangerButton: React.FC<Omit<ButtonProps, 'variant' | 'color'>> = (props) => (
  <Button variant="contained" color="error" {...props} />
);

export const SuccessButton: React.FC<Omit<ButtonProps, 'variant' | 'color'>> = (props) => (
  <Button variant="contained" color="success" {...props} />
);

export const TextButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="text" {...props} />
);

export default Button;