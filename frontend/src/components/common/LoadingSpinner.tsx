import React from 'react';
import { CircularProgress, Box, Typography, SxProps, Theme } from '@mui/material';

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: number | string;
  /** Loading message to display */
  message?: string;
  /** Whether to center the spinner */
  centered?: boolean;
  /** Custom styling */
  sx?: SxProps<Theme>;
  /** Color variant */
  color?: 'primary' | 'secondary' | 'inherit';
  /** Whether to show as overlay */
  overlay?: boolean;
}

/**
 * Reusable loading spinner component with optional message
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  message,
  centered = true,
  sx,
  color = 'primary',
  overlay = false,
}) => {
  const containerSx: SxProps<Theme> = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    ...(centered && {
      justifyContent: 'center',
      minHeight: '200px',
    }),
    ...(overlay && {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      zIndex: 1000,
    }),
    ...sx,
  };

  return (
    <Box sx={containerSx}>
      <CircularProgress size={size} color={color} />
      {message && (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;