import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronDown } from 'lucide-react';
import { Button } from '../../src/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../../src/components/ui/dropdown-menu.tsx';
import { Label } from '../../src/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../src/components/ui/select.tsx';

const ActionMenuPreview = () => {
  const [selected, setSelected] = useState('Most recent');

  return (
    <div className="min-h-60">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline">
              Sort: {selected}
              <ChevronDown data-icon="inline-end" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="min-w-46">
          <DropdownMenuRadioGroup value={selected} onValueChange={setSelected}>
            {['Most recent', 'Name', 'Activity'].map((label) => (
              <DropdownMenuRadioItem key={label} value={label}>
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const CLASS_OPTIONS = {
  'physics-101': 'Physics 101',
  'chemistry-201': 'Chemistry 201',
  'biology-110': 'Biology 110',
};

const OptionSelectorPreview = () => {
  const [selectedClass, setSelectedClass] = useState('physics-101');

  return (
    <div className="flex min-h-72 max-w-70 flex-col gap-2">
      <Label htmlFor="popup-class-selector">Class</Label>
      <Select
        value={selectedClass}
        onValueChange={(value) => setSelectedClass(value ?? 'physics-101')}
        items={CLASS_OPTIONS}
      >
        <SelectTrigger id="popup-class-selector" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CLASS_OPTIONS).map(([id, label]) => (
            <SelectItem key={id} value={id}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Trigger and options share the same primary popup text role.
      </p>
    </div>
  );
};

const meta = {
  title: 'Patterns/Small Popups/Examples',
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="min-h-70 rounded-none bg-background p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActionMenu: Story = {
  name: 'Action menu',
  render: () => <ActionMenuPreview />,
};

export const OptionSelector: Story = {
  name: 'Option selector',
  render: () => <OptionSelectorPreview />,
};
