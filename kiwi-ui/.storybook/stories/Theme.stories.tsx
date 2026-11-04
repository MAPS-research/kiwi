import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import designSystem from '../design-system/catalog.json' with { type: 'json' };

// Every value on these pages is read, never restated: the semantic roles from the
// current MUI theme (useTheme(), so the dark scheme shows its own values), the ramps
// from the token custom properties on the document, and the external contract from
// the public stylesheet itself.

const colorsContract = designSystem.foundations.colors;

type Colors = Record<string, string>;

const Swatch = ({ name, value }: { name: string; value: string }) => (
  <Stack spacing={0.5} sx={{ width: 152 }}>
    <Box
      sx={{
        width: 64,
        height: 64,
        borderRadius: 'var(--radius-small)',
        bgcolor: value,
        border: '1px solid var(--border)',
      }}
    />
    <Typography variant="caption" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
      {name}
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'var(--font-mono)' }}>
      {value}
    </Typography>
  </Stack>
);

const Group = ({ title, colors }: { title: string; colors: Colors }) => (
  <Box>
    <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
      {title}
    </Typography>
    <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {Object.entries(colors).map(([name, value]) => (
        <Swatch key={name} name={name} value={value} />
      ))}
    </Stack>
  </Box>
);

const Code = ({ children }: { children: string }) => (
  <Box
    component="code"
    sx={{
      display: 'block',
      mt: 1.5,
      p: 1.5,
      bgcolor: 'action.hover',
      borderRadius: 'var(--radius-control)',
      fontFamily: 'var(--type-code-family)',
      fontSize: 'var(--type-code-size)',
      whiteSpace: 'pre-wrap',
    }}
  >
    {children}
  </Box>
);

const SectionIntro = ({
  title,
  source,
  children,
  example,
}: {
  title: string;
  source: string;
  children: React.ReactNode;
  example: string;
}) => (
  <Box>
    <Typography variant="h5" sx={{ mb: 0.5 }}>
      {title}
    </Typography>
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      Source: <Box component="code">{source}</Box>
    </Typography>
    <Typography component="div" variant="body2" sx={{ mt: 1.5, maxWidth: 760 }}>
      {children}
    </Typography>
    <Code>{example}</Code>
  </Box>
);

const ProjectThemeColors = () => {
  const { palette } = useTheme();
  const { primary, secondary, success, warning, error, info, chart, text, background, action, divider } = palette;

  return (
    <Stack spacing={4} sx={{ p: 2 }}>
      <SectionIntro
        title="Project theme colors"
        source="src/Theme.ts → theme.palette (generated from the design tokens)"
        example={'<Button variant="contained" />\n<Box sx={{ color: "text.secondary", bgcolor: "background.paper", borderColor: "var(--border)" }} />'}
      >
        The palette is generated from the Stage 1 design tokens for the current color scheme. Product code reads a
        token as <Box component="code">var(--…)</Box> or one of the mapped roles; these swatches show the values the
        theme holds right now.
      </SectionIntro>

      <Group
        title="Controls"
        colors={{
          'primary.main · the filled control': primary.main,
          'primary.dark · its hover fill': primary.dark,
          'primary.contrastText · the label on the fill': primary.contrastText,
          'secondary.main · the interactive edge': secondary.main,
        }}
      />
      <Group
        title="Status surfaces and text"
        colors={{
          'success.light': success.light,
          'success.main': success.main,
          'warning.light': warning.light,
          'warning.main': warning.main,
          'error.light': error.light,
          'error.main': error.main,
          'info.light': info.light,
          'info.main': info.main,
        }}
      />
      <Group
        title="Chart"
        colors={{
          'chart.series1': chart.series1,
          'chart.series2': chart.series2,
          'chart.series3': chart.series3,
          'chart.series4': chart.series4,
          'chart.series5': chart.series5,
          'chart.other': chart.other,
          'chart.grid': chart.grid,
          'chart.baseline': chart.baseline,
          'chart.tickText': chart.tickText,
          'chart.plot': chart.plot,
        }}
      />
      <Group
        title="Text, surfaces and rules"
        colors={{
          'text.primary': text.primary,
          'text.secondary': text.secondary,
          'background.default · the canvas': background.default,
          'background.paper · the sheet': background.paper,
          'divider · the hairline': divider,
          'action.hover · the hover step': action.hover,
          'action.selected · the selection tint': action.selected,
        }}
      />
    </Stack>
  );
};

/** Reads design-token custom properties from the document, again whenever the scheme changes. */
const useTokenValues = (names: readonly string[]): Colors => {
  const { palette } = useTheme();
  const [values, setValues] = useState<Colors>({});
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setValues(Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim()])));
  }, [names, palette.mode]);
  return values;
};

const steps = Array.from({ length: 12 }, (_, index) => index + 1);
const NEUTRAL_RAMP = steps.map((step) => `--neutral-${step}`);
const ACCENT_RAMP = steps.map((step) => `--accent-${step}`);
const STATUS_STEPS = ['success', 'warning', 'error', 'info'].flatMap((kind) =>
  [3, 9, 11].map((step) => `--${kind}-${step}`),
);

const TokenRamps = () => {
  const neutral = useTokenValues(NEUTRAL_RAMP);
  const accent = useTokenValues(ACCENT_RAMP);
  const status = useTokenValues(STATUS_STEPS);

  return (
    <Stack spacing={3} sx={{ p: 2 }}>
      <SectionIntro
        title="Token ramps"
        source="src/theme/generated/kiwi-ui.tokens.css → :root and [data-theme]"
        example={'.my-part {\n  background: var(--surface);\n  color: var(--text-secondary);\n  border: 1px solid var(--border-subtle);\n}'}
      >
        The ramps the semantic tokens are drawn from. Product code uses the semantic tokens (
        <Box component="code">--surface</Box>, <Box component="code">--text</Box>,{' '}
        <Box component="code">--border-interactive</Box>, …), never a ramp step directly.
      </SectionIntro>
      <Group title="Neutral" colors={neutral} />
      <Group title="Accent" colors={accent} />
      <Group title="Status (surface 3, dot 9, text 11)" colors={status} />
    </Stack>
  );
};

/** The `--kiwi-*` colors of the public stylesheet, fetched as it is served to external apps. */
const useExternalTokens = () => {
  const [tokens, setTokens] = useState<Colors | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('kiwi-design-tokens.css')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((css) => {
        if (cancelled) return;
        const colors: Colors = {};
        for (const [, name, value] of css.matchAll(/(--kiwi-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
          if (/^(#|rgba?\(|hsla?\()/.test(value.trim())) colors[name] = value.trim();
        }
        setTokens(colors);
      })
      .catch((reason: unknown) => {
        console.error('Could not read kiwi-design-tokens.css', reason);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { tokens, failed };
};

const pick = (tokens: Colors, pattern: RegExp): Colors =>
  Object.fromEntries(Object.entries(tokens).filter(([name]) => pattern.test(name)));

const ExternalDesignTokens = () => {
  const { tokens, failed } = useExternalTokens();

  return (
    <Stack spacing={4} sx={{ p: 2 }}>
      <SectionIntro
        title="Kiwi Design Tokens — external Kiwi Apps only"
        source="public/kiwi-design-tokens.css → :root CSS custom properties"
        example={
          '<link rel="stylesheet" href="https://<kiwi-domain>/kiwi-design-tokens.css">\n\n.external-card {\n  color: var(--kiwi-text-primary);\n  background: var(--kiwi-bg-paper);\n}'
        }
      >
        This is the CSS contract for applications outside the main Kiwi project, read from the stylesheet as it is
        served, so the swatches are exactly what an external app receives. React components inside Kiwi UI use the
        design tokens instead.
      </SectionIntro>

      {failed && <Alert severity="error">The stylesheet could not be read.</Alert>}
      {tokens && (
        <>
          <Group title="External core theme tokens" colors={pick(tokens, /^--kiwi-(primary|secondary)/)} />
          <Group title="External semantic tokens" colors={pick(tokens, /^--kiwi-(success|warning|error|info)/)} />
          <Group title="External surface, text, and border tokens" colors={pick(tokens, /^--kiwi-(bg|text|border)/)} />
        </>
      )}
    </Stack>
  );
};

const ColorsOverview = () => (
  <Stack spacing={3} sx={{ p: 2, maxWidth: 840 }}>
    <Typography variant="h4">Colors: the design tokens</Typography>
    <Typography>
      Every color in Kiwi UI is a design token. The MUI theme is generated from the same tokens, and external Kiwi
      Apps receive a matching CSS contract.
    </Typography>
    <Divider />
    <Box>
      <Typography variant="h6">1. Build product UI with token roles</Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        Write <Box component="code">var(--…)</Box> in <Box component="code">sx</Box>, or use the mapped roles{' '}
        <Box component="code">text.primary</Box>, <Box component="code">text.secondary</Box>,{' '}
        <Box component="code">background.default</Box>, <Box component="code">background.paper</Box>,{' '}
        <Box component="code">divider</Box> and <Box component="code">action.hover</Box>.
      </Typography>
    </Box>
    <Box>
      <Typography variant="h6">2. Never type a color literal</Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        A new role is added to the design tokens and generated, so it follows the color scheme and the density.
      </Typography>
    </Box>
  </Stack>
);

const meta = {
  title: 'Kiwi Design System/Foundations/Colors',
  component: ColorsOverview,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
> **Scope: Kiwi Design System.** ${colorsContract.summary}

${colorsContract.rules.map((item) => `- ${item}`).join('\n')}
        `,
      },
    },
  },
} satisfies Meta<typeof ColorsOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};

export const ThemePalette: Story = {
  name: '1. Semantic Theme',
  render: () => <ProjectThemeColors />,
};

export const TokenRampsStory: Story = {
  name: '2. Token Ramps',
  render: () => <TokenRamps />,
};

export const ExternalTokens: Story = {
  name: '3. External App Tokens',
  render: () => <ExternalDesignTokens />,
};
