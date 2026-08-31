import type { ReactNode } from 'react';

export interface QualityRuleBlockProps {
  contract: readonly ReactNode[];
  visualLabel: string;
  children: ReactNode;
}

export const QualityRuleBlock = ({ contract, visualLabel, children }: QualityRuleBlockProps) => {
  const contractId = `${visualLabel.replace(/\s+/g, '-').toLowerCase()}-contract`;

  return (
    <section className="sb-unstyled my-5 grid max-w-full items-stretch gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
      <section
        data-ai-contract="true"
        aria-labelledby={contractId}
        className="min-w-0 rounded-xl border bg-card p-4 sm:p-5"
      >
        <h3 id={contractId} className="text-xs font-bold tracking-[0.08em] text-primary uppercase">
          AI contract
        </h3>
        <ul className="mt-3 mb-0 flex list-disc flex-col gap-2 pl-5">
          {contract.map((item, index) => (
            <li key={index} className="text-sm leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <figure aria-label={visualLabel} className="m-0 min-w-0 rounded-xl border bg-background p-4 sm:p-5">
        <figcaption className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
          Human visual example
        </figcaption>
        <div className="mt-3">{children}</div>
      </figure>
    </section>
  );
};

const Surface = ({ children, label }: { children: ReactNode; label: string }) => (
  <div aria-label={label} className="min-w-0 overflow-hidden rounded-lg border bg-card">
    <div className="border-b bg-muted/60 px-3 py-1.5">
      <span className="text-xs font-bold">{label}</span>
    </div>
    {children}
  </div>
);

const SkeletonLine = ({ width = '100%', height = 10 }: { width?: string; height?: number }) => (
  <div
    aria-hidden="true"
    className="shrink-0 rounded-full bg-muted-foreground/20"
    style={{ width, height }}
  />
);

const DataRow = ({ label, value }: { label: string; value: string }) => (
  <div className="grid min-w-0 items-center gap-2 [grid-template-columns:minmax(58px,0.8fr)_minmax(64px,1fr)]">
    <span className="truncate text-xs text-muted-foreground">{label}</span>
    <span className="text-xs font-bold [overflow-wrap:anywhere]">{value}</span>
  </div>
);

export const AccessibilityExample = () => (
  <div aria-label="Accessible field states" className="flex flex-col gap-3">
    <label className="text-xs font-bold">Workspace name</label>
    <div className="rounded-md border-2 border-primary px-3 py-2 outline-solid outline-2 outline-offset-2 outline-primary/25">
      <span className="text-sm">Kiwi Analytics</span>
    </div>
    <p className="text-xs text-muted-foreground">
      Visible label and focus indicator; the control keeps a stable accessible name.
    </p>
    <div
      role="alert"
      className="grid items-start gap-2 rounded-md bg-destructive/10 p-2 text-destructive [grid-template-columns:20px_1fr]"
    >
      <span aria-hidden="true" className="text-xs font-black">
        !
      </span>
      <span className="text-xs">Name is required. Error is conveyed with text, not color alone.</span>
    </div>
  </div>
);

export const AsyncStateExample = () => (
  <div className="grid gap-3 sm:grid-cols-3">
    <Surface label="Weak network · Loading">
      <div className="flex min-h-33 flex-col gap-3 p-3">
        <SkeletonLine width="58%" height={14} />
        <SkeletonLine />
        <SkeletonLine width="86%" />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <SkeletonLine height={36} />
          <SkeletonLine height={36} />
        </div>
      </div>
    </Surface>
    <Surface label="Settled · Same geometry">
      <div className="flex min-h-33 flex-col gap-3 p-3">
        <span className="text-sm leading-3.5 font-semibold">Usage summary</span>
        <DataRow label="Requests" value="12,480" />
        <DataRow label="Success" value="99.4%" />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="h-9 rounded-md bg-muted" />
          <div className="h-9 rounded-md bg-muted" />
        </div>
      </div>
    </Surface>
    <Surface label="Offline · Recovery">
      <div className="flex min-h-33 flex-col justify-center gap-2 p-3">
        <span className="text-sm font-semibold">Couldn’t load usage</span>
        <span className="text-xs text-muted-foreground">
          Check your connection. Your previous filters are preserved.
        </span>
        <span className="self-start rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
          Retry
        </span>
      </div>
    </Surface>
  </div>
);

const ViewportFrame = ({ label, columns }: { label: string; columns: string }) => (
  <Surface label={label}>
    <div className="grid min-h-28 gap-2 p-2" style={{ gridTemplateColumns: columns }}>
      <div className="min-h-7 rounded-md bg-primary/10" />
      <div className="flex min-w-0 flex-col gap-2">
        <SkeletonLine width="65%" height={11} />
        <SkeletonLine />
        <SkeletonLine width="82%" />
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: columns === '1fr' ? '1fr' : '1fr 1fr' }}
        >
          <div className="h-8.5 rounded-md bg-muted" />
          <div className="h-8.5 rounded-md bg-muted" />
        </div>
      </div>
    </div>
  </Surface>
);

export const ViewportExample = () => (
  <div className="grid gap-3 sm:grid-cols-3">
    <ViewportFrame label="390 px · stacked" columns="1fr" />
    <ViewportFrame label="768 px · adaptive" columns="0.7fr 1.3fr" />
    <ViewportFrame label="1440 px · bounded" columns="0.55fr 1.45fr" />
  </div>
);

const densityTones = {
  warning: 'border-amber-600/50 bg-amber-600/5',
  success: 'border-green-700/50 bg-green-700/5',
};

const DensityCard = ({
  label,
  rows,
  gap,
  tone,
}: {
  label: string;
  rows: number;
  gap: number;
  tone: 'warning' | 'success';
}) => (
  <div className={`min-w-0 rounded-lg border p-3 ${densityTones[tone]}`}>
    <span className="mb-2 block text-xs font-bold">{label}</span>
    <div className="flex flex-col" style={{ gap }}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="grid gap-2 [grid-template-columns:34%_1fr]">
          <SkeletonLine height={7} />
          <SkeletonLine width={index % 2 ? '72%' : '100%'} height={7} />
        </div>
      ))}
    </div>
  </div>
);

export const DensityExample = () => (
  <div className="grid gap-3 sm:grid-cols-3">
    <DensityCard label="Too sparse" rows={3} gap={22} tone="warning" />
    <DensityCard label="Balanced" rows={6} gap={9} tone="success" />
    <DensityCard label="Too dense" rows={10} gap={2} tone="warning" />
  </div>
);

const FieldList = ({ expanded }: { expanded: boolean }) => {
  const rows = expanded
    ? [
        ['Status', 'Active'],
        ['Owner', 'Operations'],
        ['Region', 'Asia Pacific'],
        ['Plan', 'Enterprise'],
        ['Created', '13 Aug 2026'],
        ['Renewal', '30 Sep 2026'],
        ['Seats', '128'],
      ]
    : [
        ['Status', 'Active'],
        ['Owner', 'Operations'],
        ['Region', 'Asia Pacific'],
      ];

  return (
    <Surface label={expanded ? 'Future · 7 fields · scroll' : 'Today · 3 fields'}>
      <div
        tabIndex={expanded ? 0 : undefined}
        aria-label={expanded ? 'Scrollable details region' : 'Details region'}
        className={`flex h-29.5 flex-col gap-2 p-3 [scrollbar-gutter:stable] [scrollbar-width:thin] -outline-offset-2 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-primary ${
          expanded ? 'overflow-y-auto' : 'overflow-y-hidden'
        }`}
      >
        {rows.map(([label, value]) => (
          <DataRow key={label} label={label} value={value} />
        ))}
      </div>
      <div className="border-t px-3 py-2">
        <span className="text-xs font-bold">Stable action area</span>
      </div>
    </Surface>
  );
};

export const FieldGrowthExample = () => (
  <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]">
    <FieldList expanded={false} />
    <FieldList expanded />
  </div>
);
