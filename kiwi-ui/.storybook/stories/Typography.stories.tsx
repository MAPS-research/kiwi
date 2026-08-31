import type { Meta, StoryObj } from '@storybook/react-vite';
import designSystem from '../design-system/catalog.json' with { type: 'json' };

const typographyContract = designSystem.foundations.typography;

/* Class names must stay literal so Tailwind generates them. */
const typeScale = [
  { className: 'text-xs', fontSize: '0.75rem / 12px', lineHeight: '1rem' },
  { className: 'text-sm', fontSize: '0.875rem / 14px', lineHeight: '1.25rem' },
  { className: 'text-base', fontSize: '1rem / 16px', lineHeight: '1.5rem' },
  { className: 'text-lg', fontSize: '1.125rem / 18px', lineHeight: '1.75rem' },
  { className: 'text-xl', fontSize: '1.25rem / 20px', lineHeight: '1.75rem' },
  { className: 'text-2xl', fontSize: '1.5rem / 24px', lineHeight: '2rem' },
  { className: 'text-3xl', fontSize: '1.875rem / 30px', lineHeight: '2.25rem' },
  { className: 'text-4xl', fontSize: '2.25rem / 36px', lineHeight: '2.5rem' },
  { className: 'text-5xl', fontSize: '3rem / 48px', lineHeight: '1' },
  { className: 'text-6xl', fontSize: '3.75rem / 60px', lineHeight: '1' },
  { className: 'text-7xl', fontSize: '4.5rem / 72px', lineHeight: '1' },
  { className: 'text-8xl', fontSize: '6rem / 96px', lineHeight: '1' },
  { className: 'text-9xl', fontSize: '8rem / 128px', lineHeight: '1' },
];

const fontWeights = [
  { label: 'Light', className: 'font-light', value: 300 },
  { label: 'Regular', className: 'font-normal', value: 400 },
  { label: 'Medium', className: 'font-medium', value: 500 },
  { label: 'Semi bold', className: 'font-semibold', value: 600 },
  { label: 'Bold', className: 'font-bold', value: 700 },
];

const textColors = [
  { className: 'text-foreground', use: 'primary content' },
  { className: 'text-muted-foreground', use: 'supporting content' },
  { className: 'text-primary', use: 'interactive or brand emphasis' },
  { className: 'text-destructive', use: 'error feedback' },
];

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-4 text-base font-semibold text-foreground">{children}</h3>
);

const TypographyOverview = () => (
  <div className="flex max-w-5xl flex-col gap-10 p-4">
    <div>
      <h2 className="text-2xl leading-[1.3] font-semibold tracking-[-0.02em]">Typography</h2>
      <p className="mt-2 max-w-[720px] text-sm leading-5 text-muted-foreground">
        Kiwi UI styles text with Tailwind CSS utilities. The full size scale is shown below; ordinary product
        UI composes text from the documented type roles instead of picking sizes ad hoc, and when a component
        owns a role, use the component.
      </p>
    </div>

    <div className="border-t pt-8">
      <SectionTitle>Font family</SectionTitle>
      <p className="max-w-[720px] text-sm leading-5 text-muted-foreground">
        Montserrat — the only typeface for ordinary UI, exposed as the <code>--font-sans</code> token (aliased
        by <code>--font-heading</code>). It is self-hosted from <code>@fontsource-variable/montserrat</code> via{' '}
        <code>src/fonts/montserrat.css</code>, so nothing is fetched from Google Fonts at runtime.{' '}
        <code>sans-serif</code> is only a generic fallback for glyphs Montserrat does not cover (e.g. CJK).
      </p>
      <code className="mt-3 block rounded-lg bg-muted p-4 text-sm [overflow-wrap:anywhere]">
        --font-sans: 'Montserrat', sans-serif;
      </code>
      <p className="mt-4 text-xl">The quick brown fox jumps over the lazy dog.</p>
      <p className="mt-1 text-base italic">The quick brown fox jumps over the lazy dog.</p>
    </div>

    <div className="border-t pt-8">
      <SectionTitle>Type scale</SectionTitle>
      <p className="mb-2 max-w-[720px] text-sm leading-5 text-muted-foreground">
        The complete Tailwind size scale. Ordinary product UI stays within <code>text-xs</code>–
        <code>text-2xl</code> through the roles below; larger sizes are reserved for hero, marketing, or
        empty-state display text.
      </p>
      <div className="divide-y">
        {typeScale.map(({ className, fontSize, lineHeight }) => (
          <div
            key={className}
            className="grid items-baseline gap-2 py-4 sm:grid-cols-[176px_minmax(0,1fr)] sm:gap-6"
          >
            <div className="flex flex-col gap-1">
              <code className="text-xs font-bold">{className}</code>
              <span className="text-xs text-muted-foreground">
                {fontSize} · lh {lineHeight}
              </span>
            </div>
            <p className={`${className} min-w-0 truncate`}>The quick brown fox</p>
          </div>
        ))}
      </div>
    </div>

    <div className="border-t pt-8">
      <SectionTitle>Type roles</SectionTitle>
      <p className="mb-2 max-w-[720px] text-sm leading-5 text-muted-foreground">
        Every role is rendered below with its own utility classes. Roles owned by a component
        (page title, dialog title, form label) come from that component in product code.
      </p>
      <div className="divide-y">
        {typographyContract.roles.map((role) => (
          <div
            key={role.role}
            className="grid items-baseline gap-2 py-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6"
          >
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs font-bold">{role.label}</span>
              <code className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{role.classes}</code>
            </div>
            <div>
              <p className={role.classes}>The quick brown fox jumps over the lazy dog.</p>
              <p className="mt-1 text-xs text-muted-foreground">{role.use}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="border-t pt-8">
      <SectionTitle>Font weights</SectionTitle>
      <p className="mb-4 max-w-[720px] text-sm leading-5 text-muted-foreground">
        Montserrat is loaded as a variable font, so every weight below comes from one file per subset.
      </p>
      <div className="flex flex-col gap-2">
        {fontWeights.map(({ label, className, value }) => (
          <p key={className} className={className}>
            {label} — {value} <code className="ml-1 text-xs text-muted-foreground">{className}</code>
          </p>
        ))}
      </div>
    </div>

    <div className="border-t pt-8">
      <SectionTitle>Semantic text colors</SectionTitle>
      <div className="flex flex-col gap-2">
        {textColors.map(({ className, use }) => (
          <p key={className} className={`text-sm ${className}`}>
            <code>{className}</code> — {use}
          </p>
        ))}
        <p className="text-sm text-foreground opacity-50">
          <code>opacity-50</code> — disabled content (paired with disabled semantics, not used alone)
        </p>
      </div>
    </div>
  </div>
);

const meta = {
  title: 'Foundations/Typography',
  component: TypographyOverview,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
> **Scope: Kiwi Design System.** ${typographyContract.summary}

## Font family

${typographyContract.fontFamily}

## Type roles

${typographyContract.roles
  .map(
    (role) =>
      `- **${role.label}** (\`${role.classes}\`)${'ownedBy' in role ? ` — owned by \`${role.ownedBy}\`` : ''}: ${role.use}`,
  )
  .join('\n')}

## Rules

${typographyContract.rules.map((item) => `- ${item}`).join('\n')}
        `,
      },
    },
  },
} satisfies Meta<typeof TypographyOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
