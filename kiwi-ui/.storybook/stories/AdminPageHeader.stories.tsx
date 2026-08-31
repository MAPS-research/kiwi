import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus, RefreshCw } from 'lucide-react';
import { AdminPageHeader } from '../../src/components/AdminPage/index.ts';
import { Badge } from '../../src/components/ui/badge.tsx';
import { Button } from '../../src/components/ui/button.tsx';

const meta = {
  title: 'Components/Layout/Admin Page Header',
  component: AdminPageHeader,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-8 mt-8">
        <Story />
      </div>
    ),
  ],
  args: {
    title: 'Page title',
  },
  parameters: {
    docs: {
      description: {
        component: `
> **Scope: Kiwi Design System.** This is a Kiwi product pattern contract, not a rule for authoring Storybook.

The standard page-level header for Kiwi Admin pages.

- Uses a semantic \`h1\` with the shared shadcn typography tokens.
- Supports an optional description, back action, status, and action area.
- Actions wrap below the title on narrow screens.
- Decorative page icons are intentionally excluded from the default pattern.
        `,
      },
    },
  },
} satisfies Meta<typeof AdminPageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {
  args: {
    title: 'MCP Server Management',
    description: 'Manage global MCP servers and assign them to classes.',
    actions: (
      <>
        <Button variant="outline">
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
        <Button>
          <Plus data-icon="inline-start" />
          Create Server
        </Button>
      </>
    ),
  },
};

export const Detail: Story = {
  args: {
    title: 'Experiment details',
    description: 'Students are assigned evenly across two active variants.',
    back: {
      label: 'Experiments',
      onClick: () => undefined,
    },
    status: <Badge variant="outline">Active</Badge>,
    actions: <Button variant="outline">Edit</Button>,
  },
};
