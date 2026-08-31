import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AdminPageMaxWidth = "xs" | "sm" | "md" | "lg" | "xl" | false;

const maxWidthClasses: Record<Exclude<AdminPageMaxWidth, false>, string> = {
  xs: "max-w-[444px]",
  sm: "max-w-[600px]",
  md: "max-w-[900px]",
  lg: "max-w-[1200px]",
  xl: "max-w-[1536px]",
};

export interface AdminPageProps extends Omit<ComponentProps<"div">, "children"> {
  children: ReactNode;
  maxWidth?: AdminPageMaxWidth;
}

const AdminPage = ({
  children,
  className,
  maxWidth = "lg",
  ...props
}: AdminPageProps) => (
  <div
    {...props}
    data-slot="admin-page"
    className={cn(
      "mx-auto w-full px-4 pt-4 pb-8 md:px-6 md:pt-6",
      maxWidth === false ? "max-w-none" : maxWidthClasses[maxWidth],
      className,
    )}
  >
    {children}
  </div>
);

export default AdminPage;
