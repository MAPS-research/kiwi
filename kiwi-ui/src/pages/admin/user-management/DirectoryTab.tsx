import * as React from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  KeyRound,
  ListFilter,
  LoaderCircle,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ChangeRoleDtoRoleEnum } from "../../../services/models/ChangeRoleDto.ts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { downloadCsv, type UserEntry } from "./lib.ts";
import type { UserDirectory } from "./useUserDirectory.ts";

const ROLES = [
  ChangeRoleDtoRoleEnum.User,
  ChangeRoleDtoRoleEnum.Instructor,
  ChangeRoleDtoRoleEnum.Admin,
];

const PAGE_SIZES = [10, 25, 50];

type SortDir = "recent" | "asc" | "desc";

export const DirectoryTab: React.FC<{
  directory: UserDirectory;
  viewControls?: React.ReactNode;
  onAddUsers?: () => void;
}> = ({ directory, viewControls, onAddUsers }) => {
  const {
    users,
    isLoadingUsers,
    usersError,
    refetchUsers,
    setAccess,
    changeRole,
    resetPassword,
    isActionPending,
  } = directory;

  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [accessFilter, setAccessFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sortDir, setSortDir] = React.useState<SortDir>("recent");
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [isBulkWorking, setIsBulkWorking] = React.useState(false);
  const [resetTarget, setResetTarget] = React.useState<UserEntry | null>(null);

  const filtered = React.useMemo(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.email.toLowerCase().includes(q));
    }
    if (roleFilter !== "all") list = list.filter((u) => u.systemRole === roleFilter);
    if (accessFilter !== "all") list = list.filter((u) => u.status === accessFilter);
    if (statusFilter !== "all")
      list = list.filter((u) => (statusFilter === "pending" ? u.isPending : !u.isPending));
    const sorted = [...list];
    if (sortDir === "recent") {
      sorted.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0) || a.email.localeCompare(b.email));
    } else {
      sorted.sort((a, b) =>
        sortDir === "asc" ? a.email.localeCompare(b.email) : b.email.localeCompare(a.email)
      );
    }
    return sorted;
  }, [users, search, roleFilter, accessFilter, statusFilter, sortDir]);

  React.useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [search, roleFilter, accessFilter, statusFilter, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const hasFilters =
    search !== "" || roleFilter !== "all" || accessFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setAccessFilter("all");
    setStatusFilter("all");
  };

  const pageIds = pageRows.map((u) => u.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkSetAccess = async (status: "enabled" | "disabled") => {
    const targets = users.filter((u) => selected.has(u.id) && u.status !== status);
    if (targets.length === 0) {
      setSelected(new Set());
      return;
    }
    setIsBulkWorking(true);
    let ok = 0;
    for (const entry of targets) {
      if (await setAccess(entry, status, { silent: true })) ok += 1;
    }
    setIsBulkWorking(false);
    setSelected(new Set());
    const message = `${status === "enabled" ? "Enabled" : "Disabled"} access for ${ok} of ${targets.length} users`;
    if (ok === targets.length) toast.success(message);
    else toast.error(message, { description: "Some updates failed. Review the selected accounts and try again." });
  };

  const exportCsv = () => {
    downloadCsv(
      `users_${new Date().toISOString().split("T")[0]}.csv`,
      ["Email", "Role", "Access", "Account", "Sign-in", "Consent"],
      filtered.map((u) => [
        u.email,
        u.systemRole,
        u.status,
        u.isPending ? "pending signup" : "registered",
        u.oauth ? "google" : "password",
        u.consent ? "yes" : "no",
      ])
    );
  };

  const cycleSort = () =>
    setSortDir((d) => (d === "recent" ? "asc" : d === "asc" ? "desc" : "recent"));

  return (
    <div>
      {usersError && (
        <div
          role="alert"
          className="m-3 mb-0 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="font-medium text-destructive">User directory could not be loaded</p>
              <p className="mt-0.5 text-muted-foreground">{usersError}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchUsers}
            disabled={isLoadingUsers}
            className="min-h-11 sm:ml-auto sm:min-h-9"
          >
            <RefreshCw data-icon="inline-start" className={isLoadingUsers ? "animate-spin" : ""} />
            Retry
          </Button>
        </div>
      )}

      {/* Flat workspace toolbar, aligned with the reference's primary action row. */}
      <div>
        <div className="flex flex-col gap-2 pt-2 pb-3.5 sm:flex-row sm:items-center">
          {viewControls}
          <div className="relative w-full sm:ml-auto sm:max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by email"
              className="h-11 w-full pl-8 sm:h-9"
              aria-label="Search users"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="min-h-11 sm:min-h-9"
            >
              <Download data-icon="inline-start" />
              Export CSV
            </Button>
            {onAddUsers && (
              <Button onClick={onAddUsers} className="min-h-11 sm:min-h-9">
                <UserPlus data-icon="inline-start" />
                Add user
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-4">
          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v ?? "all")}
            items={{ all: "Any role", user: "User", instructor: "Instructor", admin: "Admin" }}
          >
            <SelectTrigger
              size="sm"
              aria-label="Filter by role"
              className={`min-h-11 flex-1 rounded-full bg-background px-3 sm:min-h-8 sm:flex-none ${roleFilter === "all" ? "text-muted-foreground" : ""}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any role</SelectItem>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={accessFilter}
            onValueChange={(v) => setAccessFilter(v ?? "all")}
            items={{ all: "Any access", enabled: "Enabled", disabled: "Disabled" }}
          >
            <SelectTrigger
              size="sm"
              aria-label="Filter by access"
              className={`min-h-11 flex-1 rounded-full bg-background px-3 sm:min-h-8 sm:flex-none ${accessFilter === "all" ? "text-muted-foreground" : ""}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any access</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v ?? "all")}
            items={{ all: "Any account", registered: "Registered", pending: "Pending signup" }}
          >
            <SelectTrigger
              size="sm"
              aria-label="Filter by account status"
              className={`min-h-11 flex-1 rounded-full bg-background px-3 sm:min-h-8 sm:flex-none ${statusFilter === "all" ? "text-muted-foreground" : ""}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any account</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="pending">Pending signup</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="min-h-11 sm:min-h-8">
              <X data-icon="inline-start" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Desktop directory table */}
      <div className="hidden overflow-hidden md:block">
      <Table className="min-w-[760px]">
        <TableHeader className="bg-muted/50">
          <TableRow className="border-t border-border/50 hover:bg-transparent">
            <TableHead className="w-8">
              <Checkbox
                checked={allPageSelected}
                onCheckedChange={toggleAllOnPage}
                aria-label="Select page"
              />
            </TableHead>
            <TableHead
              aria-sort={sortDir === "asc" ? "ascending" : sortDir === "desc" ? "descending" : "none"}
            >
              <button
                type="button"
                onClick={cycleSort}
                className="inline-flex cursor-pointer items-center gap-1 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                User
                {sortDir === "asc" && <ArrowUp className="size-3" />}
                {sortDir === "desc" && <ArrowDown className="size-3" />}
                {sortDir === "recent" && <ListFilter className="size-3 opacity-40" />}
              </button>
            </TableHead>
            <TableHead className="w-36">Role</TableHead>
            <TableHead className="w-32">Access</TableHead>
            <TableHead className="hidden w-28 xl:table-cell">Sign-in</TableHead>
            <TableHead className="hidden w-20 xl:table-cell">Consent</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoadingUsers &&
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={7}>
                  <div className="flex items-center gap-3 py-1">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="ml-auto h-4 w-24" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          {!isLoadingUsers && pageRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                {hasFilters ? (
                  <div className="flex flex-col items-center gap-2">
                    <span>No users match the current filters.</span>
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Reset filters
                    </Button>
                  </div>
                ) : (
                  "No users yet. Add users to get started."
                )}
              </TableCell>
            </TableRow>
          )}
          {!isLoadingUsers &&
            pageRows.map((entry) => (
              <DirectoryRow
                key={entry.id}
                entry={entry}
                isSelected={selected.has(entry.id)}
                onToggleSelect={() => toggleRow(entry.id)}
                onSetAccess={setAccess}
                onChangeRole={changeRole}
                onRequestPasswordReset={setResetTarget}
                isActionPending={isActionPending}
              />
            ))}
        </TableBody>
      </Table>
      </div>

      <div className="flex flex-col p-3 md:hidden" aria-label="User directory">
        {isLoadingUsers &&
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="border-b border-border/50 py-3 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        {!isLoadingUsers && pageRows.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <p>{hasFilters ? "No users match the current filters." : "No users yet. Add users to get started."}</p>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3 min-h-11">
                Reset filters
              </Button>
            )}
          </div>
        )}
        {!isLoadingUsers &&
          pageRows.map((entry) => (
            <DirectoryCard
              key={entry.id}
              entry={entry}
              isSelected={selected.has(entry.id)}
              onToggleSelect={() => toggleRow(entry.id)}
              onSetAccess={setAccess}
              onChangeRole={changeRole}
              onRequestPasswordReset={setResetTarget}
              isActionPending={isActionPending}
            />
          ))}
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <span className="text-xs text-muted-foreground">
          {filtered.length === 0
            ? "0 users"
            : `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, filtered.length)} of ${filtered.length}`}
        </span>
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v ?? 10))}
            items={Object.fromEntries(PAGE_SIZES.map((n) => [String(n), `${n} / page`]))}
          >
            <SelectTrigger size="sm" aria-label="Users per page" className="min-h-11 text-muted-foreground sm:min-h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={currentPage === 0}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
            className="size-11 sm:size-9"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
            className="size-11 sm:size-9"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-3 bottom-3 z-40 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-popover px-3 py-2 shadow-lg sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:flex-nowrap">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button
            variant="outline"
            size="sm"
            disabled={isBulkWorking}
            onClick={() => bulkSetAccess("enabled")}
            className="min-h-11 sm:min-h-9"
          >
            <ShieldCheck data-icon="inline-start" />
            Enable access
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isBulkWorking}
            onClick={() => bulkSetAccess("disabled")}
            className="min-h-11 sm:min-h-9"
          >
            Disable access
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSelected(new Set())}
            aria-label="Clear selection"
            className="size-11 sm:size-9"
          >
            <X />
          </Button>
        </div>
      )}

      <PasswordResetDialog
        entry={resetTarget}
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
        onConfirm={async () => {
          if (!resetTarget) return;
          await resetPassword(resetTarget);
          setResetTarget(null);
        }}
        isWorking={resetTarget ? isActionPending("password", resetTarget.id) : false}
      />
    </div>
  );
};

const DirectoryRow: React.FC<{
  entry: UserEntry;
  isSelected: boolean;
  onToggleSelect: () => void;
  onSetAccess: (entry: UserEntry, status: "enabled" | "disabled") => Promise<boolean>;
  onChangeRole: (entry: UserEntry, role: ChangeRoleDtoRoleEnum) => Promise<void>;
  onRequestPasswordReset: (entry: UserEntry) => void;
  isActionPending: (action: "access" | "role" | "password", id: string) => boolean;
}> = ({
  entry,
  isSelected,
  onToggleSelect,
  onSetAccess,
  onChangeRole,
  onRequestPasswordReset,
  isActionPending,
}) => (
  <TableRow className="group/row border-border/30" data-state={isSelected ? "selected" : undefined}>
    <TableCell>
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        aria-label={`Select ${entry.email}`}
      />
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{entry.email}</span>
        {entry.isPending && (
          <Badge variant="outline" className="font-normal text-muted-foreground">Pending</Badge>
        )}
      </div>
    </TableCell>
    <TableCell>
      {entry.isPending ? (
        <span className="text-sm text-muted-foreground">—</span>
      ) : (
        <Select
          value={entry.systemRole}
          onValueChange={(v) => {
            if (v && v !== entry.systemRole) onChangeRole(entry, v as ChangeRoleDtoRoleEnum);
          }}
        >
          <SelectTrigger
            size="sm"
            className="-ml-2 border-0 bg-transparent pl-2 shadow-none hover:bg-muted/40 focus-visible:shadow-[inset_0_0_0_2px_var(--primary)] aria-expanded:shadow-[inset_0_0_0_2px_var(--primary)]"
            aria-label={`Role for ${entry.email}`}
            disabled={isActionPending("role", entry.id)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-2">
        <Switch
          size="sm"
          checked={entry.status === "enabled"}
          onCheckedChange={(checked) => onSetAccess(entry, checked ? "enabled" : "disabled")}
          aria-label={`Access for ${entry.email}`}
          disabled={isActionPending("access", entry.id)}
        />
        <span className="text-sm text-muted-foreground">
          {entry.status === "enabled" ? "Enabled" : "Disabled"}
        </span>
      </div>
    </TableCell>
    <TableCell className="hidden xl:table-cell">
      <span className="text-sm text-muted-foreground">
        {entry.oauth ? "Google" : "Password"}
      </span>
    </TableCell>
    <TableCell className="hidden xl:table-cell">
      <span className="text-sm text-muted-foreground">{entry.consent ? "Yes" : "No"}</span>
    </TableCell>
    <TableCell>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${entry.email}`}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="max-w-56 truncate">{entry.email}</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(entry.email);
              toast.success("Email copied");
            }}
          >
            <Copy /> Copy email
          </DropdownMenuItem>
          {entry.oauth || entry.isPending ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span>
                    <DropdownMenuItem disabled>
                      <KeyRound /> Reset password
                    </DropdownMenuItem>
                  </span>
                }
              />
              <TooltipContent side="left">
                {entry.isPending
                  ? "No account registered yet"
                  : "Google sign-in accounts have no password"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenuItem onClick={() => onRequestPasswordReset(entry)}>
              <KeyRound /> Reset password
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant={entry.status === "enabled" ? "destructive" : undefined}
            onClick={() => onSetAccess(entry, entry.status === "enabled" ? "disabled" : "enabled")}
          >
            {entry.status === "enabled" ? <ShieldOff /> : <ShieldCheck />}{" "}
            {entry.status === "enabled" ? "Disable access" : "Enable access"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TableCell>
  </TableRow>
);

const DirectoryCard: React.FC<{
  entry: UserEntry;
  isSelected: boolean;
  onToggleSelect: () => void;
  onSetAccess: (entry: UserEntry, status: "enabled" | "disabled") => Promise<boolean>;
  onChangeRole: (entry: UserEntry, role: ChangeRoleDtoRoleEnum) => Promise<void>;
  onRequestPasswordReset: (entry: UserEntry) => void;
  isActionPending: (action: "access" | "role" | "password", id: string) => boolean;
}> = ({
  entry,
  isSelected,
  onToggleSelect,
  onSetAccess,
  onChangeRole,
  onRequestPasswordReset,
  isActionPending,
}) => (
  <article
    className="border-b border-border/50 py-3 last:border-b-0"
    data-selected={isSelected}
  >
    <div className="flex items-start gap-3">
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        aria-label={`Select ${entry.email}`}
        className="mt-1 after:-inset-y-[14px]"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={entry.email}>{entry.email}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {entry.isPending ? "Pending signup" : "Registered"}
          {` · ${entry.oauth ? "Google sign-in" : "Password sign-in"}`}
          {entry.consent ? " · Consent recorded" : ""}
        </p>
      </div>
    </div>

    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 rounded-lg bg-muted/25 p-3">
      <div>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Role</span>
        {entry.isPending ? (
          <span className="block min-h-11 py-2.5 text-sm text-muted-foreground">Available after registration</span>
        ) : (
          <Select
            value={entry.systemRole}
            onValueChange={(value) => {
              if (value && value !== entry.systemRole) {
                onChangeRole(entry, value as ChangeRoleDtoRoleEnum);
              }
            }}
          >
            <SelectTrigger
              aria-label={`Role for ${entry.email}`}
              disabled={isActionPending("role", entry.id)}
              className="min-h-11 w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div>
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Access</span>
        <div className="flex min-h-11 items-center gap-2">
          <Switch
            checked={entry.status === "enabled"}
            onCheckedChange={(checked) => onSetAccess(entry, checked ? "enabled" : "disabled")}
            aria-label={`Access for ${entry.email}`}
            disabled={isActionPending("access", entry.id)}
            className="after:-inset-y-[13px]"
          />
          <span className="text-xs text-muted-foreground">
            {isActionPending("access", entry.id)
              ? "Saving…"
              : entry.status === "enabled" ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>
    </div>

    <div className="mt-2 flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="min-h-11"
        onClick={() => {
          navigator.clipboard.writeText(entry.email);
          toast.success("Email copied");
        }}
      >
        <Copy data-icon="inline-start" /> Copy email
      </Button>
      {!entry.oauth && !entry.isPending && (
        <Button
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={() => onRequestPasswordReset(entry)}
          disabled={isActionPending("password", entry.id)}
        >
          <KeyRound data-icon="inline-start" /> Reset password
        </Button>
      )}
    </div>
  </article>
);

const PasswordResetDialog: React.FC<{
  entry: UserEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isWorking: boolean;
}> = ({ entry, open, onOpenChange, onConfirm, isWorking }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="gap-0 p-0 sm:max-w-md [&>[data-slot=dialog-close]]:top-3.5 [&>[data-slot=dialog-close]]:right-4">
      <DialogHeader className="border-b px-5 py-4">
        <DialogTitle className="text-lg font-bold">Reset password?</DialogTitle>
        <DialogDescription>
          This immediately replaces the current password for {entry?.email}. The new password is
          shown once in a notification so you can copy it securely.
        </DialogDescription>
      </DialogHeader>
      <div className="px-5 py-4">
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
          The user will not be able to sign in with their previous password after this action.
        </div>
      </div>
      <DialogFooter className="m-0 rounded-b-xl border-t bg-transparent px-5 py-4">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isWorking}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isWorking}>
          {isWorking ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <KeyRound data-icon="inline-start" />
          )}
          Reset password
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
