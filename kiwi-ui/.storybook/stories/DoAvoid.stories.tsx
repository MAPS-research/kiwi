import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { expect, within } from 'storybook/test';
import { DoAvoid } from '../components/DoAvoid.tsx';

const meta = {
  title: 'Storybook Guide/Components/Do Avoid',
  component: DoAvoid,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '> **Scope: Storybook Guide.** A documentation-only comparison component for presenting actionable guidance. It is not a Kiwi product component.',
      },
    },
  },
  args: {
    ariaLabel: 'Documentation guidance',
    doTitle: 'Do',
    avoidTitle: 'Avoid',
    headingLevel: 'h3',
    doItems: [
      'Write decision rules that explain when to use a pattern.',
      'Pair visual examples with executable evidence.',
    ],
    avoidItems: [
      'Describe appearance without explaining intent.',
      'Use color as the only signal that separates the two lists.',
    ],
  },
  argTypes: {
    doTitle: { control: 'text', table: { category: 'Content' } },
    avoidTitle: { control: 'text', table: { category: 'Content' } },
    ariaLabel: { control: 'text', table: { category: 'Accessibility' } },
    headingLevel: {
      control: 'inline-radio',
      options: ['h2', 'h3', 'h4'],
      table: { category: 'Semantics' },
    },
    doItems: { control: false, table: { disable: true } },
    avoidItems: { control: false, table: { disable: true } },
  },
} satisfies Meta<typeof DoAvoid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('region', { name: 'Documentation guidance' })).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: 'Do' })).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: 'Avoid' })).toBeInTheDocument();
    await expect(canvas.getAllByRole('listitem')).toHaveLength(4);
  },
};

export const NarrowSurface: Story = {
  name: 'Narrow surface',
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
        story: 'Panels stack vertically on narrow documentation surfaces without horizontal scrolling.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const doPanel = canvas.getByRole('region', { name: 'Do' });
    const avoidPanel = canvas.getByRole('region', { name: 'Avoid' });
    const doRect = doPanel.getBoundingClientRect();
    const avoidRect = avoidPanel.getBoundingClientRect();

    await expect(doRect.bottom).toBeLessThanOrEqual(avoidRect.top);
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};

export const LongGuidance: Story = {
  name: 'Long guidance',
  args: {
    doItems: [
      'Keep each item focused on one decision and include enough context for a reader who did not participate in the original design discussion.',
      'Allow long identifiers, translated copy, and technical terms to wrap inside the panel.',
    ],
    avoidItems: [
      'Compress several unrelated requirements into one dense paragraph that is difficult to scan and difficult for an AI agent to retrieve precisely.',
      'Give both columns fixed heights that clip or hide longer guidance.',
    ],
  },
};
