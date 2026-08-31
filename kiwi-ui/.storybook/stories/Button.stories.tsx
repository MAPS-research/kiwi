import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoaderCircle, RefreshCw, Save, Trash2 } from 'lucide-react';
import { expect, within } from 'storybook/test';
import { Button } from '../../src/components/ui/button.tsx';
import designSystem from '../design-system/catalog.json' with { type: 'json' };

const buttonContract = designSystem.components.button;

const componentDescription = `
> **Scope: Kiwi Design System.** This is a Kiwi component contract, not a rule for authoring Storybook.

## Purpose

${buttonContract.purpose}

## Use when

${buttonContract.useWhen.map((item) => `- ${item}`).join('\n')}

## Avoid when

${buttonContract.avoidWhen.map((item) => `- ${item}`).join('\n')}

## Variant selection

${Object.entries(buttonContract.variants)
  .map(([name, guidance]) => `- **${name}:** ${guidance}`)
  .join('\n')}

## Size selection

${Object.entries(buttonContract.sizes)
  .map(([name, guidance]) => `- **${name}:** ${guidance}`)
  .join('\n')}

## Icon slots

${buttonContract.iconSlots}

## Accessibility contract

${buttonContract.accessibility.map((item) => `- ${item}`).join('\n')}
`;

const meta = {
  title: 'Components/Actions/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: componentDescription,
      },
    },
  },
  args: {
    children: 'Continue',
    variant: 'default',
    size: 'default',
    disabled: false,
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'Use a concise, action-first label that describes the result.',
      table: { category: 'Content' },
    },
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'],
      description: 'Select from action hierarchy, not visual preference.',
      table: { category: 'Hierarchy' },
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'default', 'lg', 'icon-xs', 'icon-sm', 'icon', 'icon-lg'],
      description: 'Use default by default; change size only for a clear density or prominence need.',
      table: { category: 'Layout' },
    },
    disabled: {
      control: 'boolean',
      description: 'Use native disabled semantics when the action cannot run.',
      table: { category: 'State' },
    },
    className: { control: false, table: { disable: true } },
    render: { control: false, table: { disable: true } },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Explore the supported public choices. Start with the hierarchy guidance above before changing controls.',
      },
    },
  },
};

export const ActionHierarchy: Story = {
  name: 'Action hierarchy',
  parameters: {
    docs: {
      description: {
        story:
          'Use one default (filled) action as the primary choice, outline for secondary actions, and ghost for low-emphasis or reversible actions.',
      },
    },
  },
  render: () => (
    <div className="flex max-w-2xl flex-col gap-6">
      {[
        {
          label: 'Primary',
          guidance: 'The single preferred next action in this surface.',
          button: <Button>Save changes</Button>,
        },
        {
          label: 'Secondary',
          guidance: 'A valid alternative that should not compete with the primary action.',
          button: <Button variant="outline">Save as draft</Button>,
        },
        {
          label: 'Tertiary',
          guidance: 'A reversible or low-emphasis action.',
          button: <Button variant="ghost">Cancel</Button>,
        },
      ].map(({ label, guidance, button }) => (
        <div
          key={label}
          className="grid items-start gap-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center"
        >
          <div>{button}</div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{label}</h4>
            <p className="text-sm text-muted-foreground">{guidance}</p>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const DestructiveActions: Story = {
  name: 'Destructive actions',
  parameters: {
    docs: {
      description: {
        story:
          'Use the destructive variant with a visible descriptive label. Route the action through an explicit confirmation step (dialog) instead of styling the trigger more aggressively.',
      },
    },
  },
  render: () => (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
      <Button variant="destructive">
        <Trash2 data-icon="inline-start" />
        Delete class
      </Button>
      <Button variant="destructive" size="sm">
        <Trash2 data-icon="inline-start" />
        Remove member
      </Button>
    </div>
  ),
};

export const WithIcons: Story = {
  name: 'With icons',
  parameters: {
    docs: {
      description: {
        story:
          'Mark icons with data-icon="inline-start" or data-icon="inline-end" so the button rebalances its padding. Icon-only buttons use an icon size and must carry an aria-label.',
      },
    },
  },
  render: () => (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
      <Button>
        <Save data-icon="inline-start" />
        Save changes
      </Button>
      <Button variant="outline">
        <RefreshCw data-icon="inline-start" />
        Refresh
      </Button>
      <Button variant="outline" size="icon" aria-label="Refresh data">
        <RefreshCw />
      </Button>
    </div>
  ),
};

export const Processing: Story = {
  args: {
    children: (
      <>
        <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" />
        Processing
      </>
    ),
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Keep the action label, accessible name, and button dimensions stable while work is pending.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Processing' })).toBeDisabled();
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Use disabled only when the action truly cannot run. Explain the prerequisite nearby when it is not obvious.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Continue' })).toBeDisabled();
  },
};

export const NarrowSurface: Story = {
  name: 'Narrow surface',
  args: {
    children: 'Continue',
    className: 'w-full',
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-90">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'Full-width buttons (className="w-full") are useful in narrow forms and mobile action areas; avoid stretching them across wide desktop content.',
      },
    },
  },
};
