import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Modal, { ConfirmationModal } from '../Modal';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Modal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders modal when open', () => {
    renderWithTheme(
      <Modal open={true} onClose={mockOnClose} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render modal when closed', () => {
    renderWithTheme(
      <Modal open={false} onClose={mockOnClose} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('renders modal without title', () => {
    renderWithTheme(
      <Modal open={true} onClose={mockOnClose}>
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.getByText('Modal content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'close' })).not.toBeInTheDocument();
  });

  it('renders close button when showCloseButton is true', () => {
    renderWithTheme(
      <Modal open={true} onClose={mockOnClose} title="Test Modal" showCloseButton={true}>
        <div>Modal content</div>
      </Modal>
    );
    
    const closeButton = screen.getByRole('button', { name: 'close' });
    expect(closeButton).toBeInTheDocument();
  });

  it('hides close button when showCloseButton is false', () => {
    renderWithTheme(
      <Modal open={true} onClose={mockOnClose} title="Test Modal" showCloseButton={false}>
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.queryByRole('button', { name: 'close' })).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    renderWithTheme(
      <Modal open={true} onClose={mockOnClose} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    );
    
    const closeButton = screen.getByRole('button', { name: 'close' });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders action buttons', () => {
    const actions = (
      <div>
        <button>Cancel</button>
        <button>Save</button>
      </div>
    );
    
    renderWithTheme(
      <Modal open={true} onClose={mockOnClose} title="Test Modal" actions={actions}>
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('applies different sizes', () => {
    renderWithTheme(
      <Modal open={true} onClose={mockOnClose} title="Test Modal" size="lg">
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('handles fullScreen prop', () => {
    renderWithTheme(
      <Modal open={true} onClose={mockOnClose} title="Test Modal" fullScreen={true}>
        <div>Modal content</div>
      </Modal>
    );
    
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });
});

describe('ConfirmationModal', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnConfirm.mockClear();
  });

  it('renders confirmation modal correctly', () => {
    renderWithTheme(
      <ConfirmationModal
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Confirm Delete"
        message="Are you sure you want to delete this item?"
      />
    );
    
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm and onClose when confirm button is clicked', () => {
    renderWithTheme(
      <ConfirmationModal
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
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
      <ConfirmationModal
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
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
      <ConfirmationModal
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        message="Are you sure?"
        confirmText="Delete"
        cancelText="Keep"
      />
    );
    
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('applies different severity styles', () => {
    renderWithTheme(
      <ConfirmationModal
        open={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        message="Are you sure?"
        severity="error"
      />
    );
    
    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toBeInTheDocument();
  });
});