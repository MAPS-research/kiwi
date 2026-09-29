import type { Meta, StoryObj } from '@storybook/react-vite';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { Box, Button, Chip } from '@mui/material';
import { AdminPageHeader } from '../../src/components/AdminPage/index.ts';

const meta = {
  title: 'Kiwi Design System/Patterns/Admin Page Header',
  component: AdminPageHeader,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Box sx={{ ml: 4, mt: 4, mr: 4 }}>
        <Story />
      </Box>
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

- Uses a semantic \`h1\` with the compact MUI \`h5\` visual style.
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
        <Button variant="outlined" startIcon={<RefreshOutlinedIcon />}>
          Refresh
        </Button>
        <Button variant="contained" startIcon={<AddOutlinedIcon />}>
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
    status: <Chip size="small" color="success" label="Active" />,
    actions: <Button variant="outlined">Edit</Button>,
  },
};
