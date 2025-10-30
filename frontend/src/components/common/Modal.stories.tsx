import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import Modal, { ConfirmationModal } from './Modal';
import { Button, Typography } from '@mui/material';

const meta: Meta<typeof Modal> = {
  title: 'Components/Common/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    transition: {
      control: { type: 'select' },
      options: ['fade', 'slide'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component for interactive modals
const ModalWrapper = ({ children, ...args }: any) => {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Open Modal
      </Button>
      <Modal {...args} open={open} onClose={() => setOpen(false)}>
        {children}
      </Modal>
    </>
  );
};

export const Default: Story = {
  render: (args) => (
    <ModalWrapper {...args}>
      <Typography>This is the modal content.</Typography>
    </ModalWrapper>
  ),
  args: {
    title: 'Default Modal',
  },
};

export const WithoutTitle: Story = {
  render: (args) => (
    <ModalWrapper {...args}>
      <Typography variant="h6" gutterBottom>
        Modal without title
      </Typography>
      <Typography>
        This modal doesn't have a title in the header.
      </Typography>
    </ModalWrapper>
  ),
  args: {},
};

export const WithActions: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    
    return (
      <>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Open Modal with Actions
        </Button>
        <Modal
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          actions={
            <>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={() => setOpen(false)}>
                Save
              </Button>
            </>
          }
        >
          <Typography>
            This modal has action buttons in the footer.
          </Typography>
        </Modal>
      </>
    );
  },
  args: {
    title: 'Modal with Actions',
  },
};

export const LargeModal: Story = {
  render: (args) => (
    <ModalWrapper {...args}>
      <Typography variant="h6" gutterBottom>
        Large Modal Content
      </Typography>
      <Typography paragraph>
        This is a large modal with more content. Lorem ipsum dolor sit amet, 
        consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore 
        et dolore magna aliqua.
      </Typography>
      <Typography paragraph>
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi 
        ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit 
        in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
      </Typography>
    </ModalWrapper>
  ),
  args: {
    title: 'Large Modal',
    size: 'lg',
  },
};

export const FullScreen: Story = {
  render: (args) => (
    <ModalWrapper {...args}>
      <Typography variant="h4" gutterBottom>
        Full Screen Modal
      </Typography>
      <Typography paragraph>
        This modal takes up the entire screen. It's useful for complex forms 
        or detailed content that needs more space.
      </Typography>
      <Typography paragraph>
        You can add any content here, including forms, tables, or other components.
      </Typography>
    </ModalWrapper>
  ),
  args: {
    title: 'Full Screen Modal',
    fullScreen: true,
  },
};

export const SlideTransition: Story = {
  render: (args) => (
    <ModalWrapper {...args}>
      <Typography>This modal slides up from the bottom.</Typography>
    </ModalWrapper>
  ),
  args: {
    title: 'Slide Transition',
    transition: 'slide',
  },
};

export const NoCloseButton: Story = {
  render: (args) => (
    <ModalWrapper {...args}>
      <Typography>
        This modal doesn't have a close button in the header. 
        You can only close it by clicking outside or pressing Escape.
      </Typography>
    </ModalWrapper>
  ),
  args: {
    title: 'No Close Button',
    showCloseButton: false,
  },
};

// Confirmation Modal Stories
const confirmationMeta: Meta<typeof ConfirmationModal> = {
  title: 'Components/Common/ConfirmationModal',
  component: ConfirmationModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const ConfirmationDefault: StoryObj<typeof ConfirmationModal> = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<string>('');
    
    const handleConfirm = () => {
      setResult('Confirmed!');
    };
    
    const handleClose = () => {
      setOpen(false);
      if (!result) {
        setResult('Cancelled');
      }
    };
    
    return (
      <>
        <Button variant="contained" onClick={() => { setOpen(true); setResult(''); }}>
          Open Confirmation
        </Button>
        {result && (
          <Typography sx={{ mt: 2 }}>
            Result: {result}
          </Typography>
        )}
        <ConfirmationModal
          {...args}
          open={open}
          onClose={handleClose}
          onConfirm={handleConfirm}
        />
      </>
    );
  },
  args: {
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed with this action?',
  },
};

export const DeleteConfirmation: StoryObj<typeof ConfirmationModal> = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<string>('');
    
    const handleConfirm = () => {
      setResult('Item deleted!');
    };
    
    const handleClose = () => {
      setOpen(false);
      if (!result) {
        setResult('Delete cancelled');
      }
    };
    
    return (
      <>
        <Button variant="contained" color="error" onClick={() => { setOpen(true); setResult(''); }}>
          Delete Item
        </Button>
        {result && (
          <Typography sx={{ mt: 2 }}>
            Result: {result}
          </Typography>
        )}
        <ConfirmationModal
          {...args}
          open={open}
          onClose={handleClose}
          onConfirm={handleConfirm}
        />
      </>
    );
  },
  args: {
    title: 'Delete Item',
    message: 'This action cannot be undone. Are you sure you want to delete this item?',
    confirmText: 'Delete',
    cancelText: 'Keep',
    severity: 'error',
  },
};