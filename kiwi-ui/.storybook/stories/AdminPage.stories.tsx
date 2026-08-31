import type { Meta, StoryObj } from '@storybook/react-vite';
import { Plus } from 'lucide-react';
import { AdminPage, AdminPageHeader } from '../../src/components/AdminPage/index.ts';
import { Button } from '../../src/components/ui/button.tsx';

const AdminPagePreview = ({ maxWidth = 'lg' }: { maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false }) => (
  <AdminPage maxWidth={maxWidth}>
    <AdminPageHeader
      title="Classes"
      description="Create classes and manage existing course spaces."
      actions={
        <Button>
          <Plus data-icon="inline-start" />
          Add class
        </Button>
      }
    />
    <div className="rounded-xl border bg-card p-6">
      <p className="text-sm text-muted-foreground">Page content starts here.</p>
    </div>
  </AdminPage>
);

const meta = {
  title: 'Components/Layout/Admin Page',
  component: AdminPagePreview,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-h-105 bg-background p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    maxWidth: 'lg',
  },
  argTypes: {
    maxWidth: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', false],
      description: 'Standard content width; use lg unless the page genuinely needs more or less room.',
    },
  },
  parameters: {
    docs: {
      description: {
        component: `
> **Scope: Kiwi Design System.** This is a Kiwi product pattern contract, not a rule for authoring Storybook.

The standard width and bottom-spacing wrapper for Kiwi Admin page content. It relies on \`AdminLayout\` for outer padding, so pages should not add another top-level padding or large top margin.

For a complete, high-density composed surface built on this shell, see **Guidelines / User Management**.
        `,
      },
    },
  },
} satisfies Meta<typeof AdminPagePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
