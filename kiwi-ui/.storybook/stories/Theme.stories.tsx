import type { Meta, StoryObj } from '@storybook/react-vite';
import designSystem from '../design-system/catalog.json' with { type: 'json' };

const colorsContract = designSystem.foundations.colors;

const CodeBlock = ({ children }: { children: string }) => (
  <code className="mt-3 block rounded-lg bg-muted p-3 font-mono text-[13px] whitespace-pre-wrap">
    {children}
  </code>
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
  <div>
    <h2 className="mb-1 text-xl font-bold">{title}</h2>
    <p className="text-sm text-muted-foreground">
      Source: <code>{source}</code>
    </p>
    <div className="mt-3 max-w-[760px] text-sm">{children}</div>
    <CodeBlock>{example}</CodeBlock>
  </div>
);

const InfoNote = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{children}</div>
);

/* Semantic tokens defined in src/index.css. Class names stay literal so Tailwind generates them. */
const semanticTokenGroups: Array<{
  title: string;
  tokens: Array<{ token: string; className: string; value: string; use: string }>;
}> = [
  {
    title: 'Surfaces and text',
    tokens: [
      { token: '--background', className: 'bg-background', value: '#fafafa', use: 'App background' },
      { token: '--foreground', className: 'bg-foreground', value: '#212121', use: 'Primary text' },
      { token: '--card', className: 'bg-card', value: '#ffffff', use: 'Card and panel surfaces' },
      { token: '--card-foreground', className: 'bg-card-foreground', value: '#212121', use: 'Text on cards' },
      { token: '--popover', className: 'bg-popover', value: '#ffffff', use: 'Floating surfaces' },
      { token: '--popover-foreground', className: 'bg-popover-foreground', value: '#212121', use: 'Text on floating surfaces' },
      { token: '--muted', className: 'bg-muted', value: '#f5f5f5', use: 'Subdued fills' },
      { token: '--muted-foreground', className: 'bg-muted-foreground', value: '#616161', use: 'Supporting text' },
    ],
  },
  {
    title: 'Actions',
    tokens: [
      { token: '--primary', className: 'bg-primary', value: '#6a1b9a', use: 'Primary actions' },
      { token: '--primary-foreground', className: 'bg-primary-foreground', value: '#ffffff', use: 'Text on primary' },
      { token: '--secondary', className: 'bg-secondary', value: '#616161', use: 'Secondary filled actions' },
      { token: '--secondary-foreground', className: 'bg-secondary-foreground', value: '#ffffff', use: 'Text on secondary' },
      { token: '--accent', className: 'bg-accent', value: '#f5f5f5', use: 'Hover and selected fills' },
      { token: '--accent-foreground', className: 'bg-accent-foreground', value: '#212121', use: 'Text on accent fills' },
    ],
  },
  {
    title: 'Status, borders, and focus',
    tokens: [
      { token: '--destructive', className: 'bg-destructive', value: '#d32f2f', use: 'Destructive actions and errors' },
      { token: '--success', className: 'bg-success', value: '#2e7d32', use: 'Positive confirmation' },
      { token: '--warning', className: 'bg-warning', value: '#ef6c00', use: 'Caution states' },
      { token: '--border', className: 'bg-border', value: '#e0e0e0', use: 'Borders and dividers' },
      { token: '--input', className: 'bg-input', value: '#e0e0e0', use: 'Input borders' },
      { token: '--ring', className: 'bg-ring', value: '#9c27b0', use: 'Focus ring' },
    ],
  },
  {
    title: 'Chart series',
    tokens: [
      { token: '--chart-1', className: 'bg-chart-1', value: '#6a1b9a', use: 'Series 1' },
      { token: '--chart-2', className: 'bg-chart-2', value: '#cf007e', use: 'Series 2' },
      { token: '--chart-3', className: 'bg-chart-3', value: '#ff4e4c', use: 'Series 3' },
      { token: '--chart-4', className: 'bg-chart-4', value: '#ffa600', use: 'Series 4' },
      { token: '--chart-5', className: 'bg-chart-5', value: '#9e9e9e', use: 'Series 5' },
    ],
  },
];

const SemanticTokens = () => (
  <div className="flex flex-col gap-8 p-4">
    <SectionIntro
      title="Semantic tokens — the Tailwind contract"
      source="src/index.css → :root custom properties, exposed via @theme inline"
      example={'<Button>Save</Button>\n<p className="text-sm text-muted-foreground">Supporting copy</p>\n<div className="rounded-xl border bg-card" />'}
    >
      Product UI uses Tailwind utilities backed by the semantic tokens in <code>src/index.css</code>. That file is
      the single source of truth for every color in the product: tokens are defined on <code>:root</code> and reach
      utility classes through the <code>@theme inline</code> block.
    </SectionIntro>

    <InfoNote>
      Default hierarchy: purple for primary actions, neutral grays for secondary emphasis, red for destructive
      meaning. Never hard-code color in product components — no raw hex/rgb values and no Tailwind palette classes
      such as <code>amber-500</code>.
    </InfoNote>

    {semanticTokenGroups.map((group) => (
      <div key={group.title}>
        <h3 className="mb-3 text-sm font-semibold">{group.title}</h3>
        <div className="flex flex-wrap gap-4">
          {group.tokens.map(({ token, className, value, use }) => (
            <div key={token} className="flex w-42 flex-col gap-1">
              <div className={`h-16 w-16 rounded-md border ${className}`} />
              <code className="text-xs font-semibold [overflow-wrap:anywhere]">{token}</code>
              <code className="text-xs text-muted-foreground">{value}</code>
              <span className="text-xs text-muted-foreground">{use}</span>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const ColorsOverview = () => (
  <div className="flex max-w-4xl flex-col gap-6 p-4">
    <h2 className="text-2xl leading-[1.3] font-semibold tracking-[-0.02em]">
      Colors: Tailwind semantic tokens only
    </h2>
    <p className="text-sm">
      Every color in the product comes from the semantic tokens defined in <code>src/index.css</code>. Components
      consume them through Tailwind utilities; nothing else defines color.
    </p>
    <div className="flex flex-col gap-5 border-t pt-6">
      <div>
        <h3 className="text-base font-semibold">1. Build product UI with semantic tokens</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Use <code>bg-primary</code>, <code>text-destructive</code>, <code>text-muted-foreground</code>,{' '}
          <code>border-border</code>, and related utilities backed by <code>src/index.css</code>.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold">2. Never hard-code color</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No raw hex/rgb values and no Tailwind palette classes (<code>amber-500</code>,{' '}
          <code>emerald-600</code>, ...) in product components. If no token fits, that is a missing role, not a
          license to inline a value.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold">3. Extend the contract in one place</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add or change a role by defining the custom property in <code>src/index.css</code> and exposing it in{' '}
          <code>@theme inline</code>, then document it here.
        </p>
      </div>
    </div>
  </div>
);

const meta = {
  title: 'Foundations/Colors',
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

export const SemanticTokensStory: Story = {
  name: 'Semantic Tokens',
  render: () => <SemanticTokens />,
};
