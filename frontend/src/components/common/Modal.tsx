import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  SxProps,
  Theme,
  Slide,
  Fade,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ModalTransition = 'fade' | 'slide';

export interface ModalProps {
  /** Whether modal is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Action buttons */
  actions?: React.ReactNode;
  /** Modal size */
  size?: ModalSize;
  /** Whether modal can be closed by clicking backdrop */
  disableBackdropClick?: boolean;
  /** Whether modal can be closed by pressing escape */
  disableEscapeKeyDown?: boolean;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Whether modal is fullscreen */
  fullScreen?: boolean;
  /** Whether modal takes full width */
  fullWidth?: boolean;
  /** Transition animation */
  transition?: ModalTransition;
  /** Custom styling for dialog */
  sx?: SxProps<Theme>;
  /** Custom styling for content */
  contentSx?: SxProps<Theme>;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** ARIA described by for accessibility */
  'aria-describedby'?: string;
}

// Transition components
const SlideTransition = React.forwardRef<unknown, TransitionProps & { children: React.ReactElement }>(
  function SlideTransition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
  }
);

const FadeTransition = React.forwardRef<unknown, TransitionProps & { children: React.ReactElement }>(
  function FadeTransition(props, ref) {
    return <Fade ref={ref} {...props} />;
  }
);

/**
 * Reusable modal component built on Material-UI Dialog
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  size = 'sm',
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  showCloseButton = true,
  fullScreen = false,
  fullWidth = true,
  transition = 'fade',
  sx,
  contentSx,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
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

  const TransitionComponent = transition === 'slide' ? SlideTransition : FadeTransition;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={size}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
      TransitionComponent={TransitionComponent}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: fullScreen ? 0 : 2,
        },
        ...sx,
      }}
    >
      {title && (
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 1,
          }}
        >
          <Typography variant="h6" component="div">
            {title}
          </Typography>
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
      )}
      
      <DialogContent
        sx={{
          px: 3,
          py: title ? 2 : 3,
          ...contentSx,
        }}
      >
        {children}
      </DialogContent>
      
      {actions && (
        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 1,
            gap: 1,
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

/**
 * Confirmation modal component
 */
export interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  severity?: 'info' | 'warning' | 'error';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  severity = 'info',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getConfirmButtonColor = () => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'primary';
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xs"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              background: getConfirmButtonColor() === 'error' ? '#d32f2f' : '#1976d2',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {confirmText}
          </button>
        </Box>
      }
    >
      <Typography variant="body1">{message}</Typography>
    </Modal>
  );
};

export default Modal;