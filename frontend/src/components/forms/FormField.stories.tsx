import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import FormField from './FormField';

const meta: Meta<typeof FormField> = {
  title: 'Components/Forms/FormField',
  component: FormField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'textarea', 'select', 'checkbox', 'switch', 'radio', 'slider'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium'],
    },
    variant: {
      control: { type: 'select' },
      options: ['outlined', 'filled', 'standard'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component for controlled inputs
const FormFieldWrapper = ({ initialValue = '', ...args }: any) => {
  const [value, setValue] = useState(initialValue);
  return <FormField {...args} value={value} onChange={setValue} />;
};

export const TextInput: Story = {
  render: (args) => <FormFieldWrapper {...args} />,
  args: {
    type: 'text',
    name: 'text',
    label: 'Text Input',
    placeholder: 'Enter text...',
  },
};

export const EmailInput: Story = {
  render: (args) => <FormFieldWrapper {...args} />,
  args: {
    type: 'email',
    name: 'email',
    label: 'Email Address',
    placeholder: 'user@example.com',
  },
};

export const PasswordInput: Story = {
  render: (args) => <FormFieldWrapper {...args} />,
  args: {
    type: 'password',
    name: 'password',
    label: 'Password',
    placeholder: 'Enter password...',
  },
};

export const NumberInput: Story = {
  render: (args) => <FormFieldWrapper initialValue={0} {...args} />,
  args: {
    type: 'number',
    name: 'number',
    label: 'Number',
    min: 0,
    max: 100,
    step: 1,
  },
};

export const TextareaInput: Story = {
  render: (args) => <FormFieldWrapper {...args} />,
  args: {
    type: 'textarea',
    name: 'textarea',
    label: 'Description',
    placeholder: 'Enter description...',
    rows: 4,
  },
};

export const SelectInput: Story = {
  render: (args) => <FormFieldWrapper {...args} />,
  args: {
    type: 'select',
    name: 'select',
    label: 'Choose Option',
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ],
    placeholder: 'Select an option...',
  },
};

export const CheckboxInput: Story = {
  render: (args) => <FormFieldWrapper initialValue={false} {...args} />,
  args: {
    type: 'checkbox',
    name: 'checkbox',
    label: 'Accept Terms',
  },
};

export const SwitchInput: Story = {
  render: (args) => <FormFieldWrapper initialValue={false} {...args} />,
  args: {
    type: 'switch',
    name: 'switch',
    label: 'Enable Notifications',
  },
};

export const RadioInput: Story = {
  render: (args) => <FormFieldWrapper {...args} />,
  args: {
    type: 'radio',
    name: 'radio',
    label: 'Choose Size',
    options: [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' },
    ],
  },
};

export const SliderInput: Story = {
  render: (args) => <FormFieldWrapper initialValue={50} {...args} />,
  args: {
    type: 'slider',
    name: 'slider',
    label: 'Volume',
    min: 0,
    max: 100,
    step: 1,
  },
};

export const WithError: Story = {
  render: (args) => <FormFieldWrapper {...args} />,
  args: {
    type: 'text',
    name: 'text',
    label: 'Text Input',
    error: 'This field is required',
  },
};

export const WithHelperText: Story = {
  render: (args) => <FormFieldWrapper {...args} />,
  args: {
    type: 'text',
    name: 'text',
    label: 'Username',
    helperText: 'Must be at least 3 characters long',
  },
};

export const Required: Story = {
  render: (args) => <FormFieldWrapper {...args} />,
  args: {
    type: 'text',
    name: 'text',
    label: 'Required Field',
    required: true,
  },
};

export const Disabled: Story = {
  render: (args) => <FormFieldWrapper initialValue="Disabled value" {...args} />,
  args: {
    type: 'text',
    name: 'text',
    label: 'Disabled Field',
    disabled: true,
  },
};

export const AllFieldTypes: Story = {
  render: () => {
    const [values, setValues] = useState({
      text: '',
      email: '',
      password: '',
      number: 0,
      textarea: '',
      select: '',
      checkbox: false,
      switch: false,
      radio: '',
      slider: 50,
    });

    const handleChange = (name: string) => (value: any) => {
      setValues(prev => ({ ...prev, [name]: value }));
    };

    return (
      <div style={{ display: 'grid', gap: 16, maxWidth: 400 }}>
        <FormField
          type="text"
          name="text"
          label="Text"
          value={values.text}
          onChange={handleChange('text')}
        />
        <FormField
          type="email"
          name="email"
          label="Email"
          value={values.email}
          onChange={handleChange('email')}
        />
        <FormField
          type="password"
          name="password"
          label="Password"
          value={values.password}
          onChange={handleChange('password')}
        />
        <FormField
          type="number"
          name="number"
          label="Number"
          value={values.number}
          onChange={handleChange('number')}
        />
        <FormField
          type="select"
          name="select"
          label="Select"
          value={values.select}
          onChange={handleChange('select')}
          options={[
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2' },
          ]}
        />
        <FormField
          type="checkbox"
          name="checkbox"
          label="Checkbox"
          value={values.checkbox}
          onChange={handleChange('checkbox')}
        />
        <FormField
          type="switch"
          name="switch"
          label="Switch"
          value={values.switch}
          onChange={handleChange('switch')}
        />
        <FormField
          type="slider"
          name="slider"
          label="Slider"
          value={values.slider}
          onChange={handleChange('slider')}
          min={0}
          max={100}
        />
      </div>
    );
  },
};