import type { Meta, StoryObj } from '@storybook/react';
import Button, { IconButtonComponent, FloatingButton, PrimaryButton, SecondaryButton, DangerButton } from './Button';
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';

const meta: Meta<typeof Button> = {
  title: 'Components/Common/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['text', 'outlined', 'contained'],
    },
    color: {
      control: { type: 'select' },
      options: ['inherit', 'primary', 'secondary', 'success', 'error', 'info', 'warning'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
    loading: {
      control: { type: 'boolean' },
    },
    fullWidth: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'contained',
    color: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'outlined',
    color: 'primary',
  },
};

export const Danger: Story = {
  args: {
    children: 'Delete',
    variant: 'contained',
    color: 'error',
  },
};

export const WithStartIcon: Story = {
  args: {
    children: 'Add Item',
    startIcon: <AddIcon />,
    variant: 'contained',
  },
};

export const WithEndIcon: Story = {
  args: {
    children: 'Save',
    endIcon: <SaveIcon />,
    variant: 'contained',
  },
};

export const Loading: Story = {
  args: {
    children: 'Save',
    loading: true,
    variant: 'contained',
  },
};

export const LoadingWithText: Story = {
  args: {
    children: 'Save',
    loading: true,
    loadingText: 'Saving...',
    variant: 'contained',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
    variant: 'contained',
  },
};

export const FullWidth: Story = {
  args: {
    children: 'Full Width Button',
    fullWidth: true,
    variant: 'contained',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Button size="small" variant="contained">Small</Button>
      <Button size="medium" variant="contained">Medium</Button>
      <Button size="large" variant="contained">Large</Button>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Button variant="text">Text</Button>
      <Button variant="outlined">Outlined</Button>
      <Button variant="contained">Contained</Button>
    </div>
  ),
};

// Icon Button Stories
const iconButtonMeta: Meta<typeof IconButtonComponent> = {
  title: 'Components/Common/IconButton',
  component: IconButtonComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const IconButton: StoryObj<typeof IconButtonComponent> = {
  args: {
    icon: <AddIcon />,
    'aria-label': 'Add item',
  },
};

export const IconButtonLoading: StoryObj<typeof IconButtonComponent> = {
  args: {
    icon: <AddIcon />,
    loading: true,
    'aria-label': 'Add item',
  },
};

// Floating Button Stories
const fabMeta: Meta<typeof FloatingButton> = {
  title: 'Components/Common/FloatingButton',
  component: FloatingButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const FloatingActionButton: StoryObj<typeof FloatingButton> = {
  args: {
    icon: <AddIcon />,
  },
};

export const ExtendedFAB: StoryObj<typeof FloatingButton> = {
  args: {
    variant: 'extended',
    icon: <AddIcon />,
    children: 'Add Item',
  },
};

// Pre-configured Button Stories
export const PreConfiguredButtons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <PrimaryButton>Primary</PrimaryButton>
      <SecondaryButton>Secondary</SecondaryButton>
      <DangerButton>Danger</DangerButton>
    </div>
  ),
};