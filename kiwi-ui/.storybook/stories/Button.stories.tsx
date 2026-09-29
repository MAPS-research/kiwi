import type { Meta, StoryObj } from '@storybook/react-vite';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { expect, within } from 'storybook/test';
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

- **Contained:** ${buttonContract.variants.contained}
- **Outlined:** ${buttonContract.variants.outlined}
- **Text:** ${buttonContract.variants.text}

## Accessibility contract

${buttonContract.accessibility.map((item) => `- ${item}`).join('\n')}
`;

const meta = {
  title: 'Kiwi Design System/Components/Button',
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
    color: 'primary',
    disabled: false,
    fullWidth: false,
    size: 'medium',
    variant: 'contained',
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'Use a concise, action-first label that describes the result.',
      table: { category: 'Content' },
    },
    variant: {
      control: 'inline-radio',
      options: ['contained', 'outlined', 'text'],
      description: 'Select from action hierarchy, not visual preference.',
      table: { category: 'Hierarchy' },
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'inherit'],
      description: 'Communicate action intent; never rely on color without a clear label.',
      table: { category: 'Hierarchy' },
    },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
      description: 'Use medium by default; change size only for a clear density or prominence need.',
      table: { category: 'Layout' },
    },
    fullWidth: {
      control: 'boolean',
      description: 'Use on narrow surfaces when the action should occupy the available width.',
      table: { category: 'Layout' },
    },
    disabled: {
      control: 'boolean',
      description: 'Use native disabled semantics when the action cannot run.',
      table: { category: 'State' },
    },
    startIcon: { control: false, table: { disable: true } },
    endIcon: { control: false, table: { disable: true } },
    sx: { control: false, table: { disable: true } },
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
        story: 'Use one contained action as the primary choice, outlined for secondary actions, and text for low-emphasis or reversible actions.',
      },
    },
  },
  render: () => (
    <Stack spacing={3} sx={{ maxWidth: 680 }}>
      {[
        {
          label: 'Primary',
          guidance: 'The single preferred next action in this surface.',
          button: <Button variant="contained">Save changes</Button>,
        },
        {
          label: 'Secondary',
          guidance: 'A valid alternative that should not compete with the primary action.',
          button: <Button variant="outlined">Save as draft</Button>,
        },
        {
          label: 'Tertiary',
          guidance: 'A reversible or low-emphasis action.',
          button: <Button variant="text">Cancel</Button>,
        },
      ].map(({ label, guidance, button }) => (
        <Box
          key={label}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '140px minmax(0, 1fr)' },
            alignItems: { xs: 'start', sm: 'center' },
            gap: 2,
          }}
        >
          <Box>{button}</Box>
          <Box>
            <Typography component="h4" variant="subtitle2">
              {label}
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {guidance}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  ),
};

export const DestructiveActions: Story = {
  name: 'Destructive actions',
  parameters: {
    docs: {
      description: {
        story: 'Use a visible destructive label and error color together. Prefer outlined until the user reaches an explicit confirmation step.',
      },
    },
  },
  render: () => (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{
      alignItems: { xs: 'stretch', sm: 'center' }
    }}>
      <Button variant="outlined" color="error" startIcon={<DeleteOutlinedIcon />}>
        Delete class
      </Button>
      <Button variant="contained" color="error" startIcon={<DeleteOutlinedIcon />}>
        Confirm deletion
      </Button>
    </Stack>
  ),
};

export const StatusActions: Story = {
  name: 'Status actions',
  parameters: {
    docs: {
      description: {
        story: 'Reserve semantic colors for actions whose outcome matches that meaning; the label and icon still carry the intent.',
      },
    },
  },
  render: () => (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{
      alignItems: { xs: 'stretch', sm: 'center' }
    }}>
      <Button variant="contained" color="success" startIcon={<SaveOutlinedIcon />}>
        Approve submission
      </Button>
      <Button variant="outlined" color="warning" startIcon={<RefreshOutlinedIcon />}>
        Regenerate result
      </Button>
    </Stack>
  ),
};

export const Processing: Story = {
  args: {
    children: 'Processing',
    disabled: true,
    startIcon: <CircularProgress color="inherit" size={16} aria-hidden="true" />,
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
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 'min(100%, 360px)' }}>
        <Story />
      </Box>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Full-width buttons are useful in narrow forms and mobile action areas; avoid stretching them across wide desktop content.',
      },
    },
  },
};
