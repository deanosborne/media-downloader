import type { Meta, StoryObj } from '@storybook/react';
import LoadingSpinner from './LoadingSpinner';

const meta: Meta<typeof LoadingSpinner> = {
  title: 'Components/Common/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'number', min: 20, max: 100, step: 10 },
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'inherit'],
    },
    centered: {
      control: { type: 'boolean' },
    },
    overlay: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithMessage: Story = {
  args: {
    message: 'Loading data...',
  },
};

export const Large: Story = {
  args: {
    size: 60,
    message: 'Processing...',
  },
};

export const Small: Story = {
  args: {
    size: 24,
    message: 'Loading...',
  },
};

export const Secondary: Story = {
  args: {
    color: 'secondary',
    message: 'Please wait...',
  },
};

export const NotCentered: Story = {
  args: {
    centered: false,
    message: 'Loading content...',
  },
};

export const Overlay: Story = {
  args: {
    overlay: true,
    message: 'Saving changes...',
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: 400, height: 300, backgroundColor: '#f5f5f5', padding: 20 }}>
        <div>Background content that should be covered by overlay</div>
        <Story />
      </div>
    ),
  ],
};