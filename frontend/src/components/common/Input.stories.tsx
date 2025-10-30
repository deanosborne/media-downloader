import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import Input, { PasswordInput, SearchInput, MultiSelectInput, NumberInput } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Common/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['outlined', 'filled', 'standard'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component for controlled inputs
const InputWrapper = ({ initialValue = '', ...args }: any) => {
  const [value, setValue] = useState(initialValue);
  return <Input {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {
  render: (args) => <InputWrapper {...args} />,
  args: {
    label: 'Default Input',
    placeholder: 'Enter text...',
  },
};

export const WithHelperText: Story = {
  render: (args) => <InputWrapper {...args} />,
  args: {
    label: 'Username',
    placeholder: 'Enter username...',
    helperText: 'Must be at least 3 characters long',
  },
};

export const WithError: Story = {
  render: (args) => <InputWrapper {...args} />,
  args: {
    label: 'Email',
    placeholder: 'Enter email...',
    error: 'Please enter a valid email address',
  },
};

export const Required: Story = {
  render: (args) => <InputWrapper {...args} />,
  args: {
    label: 'Required Field',
    placeholder: 'This field is required',
    required: true,
  },
};

export const Disabled: Story = {
  render: (args) => <InputWrapper initialValue="Disabled value" {...args} />,
  args: {
    label: 'Disabled Input',
    disabled: true,
  },
};

export const ReadOnly: Story = {
  render: (args) => <InputWrapper initialValue="Read-only value" {...args} />,
  args: {
    label: 'Read Only Input',
    readOnly: true,
  },
};

export const Variants: Story = {
  render: () => {
    const [values, setValues] = useState({ outlined: '', filled: '', standard: '' });
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 300 }}>
        <Input
          variant="outlined"
          label="Outlined"
          value={values.outlined}
          onChange={(value) => setValues(prev => ({ ...prev, outlined: value }))}
        />
        <Input
          variant="filled"
          label="Filled"
          value={values.filled}
          onChange={(value) => setValues(prev => ({ ...prev, filled: value }))}
        />
        <Input
          variant="standard"
          label="Standard"
          value={values.standard}
          onChange={(value) => setValues(prev => ({ ...prev, standard: value }))}
        />
      </div>
    );
  },
};

export const Sizes: Story = {
  render: () => {
    const [values, setValues] = useState({ small: '', medium: '' });
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 300 }}>
        <Input
          size="small"
          label="Small Input"
          value={values.small}
          onChange={(value) => setValues(prev => ({ ...prev, small: value }))}
        />
        <Input
          size="medium"
          label="Medium Input"
          value={values.medium}
          onChange={(value) => setValues(prev => ({ ...prev, medium: value }))}
        />
      </div>
    );
  },
};

// Password Input Stories
const passwordMeta: Meta<typeof PasswordInput> = {
  title: 'Components/Common/PasswordInput',
  component: PasswordInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const PasswordDefault: StoryObj<typeof PasswordInput> = {
  render: (args) => {
    const [value, setValue] = useState('');
    return <PasswordInput {...args} value={value} onChange={setValue} />;
  },
  args: {
    label: 'Password',
    placeholder: 'Enter password...',
  },
};

export const PasswordWithStrength: StoryObj<typeof PasswordInput> = {
  render: (args) => {
    const [value, setValue] = useState('');
    return <PasswordInput {...args} value={value} onChange={setValue} />;
  },
  args: {
    label: 'Password',
    placeholder: 'Enter password...',
    showStrength: true,
  },
};

// Search Input Stories
const searchMeta: Meta<typeof SearchInput> = {
  title: 'Components/Common/SearchInput',
  component: SearchInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const SearchDefault: StoryObj<typeof SearchInput> = {
  render: (args) => {
    const [value, setValue] = useState('');
    const [searchResult, setSearchResult] = useState('');
    
    const handleSearch = (searchValue: string) => {
      setSearchResult(`Searched for: "${searchValue}"`);
    };
    
    return (
      <div style={{ width: 300 }}>
        <SearchInput {...args} value={value} onChange={setValue} onSearch={handleSearch} />
        {searchResult && (
          <div style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
            {searchResult}
          </div>
        )}
      </div>
    );
  },
  args: {
    label: 'Search',
    placeholder: 'Search for items...',
  },
};

export const SearchWithoutClear: StoryObj<typeof SearchInput> = {
  render: (args) => {
    const [value, setValue] = useState('');
    return <SearchInput {...args} value={value} onChange={setValue} />;
  },
  args: {
    label: 'Search',
    placeholder: 'Search for items...',
    showClearButton: false,
  },
};

// Multi Select Input Stories
const multiSelectMeta: Meta<typeof MultiSelectInput> = {
  title: 'Components/Common/MultiSelectInput',
  component: MultiSelectInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const MultiSelectDefault: StoryObj<typeof MultiSelectInput> = {
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div style={{ width: 300 }}>
        <MultiSelectInput {...args} value={value} onChange={setValue} />
      </div>
    );
  },
  args: {
    label: 'Select Multiple',
    placeholder: 'Choose options...',
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
      { value: 'option4', label: 'Option 4' },
      { value: 'option5', label: 'Option 5' },
    ],
  },
};

export const MultiSelectWithLimit: StoryObj<typeof MultiSelectInput> = {
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div style={{ width: 300 }}>
        <MultiSelectInput {...args} value={value} onChange={setValue} />
      </div>
    );
  },
  args: {
    label: 'Select up to 3',
    placeholder: 'Choose up to 3 options...',
    maxSelections: 3,
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
      { value: 'option4', label: 'Option 4' },
      { value: 'option5', label: 'Option 5' },
    ],
  },
};

// Number Input Stories
const numberMeta: Meta<typeof NumberInput> = {
  title: 'Components/Common/NumberInput',
  component: NumberInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const NumberDefault: StoryObj<typeof NumberInput> = {
  render: (args) => {
    const [value, setValue] = useState(0);
    return <NumberInput {...args} value={value} onChange={setValue} />;
  },
  args: {
    label: 'Number',
  },
};

export const NumberWithRange: StoryObj<typeof NumberInput> = {
  render: (args) => {
    const [value, setValue] = useState(50);
    return <NumberInput {...args} value={value} onChange={setValue} />;
  },
  args: {
    label: 'Number (0-100)',
    min: 0,
    max: 100,
    step: 5,
  },
};

export const AllInputTypes: Story = {
  render: () => {
    const [values, setValues] = useState({
      text: '',
      password: '',
      search: '',
      multiSelect: [] as string[],
      number: 0,
    });
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 400 }}>
        <Input
          label="Text Input"
          value={values.text}
          onChange={(value) => setValues(prev => ({ ...prev, text: value }))}
        />
        <PasswordInput
          label="Password Input"
          value={values.password}
          onChange={(value) => setValues(prev => ({ ...prev, password: value }))}
          showStrength
        />
        <SearchInput
          label="Search Input"
          value={values.search}
          onChange={(value) => setValues(prev => ({ ...prev, search: value }))}
          onSearch={(value) => console.log('Search:', value)}
        />
        <MultiSelectInput
          label="Multi Select"
          value={values.multiSelect}
          onChange={(value) => setValues(prev => ({ ...prev, multiSelect: value }))}
          options={[
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2' },
            { value: 'option3', label: 'Option 3' },
          ]}
        />
        <NumberInput
          label="Number Input"
          value={values.number}
          onChange={(value) => setValues(prev => ({ ...prev, number: value }))}
          min={0}
          max={100}
        />
      </div>
    );
  },
};