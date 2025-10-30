import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Dialog, { ConfirmDialog, AlertDialog } from '../Dialog';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Dialog', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders dialog when open', () => {
    renderWithTheme(
      <Dialog
        open={true}
        onClose={mockOnClose}
        title="Test Dialog"
        message="This is a test message"
      />
    );
    
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('This is a test message')).toBeInTheDocument();
  });

  it('does not render dialog when closed', () => {
    renderWithTheme(
      <Dialog
        open={false}
        onClose={mockOnClose}
        title="Test Dialog"
        message="This is a test message"
      />
    );
    
    expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('This is a test message')).not.toBeInTheDocument();
  });

  it('renders different dialog types with appropriate icons', () => {
    const types = ['info', 'warning', 'error', 'success'] as const;
    
    types.forEach((type) => {
      const { unmount } = renderWithTheme(
        <Dialog
          open={true}
          onClose={mockOnClose}
          type={type}
          title={`${type} Dialog`}
          message="Test message"
        />
      );
      
      expect(screen.getByText(`${type} Dialog`)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders custom children instead of message', () => {
    renderWithTheme(
      <Dialog
        open={true}
        onClose={mockOnClose}
        title="Custom Dialog"
      >
        <div>Custom content</div>
      </Dialog>
    );
    
    expect(screen.getByText('Custom content')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    const actions = [
      { label: 'Cancel', onClick: jest.fn() },
      { label: 'Save', onClick: jest.fn(), color: 'primary' as const },
    ];
    
    renderWithTheme(
      <Dialog
        open={true}
        onClose={mockOnClose}
        title="Dialog with Actions"
        message="Test message"
        actions={actions}
      />
    );
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls action onClick handlers', () => {
    const mockAction = jest.fn();
    const actions = [
      { label: 'Test Action', onClick: mockAction },
    ];
    
    renderWithTheme(
      <Dialog
        open={true}
        onClose={mockOnClose}
        title="Dialog with Actions"
        message="Test message"
        actions={actions}
      />
    );
    
    const actionButton = screen.getByText('Test Action');
    fireEvent.click(actionButton);
    
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    renderWithTheme(
      <Dialog
        open={true}
        onClose={mockOnClose}
        title="Test Dialog"
        message="Test message"
      />
    );
    
    const closeButton = screen.getByRole('button', { name: 'close' });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('hides close button when showCloseButton is false', () => {
    renderWithTheme(
      <Dialog
        open={true}
        onClose={mockOnClose}
        title="Test Dialog"
        message="Test message"
        showCloseButton={false}
      />
    );
    
    expect(screen.queryByRole('button', { name: 'close' })).not.toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnConfirm.mockClear();
  });

  it('renders confirm dialog correctly', () => {
    renderWithTheme(
      <ConfirmDialog
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Confirm Action"
        message="Are you sure you want to proceed?"
      />
    );
    
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm and onClose when confirm button is clicked', () => {
    renderWithTheme(
      <ConfirmDialog
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Confirm Action"
        message="Are you sure?"
      />
    );
    
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls only onClose when cancel button is clicked', () => {
    renderWithTheme(
      <ConfirmDialog
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Confirm Action"
        message="Are you sure?"
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnConfirm).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders custom button text', () => {
    renderWithTheme(
      <ConfirmDialog
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete Item"
        message="This action cannot be undone"
        confirmText="Delete"
        cancelText="Keep"
      />
    );
    
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('applies error styling for error type', () => {
    renderWithTheme(
      <ConfirmDialog
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Delete Item"
        message="This action cannot be undone"
        type="error"
      />
    );
    
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
  });
});

describe('AlertDialog', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders alert dialog correctly', () => {
    renderWithTheme(
      <AlertDialog
        open={true}
        onClose={mockOnClose}
        type="info"
        title="Information"
        message="This is an informational message"
      />
    );
    
    expect(screen.getByText('Information')).toBeInTheDocument();
    expect(screen.getByText('This is an informational message')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('calls onClose when OK button is clicked', () => {
    renderWithTheme(
      <AlertDialog
        open={true}
        onClose={mockOnClose}
        type="success"
        title="Success"
        message="Operation completed successfully"
      />
    );
    
    const okButton = screen.getByText('OK');
    fireEvent.click(okButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders custom button text', () => {
    renderWithTheme(
      <AlertDialog
        open={true}
        onClose={mockOnClose}
        type="warning"
        title="Warning"
        message="Please be careful"
        buttonText="Got it"
      />
    );
    
    expect(screen.getByText('Got it')).toBeInTheDocument();
  });

  it('renders different alert types', () => {
    const types = ['info', 'warning', 'error', 'success'] as const;
    
    types.forEach((type) => {
      const { unmount } = renderWithTheme(
        <AlertDialog
          open={true}
          onClose={mockOnClose}
          type={type}
          title={`${type} Alert`}
          message="Test message"
        />
      );
      
      expect(screen.getByText(`${type} Alert`)).toBeInTheDocument();
      unmount();
    });
  });
});