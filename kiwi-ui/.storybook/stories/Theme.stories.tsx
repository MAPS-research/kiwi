import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, Box, Divider, Link, Stack, Typography } from '@mui/material';
import theme from '../../src/Theme.ts';
import materialDesign2014 from '../../src/theme/material-design-2014.json' with { type: 'json' };
import designSystem from '../design-system/catalog.json' with { type: 'json' };

const colorsContract = designSystem.foundations.colors;

type Colors = Record<string, string>;
type MaterialColor = Record<string, string>;

const {
  amber,
  blue,
  blueGrey,
  brown,
  cyan,
  deepOrange,
  deepPurple,
  green,
  grey,
  indigo,
  lightBlue,
  lightGreen,
  lime,
  orange,
  pink,
  purple,
  red,
  teal,
  yellow,
} = materialDesign2014.palettes;

const materialShadeOrder = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  'A100',
  'A200',
  'A400',
  'A700',
] as const;

const material2014Palettes: Array<{ name: string; importName: string; colors: MaterialColor }> = [
  { name: 'Red', importName: 'red', colors: red },
  { name: 'Pink', importName: 'pink', colors: pink },
  { name: 'Purple', importName: 'purple', colors: purple },
  { name: 'Deep Purple', importName: 'deepPurple', colors: deepPurple },
  { name: 'Indigo', importName: 'indigo', colors: indigo },
  { name: 'Blue', importName: 'blue', colors: blue },
  { name: 'Light Blue', importName: 'lightBlue', colors: lightBlue },
  { name: 'Cyan', importName: 'cyan', colors: cyan },
  { name: 'Teal', importName: 'teal', colors: teal },
  { name: 'Green', importName: 'green', colors: green },
  { name: 'Light Green', importName: 'lightGreen', colors: lightGreen },
  { name: 'Lime', importName: 'lime', colors: lime },
  { name: 'Yellow', importName: 'yellow', colors: yellow },
  { name: 'Amber', importName: 'amber', colors: amber },
  { name: 'Orange', importName: 'orange', colors: orange },
  { name: 'Deep Orange', importName: 'deepOrange', colors: deepOrange },
  { name: 'Brown', importName: 'brown', colors: brown },
  { name: 'Grey', importName: 'grey', colors: grey },
  { name: 'Blue Grey', importName: 'blueGrey', colors: blueGrey },
];

const Swatch = ({ name, value }: { name: string; value: string }) => (
  <Stack spacing={0.5} sx={{ width: 152 }}>
    <Box
      sx={{
        width: 64,
        height: 64,
        borderRadius: 1,
        bgcolor: value,
        border: '1px solid rgba(0,0,0,0.12)',
      }}
    />
    <Typography variant="caption" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
      {name}
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
      {value}
    </Typography>
  </Stack>
);

const Group = ({ title, colors }: { title: string; colors: Colors }) => (
  <Box>
    <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
      {title}
    </Typography>
    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
      {Object.entries(colors).map(([name, value]) => (
        <Swatch key={name} name={name} value={value} />
      ))}
    </Stack>
  </Box>
);

const MaterialPaletteCard = ({ name, importName, colors }: (typeof material2014Palettes)[number]) => (
  <Box
    component="section"
    aria-label={`${name} palette`}
    sx={{ overflow: 'hidden', border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}
  >
    <Box sx={{ px: 2, py: 1.5 }}>
      <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
        {name}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
        {importName}
      </Typography>
    </Box>
    {materialShadeOrder.map((shade) => {
      const value = colors[shade];

      if (typeof value !== 'string') return null;

      return (
        <Box
          key={shade}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            px: 1.5,
            py: 0.75,
            bgcolor: value,
            color: theme.palette.getContrastText(value),
          }}
        >
          <Typography variant="caption" sx={{ color: 'inherit', fontWeight: shade === '500' ? 800 : 600 }}>
            {shade}
          </Typography>
          <Typography variant="caption" sx={{ color: 'inherit', fontFamily: 'monospace' }}>
            {value}
          </Typography>
        </Box>
      );
    })}
  </Box>
);

const Code = ({ children }: { children: string }) => (
  <Box
    component="code"
    sx={{
      display: 'block',
      mt: 1.5,
      p: 1.5,
      bgcolor: 'grey.100',
      borderRadius: 1,
      fontFamily: 'monospace',
      fontSize: 13,
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
    <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700 }}>
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
  const { primary, secondary, success, warning, error, info, chart, text, background, action, divider, grey: themeGrey } =
    theme.palette;

  return (
    <Stack spacing={4} sx={{ p: 2 }}>
      <SectionIntro
        title="Project theme colors — Material 2014 by default"
        source="src/Theme.ts → theme.palette"
        example={'<Button color="primary" />\n<Box sx={{ color: \'text.secondary\', bgcolor: \'background.paper\' }} />'}
      >
        Kiwi UI maps its semantic MUI theme entirely to the 2014 Material Design palettes. Use semantic paths in
        product code; the hue and shade shown here explain the mapping, but are not component-level tokens.
      </SectionIntro>

      <Alert severity="success">
        Default hierarchy: Purple for primary actions, Pink for secondary emphasis, and Material semantic hues for
        status.
      </Alert>

      <Group
        title="Core actions — Material Purple and Pink"
        colors={{
          'primary.light · purple.500': primary.light,
          'primary.main · purple.700': primary.main,
          'primary.dark · purple.900': primary.dark,
          'secondary.light · pink.500': secondary.light,
          'secondary.main · pink.700': secondary.main,
          'secondary.dark · pink.900': secondary.dark,
        }}
      />
      <Group
        title="Semantic status — Material Green, Orange, Red, and Blue"
        colors={{
          'success.main · green.800': success.main,
          'warning.main · orange.800': warning.main,
          'error.main · red.700': error.main,
          'info.main · blue.700': info.main,
        }}
      />
      <Group
        title="Chart series — Shared five-color palette"
        colors={{
          'chart.series1 · #9C27B0': chart.series1,
          'chart.series2 · #EC0A85': chart.series2,
          'chart.series3 · #FF5A4E': chart.series3,
          'chart.series4 · #FFA600': chart.series4,
          'chart.series5 · grey.500': chart.series5,
        }}
      />
      <Group
        title="Contrast text"
        colors={{
          'primary.contrastText': primary.contrastText,
          'secondary.contrastText': secondary.contrastText,
          'success.contrastText': success.contrastText,
          'warning.contrastText': warning.contrastText,
          'error.contrastText': error.contrastText,
          'info.contrastText': info.contrastText,
        }}
      />
      <Group
        title="Text, surfaces, and divider — Material Grey"
        colors={{
          'text.primary · grey.900': text.primary,
          'text.secondary · grey.700': text.secondary,
          'text.disabled · grey.500': text.disabled,
          'background.default · grey.50': background.default,
          'background.paper': background.paper,
          'divider · grey.300': divider,
        }}
      />
      <Group
        title="Action states — Purple-derived"
        colors={{
          'action.active': action.active,
          'action.hover': action.hover,
          'action.selected': action.selected,
          'action.disabled': action.disabled,
          'action.disabledBackground': action.disabledBackground,
          'action.focus': action.focus,
        }}
      />
      <Group
        title="Material Grey scale"
        colors={{
          'grey.50': themeGrey[50],
          'grey.100': themeGrey[100],
          'grey.200': themeGrey[200],
          'grey.300': themeGrey[300],
          'grey.400': themeGrey[400],
          'grey.500': themeGrey[500],
          'grey.600': themeGrey[600],
          'grey.700': themeGrey[700],
          'grey.800': themeGrey[800],
          'grey.900': themeGrey[900],
        }}
      />
    </Stack>
  );
};

const Material2014PaletteLibrary = () => (
  <Stack spacing={3} sx={{ p: 2 }}>
    <SectionIntro
      title="2014 Material Design palette library"
      source="src/theme/material-design-2014.json"
      example={
        "import material2014 from './theme/material-design-2014.json';\n\nconst selected = material2014.palettes.purple['700'];"
      }
    >
      This project-local JSON preserves the complete MUI-provided 2014 palettes. Use it to select or extend a semantic
      role, then expose that role through the theme. Do not scatter raw hue/shade references across product components.
    </SectionIntro>
    <Alert severity="info">
      MUI source:{' '}
      <Link href="https://mui.com/material-ui/customization/color/#2014-material-design-color-palettes">
        2014 Material Design color palettes
      </Link>
      . The 500 row is the canonical main shade; accent rows use the A prefix.
    </Alert>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
      {material2014Palettes.map((palette) => (
        <MaterialPaletteCard key={palette.importName} {...palette} />
      ))}
    </Box>
  </Stack>
);

const externalThemeColors = {
  '--kiwi-primary': purple['700'],
  '--kiwi-primary-light': purple['500'],
  '--kiwi-primary-dark': purple['900'],
  '--kiwi-primary-contrast': '#ffffff',
  '--kiwi-secondary': pink['700'],
  '--kiwi-secondary-light': pink['500'],
  '--kiwi-secondary-dark': pink['900'],
  '--kiwi-secondary-contrast': '#ffffff',
};

const externalSemanticColors = {
  '--kiwi-success': green['800'],
  '--kiwi-warning': orange['800'],
  '--kiwi-error': red['700'],
  '--kiwi-info': blue['700'],
};

const externalSurfaceColors = {
  '--kiwi-bg-default': grey['50'],
  '--kiwi-bg-paper': '#ffffff',
  '--kiwi-bg-hover': 'rgba(123, 31, 162, 0.04)',
  '--kiwi-bg-selected': 'rgba(123, 31, 162, 0.08)',
  '--kiwi-text-primary': grey['900'],
  '--kiwi-text-secondary': grey['700'],
  '--kiwi-border-default': grey['300'],
};

const ExternalDesignTokens = () => (
  <Stack spacing={4} sx={{ p: 2 }}>
    <SectionIntro
      title="Kiwi Design Tokens — external Kiwi Apps only"
      source="public/kiwi-design-tokens.css → :root CSS custom properties"
      example={
        '<link rel="stylesheet" href="https://<kiwi-domain>/kiwi-design-tokens.css">\n\n.external-card {\n  color: var(--kiwi-text-primary);\n  background: var(--kiwi-bg-paper);\n}'
      }
    >
      This is the CSS contract for applications outside the main Kiwi project. Its default semantic tokens mirror the
      Material 2014 MUI theme. React components inside Kiwi UI should continue to use MUI theme paths instead.
    </SectionIntro>

    <Alert severity="info">
      The external semantic contract mirrors <Box component="code">src/Theme.ts</Box> and must stay in sync when a
      theme role changes.
    </Alert>

    <Group title="External core theme tokens" colors={externalThemeColors} />
    <Group title="External semantic tokens" colors={externalSemanticColors} />
    <Group title="External surface, text, and border tokens" colors={externalSurfaceColors} />
  </Stack>
);

const ColorsOverview = () => (
  <Stack spacing={3} sx={{ p: 2, maxWidth: 840 }}>
    <Typography variant="h4" sx={{ fontWeight: 700 }}>
      Colors: Material first
    </Typography>
    <Typography>
      The 2014 Material Design palettes are Kiwi's primary color foundation. Semantic MUI roles are the application
      contract, and external Kiwi Apps receive matching CSS variables.
    </Typography>
    <Divider />
    <Box>
      <Typography variant="h6">1. Build product UI with semantic roles</Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        Use <Box component="code">primary.main</Box>, <Box component="code">error.main</Box>,{' '}
        <Box component="code">text.secondary</Box>, and related paths from <Box component="code">src/Theme.ts</Box>.
      </Typography>
    </Box>
    <Box>
      <Typography variant="h6">2. Choose new roles from Material 2014</Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        Review the complete hue and shade library, then map the chosen value to a semantic theme or feature token.
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

Sources: [MUI 2014 Material Design color palettes](https://mui.com/material-ui/customization/color/#2014-material-design-color-palettes).
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

export const MaterialPalettes: Story = {
  name: '2. 2014 Material Palettes',
  render: () => <Material2014PaletteLibrary />,
};

export const ExternalTokens: Story = {
  name: '3. External App Tokens',
  render: () => <ExternalDesignTokens />,
};
