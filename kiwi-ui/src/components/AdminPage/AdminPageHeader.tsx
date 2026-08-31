import type { ComponentProps, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AdminPageHeaderBackAction {
  label: string;
  onClick: () => void;
}

export interface AdminPageHeaderProps
  extends Omit<ComponentProps<"header">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  back?: AdminPageHeaderBackAction;
  status?: ReactNode;
  actions?: ReactNode;
}

const AdminPageHeader = ({
  title,
  description,
  back,
  status,
  actions,
  className,
  ...props
}: AdminPageHeaderProps) => (
  <header
    {...props}
    data-slot="admin-page-header"
    className={cn(
      "mb-6 flex flex-col items-stretch justify-between gap-4 md:mb-8 md:flex-row md:items-start md:gap-6",
      className,
    )}
  >
    <div className="flex w-full min-w-0 items-start gap-2 sm:gap-3 md:w-auto">
      {back && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Back to ${back.label}`}
          onClick={back.onClick}
          className="mt-0.5"
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1
            data-slot="admin-page-header-title"
            className="text-2xl leading-[1.3] font-semibold tracking-[-0.02em] [overflow-wrap:anywhere]"
          >
            {title}
          </h1>
          {status && (
            <div data-slot="admin-page-header-status" className="contents">
              {status}
            </div>
          )}
        </div>

        {description && (
          <div
            data-slot="admin-page-header-description"
            className="mt-1 max-w-[720px] text-sm leading-5 text-muted-foreground [overflow-wrap:anywhere]"
          >
            {description}
          </div>
        )}
      </div>
    </div>

    {actions && (
      <div
        data-slot="admin-page-header-actions"
        className={cn(
          "flex w-full shrink flex-wrap items-center justify-start gap-2 md:w-auto md:shrink-0 md:justify-end",
          "[&>[data-slot=button]]:flex-[1_1_140px] md:[&>[data-slot=button]]:flex-none",
          "[&>[data-slot=badge]]:flex-[1_1_140px] md:[&>[data-slot=badge]]:flex-none",
          "[&>.MuiButton-root]:flex-[1_1_140px] md:[&>.MuiButton-root]:flex-none",
          "[&>.MuiBadge-root]:flex-[1_1_140px] md:[&>.MuiBadge-root]:flex-none",
          "[&>.MuiBadge-root>.MuiButton-root]:w-full md:[&>.MuiBadge-root>.MuiButton-root]:w-auto",
        )}
      >
        {actions}
      </div>
    )}
  </header>
);

export default AdminPageHeader;
