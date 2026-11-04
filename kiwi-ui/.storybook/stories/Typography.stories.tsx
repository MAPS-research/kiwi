import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Divider, Stack, Typography, useTheme } from '@mui/material';
import designSystem from '../design-system/catalog.json' with { type: 'json' };

const typographyContract = designSystem.foundations.typography;

const typeVariants = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'subtitle1',
  'subtitle2',
  'body1',
  'body2',
  'button',
  'caption',
  'overline',
] as const;

const TypographyOverview = () => {
  const theme = useTheme();

  return (
    <Stack spacing={5} sx={{ p: 2, maxWidth: 960 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Typography
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', maxWidth: 760 }}>
          Kiwi UI uses the typography configuration from <Box component="code">src/Theme.ts</Box>. Prefer MUI
          variants instead of setting font size and line height independently in product components.
        </Typography>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Font family
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Source Sans 3: the typeface for ordinary UI (kiwi-ui/DESIGN.md, Type). It is self-hosted from the{' '}
          <Box component="code">@fontsource-variable/source-sans-3</Box> package via{' '}
          <Box component="code">src/fonts/source-sans-3.css</Box>, so nothing is fetched from Google Fonts at
          runtime. The stack is the <Box component="code">--font-ui</Box> token: PingFang SC, Hiragino Sans GB,
          Microsoft YaHei and Noto Sans CJK SC carry Chinese text. Montserrat is the KiwiWordmark's face only.
        </Typography>
        <Box
          component="code"
          sx={{ display: 'block', mt: 1.5, p: 2, bgcolor: 'action.hover', borderRadius: 'var(--radius-control)', overflowWrap: 'anywhere' }}
        >
          {theme.typography.fontFamily}
        </Box>
        <Typography variant="h5" sx={{ mt: 2 }}>
          The quick brown fox jumps over the lazy dog.
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, fontStyle: 'italic' }}>
          The quick brown fox jumps over the lazy dog.
        </Typography>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Type scale
        </Typography>
        <Stack spacing={0} divider={<Divider flexItem />}>
          {typeVariants.map((variant) => {
            const style = theme.typography[variant];

            return (
              <Box
                key={variant}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '140px minmax(0, 1fr)' },
                  gap: { xs: 1, sm: 3 },
                  py: 2.5,
                  alignItems: 'baseline',
                }}
              >
                <Stack spacing={0.25}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {variant}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {String(style.fontSize)} / {String(style.lineHeight)}
                  </Typography>
                </Stack>
                <Typography variant={variant}>The quick brown fox jumps over the lazy dog.</Typography>
              </Box>
            );
          })}
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Font weights
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Source Sans 3 is loaded as a variable font, upright and italic. The UI uses two weights, 400 and 600,
          and the true italic 400; <Box component="code">font-synthesis: none</Box> keeps the browser from faking any
          other.
        </Typography>
        <Stack spacing={1.5}>
          <Typography sx={{ fontWeight: 'fontWeightRegular' }}>
            Regular — {theme.typography.fontWeightRegular}
          </Typography>
          <Typography sx={{ fontWeight: 600 }}>Semibold — 600</Typography>
          <Typography sx={{ fontStyle: 'italic' }}>Italic — 400</Typography>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Semantic text colors
        </Typography>
        <Stack spacing={1.5}>
          <Typography sx={{
            color: "text.primary"
          }}>text.primary — primary content</Typography>
          <Typography sx={{
            color: "text.secondary"
          }}>text.secondary — supporting content</Typography>
          <Typography sx={{
            color: "text.disabled"
          }}>text.disabled — unavailable content</Typography>
          <Typography sx={{
            color: "primary.main"
          }}>primary.main — interactive or brand emphasis</Typography>
          <Typography sx={{
            color: "error.main"
          }}>error.main — error feedback</Typography>
        </Stack>
      </Box>
    </Stack>
  );
};

const meta = {
  title: 'Kiwi Design System/Foundations/Typography',
  component: TypographyOverview,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
> **Scope: Kiwi Design System.** ${typographyContract.summary}

${typographyContract.rules.map((item) => `- ${item}`).join('\n')}
        `,
      },
    },
  },
} satisfies Meta<typeof TypographyOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
