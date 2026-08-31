import { useId, type ReactNode } from 'react';

export interface DoAvoidProps {
  doItems: readonly ReactNode[];
  avoidItems: readonly ReactNode[];
  doTitle?: string;
  avoidTitle?: string;
  headingLevel?: 'h2' | 'h3' | 'h4';
  ariaLabel?: string;
}

interface GuidancePanelProps {
  title: string;
  titleId: string;
  items: readonly ReactNode[];
  tone: 'do' | 'avoid';
  headingLevel: NonNullable<DoAvoidProps['headingLevel']>;
}

const toneClasses = {
  do: 'border-green-700/40 border-l-green-700 bg-green-700/5',
  avoid: 'border-amber-600/40 border-l-amber-600 bg-amber-600/5',
};

const GuidancePanel = ({ title, titleId, items, tone, headingLevel }: GuidancePanelProps) => {
  const Heading = headingLevel;

  return (
    <section
      aria-labelledby={titleId}
      className={`min-w-0 rounded-xl border border-l-4 p-4 sm:p-5 ${toneClasses[tone]}`}
    >
      <Heading id={titleId} className="mb-2.5 text-sm font-bold text-foreground">
        {title}
      </Heading>
      <ul className="my-0 flex list-disc flex-col gap-2 pl-5">
        {items.map((item, index) => (
          <li key={index} className="text-sm leading-relaxed [overflow-wrap:anywhere]">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
};

export const DoAvoid = ({
  doItems,
  avoidItems,
  doTitle = 'Do',
  avoidTitle = 'Avoid',
  headingLevel = 'h3',
  ariaLabel = 'Do and avoid guidance',
}: DoAvoidProps) => {
  const id = useId();

  return (
    <section
      aria-label={ariaLabel}
      className="sb-unstyled grid max-w-full items-stretch gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]"
    >
      <GuidancePanel
        title={doTitle}
        titleId={`${id}-do`}
        items={doItems}
        tone="do"
        headingLevel={headingLevel}
      />
      <GuidancePanel
        title={avoidTitle}
        titleId={`${id}-avoid`}
        items={avoidItems}
        tone="avoid"
        headingLevel={headingLevel}
      />
    </section>
  );
};
