import React from 'react';
import {
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  IconButton,
  Typography,
  Box,
  Alert,
  SxProps,
  Theme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

export type DialogType = 'info' | 'warning' | 'error' | 'success' | 'confirm';

export interface DialogAction {
  label: string;
  onClick: () => void;
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  variant?: 'text' | 'outlined' | 'contained';
  disabled?: boolean;
  autoFocus?: boolean;
}

export interface DialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Dialog type affects styling and icon */
  type?: DialogType;
  /** Dialog title */
  title: string;
  /** Dialog message/content */
  message?: string;
  /** Custom content (overrides message) */
  children?: React.ReactNode;
  /** Action buttons */
  actions?: DialogAction[];
  /** Whether to show close button in header */
  showCloseButton?: boolean;
  /** Maximum width */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether dialog takes full width */
  fullWidth?: boolean;
  /** Custom styling */
  sx?: SxProps<Theme>;
  /** Whether to disable backdrop click to close */
  disableBackdropClick?: boolean;
  /** Whether to disable escape key to close */
  disableEscapeKeyDown?: boolean;
}

const getDialogIcon = (type: DialogType) => {
  switch (type) {
    case 'info':
      return <InfoIcon color="info" />;
    case 'warning':
      return <WarningIcon color="warning" />;
    case 'error':
      return <ErrorIcon color="error" />;
    case 'success':
      return <SuccessIcon color="success" />;
    default:
      return null;
  }
};

const getDialogSeverity = (type: DialogType) => {
  switch (type) {
    case 'info':
      return 'info';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'success':
      return 'success';
    default:
      return undefined;
  }
};

/**
 * Reusable dialog component for various use cases
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  type = 'info',
  title,
  message,
  children,
  actions = [],
  showCloseButton = true,
  maxWidth = 'sm',
  fullWidth = true,
  sx,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
}) => {
  const handleClose = (_: any, reason: 'backdropClick' | 'escapeKeyDown') => {
    if (reason === 'backdropClick' && disableBackdropClick) {
      return;
    }
    if (reason === 'escapeKeyDown' && disableEscapeKeyDown) {
      return;
    }
    onClose();
  };

  const icon = getDialogIcon(type);
  const severity = getDialogSeverity(type);

  return (
    <MuiDialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      sx={sx}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        {showCloseButton && (
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: 'grey.500',
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent>
        {children ? (
          children
        ) : message ? (
          severity ? (
            <Alert severity={severity} sx={{ border: 'none', p: 0 }}>
              <DialogContentText>{message}</DialogContentText>
            </Alert>
          ) : (
            <DialogContentText>{message}</DialogContentText>
          )
        ) : null}
      </DialogContent>

      {actions.length > 0 && (
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              color={action.color || 'primary'}
              variant={action.variant || 'text'}
              disabled={action.disabled}
              autoFocus={action.autoFocus}
            >
              {action.label}
            </Button>
          ))}
        </DialogActions>
      )}
    </MuiDialog>
  );
};

/**
 * Pre-configured confirmation dialog
 */
export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const confirmColor = type === 'error' ? 'error' : 'primary';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      type={type}
      title={title}
      message={message}
      maxWidth="xs"
      actions={[
        {
          label: cancelText,
          onClick: onClose,
          variant: 'outlined',
        },
        {
          label: confirmText,
          onClick: handleConfirm,
          color: confirmColor,
          variant: 'contained',
          autoFocus: true,
        },
      ]}
    />
  );
};

/**
 * Pre-configured alert dialog
 */
export interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  buttonText?: string;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  onClose,
  type,
  title,
  message,
  buttonText = 'OK',
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      type={type}
      title={title}
      message={message}
      maxWidth="xs"
      actions={[
        {
          label: buttonText,
          onClick: onClose,
          color: 'primary',
          variant: 'contained',
          autoFocus: true,
        },
      ]}
    />
  );
};

export default Dialog;