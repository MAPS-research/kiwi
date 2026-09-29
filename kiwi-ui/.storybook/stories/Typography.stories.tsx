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
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
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
          Montserrat — the only typeface for ordinary UI. It is self-hosted from the{' '}
          <Box component="code">@fontsource-variable/montserrat</Box> package via{' '}
          <Box component="code">src/fonts/montserrat.css</Box>, so nothing is fetched from Google Fonts at
          runtime. <Box component="code">sans-serif</Box> is only a generic fallback for glyphs Montserrat does not
          cover (e.g. CJK).
        </Typography>
        <Box
          component="code"
          sx={{ display: 'block', mt: 1.5, p: 2, bgcolor: 'grey.100', borderRadius: 1, overflowWrap: 'anywhere' }}
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
          Montserrat is loaded as a variable font, so every weight below comes from one file per subset.
        </Typography>
        <Stack spacing={1.5}>
          <Typography sx={{ fontWeight: 'fontWeightLight' }}>Light — {theme.typography.fontWeightLight}</Typography>
          <Typography sx={{ fontWeight: 'fontWeightRegular' }}>
            Regular — {theme.typography.fontWeightRegular}
          </Typography>
          <Typography sx={{ fontWeight: 'fontWeightMedium' }}>
            Medium — {theme.typography.fontWeightMedium}
          </Typography>
          <Typography sx={{ fontWeight: 600 }}>Semi bold — 600</Typography>
          <Typography sx={{ fontWeight: 'fontWeightBold' }}>Bold — {theme.typography.fontWeightBold}</Typography>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Semantic text colors
        </Typography>
        <Stack spacing={1.5}>
          <Typography color="text.primary">text.primary — primary content</Typography>
          <Typography color="text.secondary">text.secondary — supporting content</Typography>
          <Typography color="text.disabled">text.disabled — unavailable content</Typography>
          <Typography color="primary.main">primary.main — interactive or brand emphasis</Typography>
          <Typography color="error.main">error.main — error feedback</Typography>
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
