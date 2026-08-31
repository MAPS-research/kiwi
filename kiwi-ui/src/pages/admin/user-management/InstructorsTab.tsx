import * as React from "react";
import { AlertCircle, BookOpen, LoaderCircle, Pencil, RefreshCw, Save, Search, UserPlus, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import apiClient from "../../../utils/api.ts";
import { InstructorClassAssignmentInfo } from "../../../services/models/InstructorClassAssignmentInfo.ts";
import { InstructorPermissions } from "../../../services/models/InstructorPermissions.ts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiErrorMessage, classLabel } from "./lib.ts";
import type { UserDirectory } from "./useUserDirectory.ts";

const NO_PERMISSIONS: InstructorPermissions = {
  canManageMaterials: false,
  canViewAnalytics: false,
};

type PermissionFilter = "all" | "materials" | "analytics" | "none";

/** All instructor assignments, with class represented as row data rather than navigation. */
export type LoadInstructorAssignments = (
  classId: string
) => Promise<InstructorClassAssignmentInfo[]>;

export const InstructorsTab: React.FC<{
  directory: UserDirectory;
  loadInstructorAssignments?: LoadInstructorAssignments;
  viewControls?: React.ReactNode;
}> = ({ directory, loadInstructorAssignments, viewControls }) => {
  const { users, classes, isLoadingClasses, classesError, refetchClasses } = directory;

  const [assignmentsByClass, setAssignmentsByClass] = React.useState<
    Record<string, InstructorClassAssignmentInfo[]>
  >({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [failedClassIds, setFailedClassIds] = React.useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogClassId, setDialogClassId] = React.useState("");
  const [editingEmail, setEditingEmail] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [classFilter, setClassFilter] = React.useState("all");
  const [permissionFilter, setPermissionFilter] = React.useState<PermissionFilter>("all");

  const loadAssignments = React.useCallback(async () => {
    if (classes.length === 0) {
      setAssignmentsByClass({});
      setFailedClassIds(new Set());
      setLoadError("");
      return;
    }
    setIsLoading(true);
    setLoadError("");
    try {
      const results = await Promise.allSettled(
        classes.map(async (course) => {
          const assignments = loadInstructorAssignments
            ? await loadInstructorAssignments(course.id)
            : (
                await apiClient.instructorClassControllerListInstructorsForClass({
                  classId: course.id,
                })
              ).instructors || [];
          return [course.id, assignments] as const;
        })
      );
      const entries: Array<readonly [string, InstructorClassAssignmentInfo[]]> = [];
      const failed = new Set<string>();
      results.forEach((result, index) => {
        if (result.status === "fulfilled") entries.push(result.value);
        else failed.add(classes[index].id);
      });
      setAssignmentsByClass(Object.fromEntries(entries));
      setFailedClassIds(failed);
      if (failed.size > 0) {
        setLoadError(
          `Assignments could not be loaded for ${failed.size} ${failed.size === 1 ? "class" : "classes"}. Other classes remain available.`
        );
      }
    } catch (error) {
      setAssignmentsByClass({});
      setFailedClassIds(new Set(classes.map((course) => course.id)));
      setLoadError(await apiErrorMessage(error, "Failed to load instructor assignments"));
    } finally {
      setIsLoading(false);
    }
  }, [classes, loadInstructorAssignments]);

  React.useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const assignmentRows = React.useMemo(
    () =>
      classes.flatMap((course) =>
        (assignmentsByClass[course.id] || []).map((assignment) => ({
          ...assignment,
          classId: course.id,
          className: classLabel(course),
        }))
      ),
    [assignmentsByClass, classes]
  );

  const filteredAssignmentRows = React.useMemo(
    () =>
      assignmentRows.filter((assignment) => {
        const q = search.trim().toLowerCase();
        if (
          q &&
          !assignment.email.toLowerCase().includes(q) &&
          !assignment.className.toLowerCase().includes(q)
        )
          return false;
        if (classFilter !== "all" && assignment.classId !== classFilter) return false;

        const canManageMaterials = assignment.permissions?.canManageMaterials === true;
        const canViewAnalytics = assignment.permissions?.canViewAnalytics === true;
        if (permissionFilter === "materials" && !canManageMaterials) return false;
        if (permissionFilter === "analytics" && !canViewAnalytics) return false;
        if (permissionFilter === "none" && (canManageMaterials || canViewAnalytics)) return false;

        return true;
      }),
    [assignmentRows, search, classFilter, permissionFilter]
  );

  const hasFilters = search !== "" || classFilter !== "all" || permissionFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setClassFilter("all");
    setPermissionFilter("all");
  };

  const activeAssignments = assignmentsByClass[dialogClassId] || [];
  const instructorEmails = React.useMemo(() => {
    const assignedEmails = new Set(activeAssignments.map((assignment) => assignment.email));
    return users
      .filter(
        (user) =>
          !user.isPending &&
          user.systemRole === "instructor" &&
          !assignedEmails.has(user.email)
      )
      .map((user) => user.email);
  }, [activeAssignments, users]);

  const openAssign = () => {
    setDialogClassId("");
    setEditingEmail(null);
    setDialogOpen(true);
  };

  const openEdit = (classId: string, email: string) => {
    setDialogClassId(classId);
    setEditingEmail(email);
    setDialogOpen(true);
  };

  const selectedClass = classes.find((course) => course.id === dialogClassId);

  return (
    <div>
      {(classesError || loadError) && (
        <div
          role="alert"
          className="m-3 mb-0 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="font-medium text-destructive">
                {classesError ? "Classes could not be loaded" : "Assignments could not be loaded"}
              </p>
              <p className="mt-0.5 text-muted-foreground">{classesError || loadError}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 sm:ml-auto sm:min-h-9"
            onClick={classesError ? refetchClasses : loadAssignments}
            disabled={isLoadingClasses || isLoading}
          >
            <RefreshCw
              data-icon="inline-start"
              className={isLoadingClasses || isLoading ? "animate-spin" : ""}
            />
            Retry
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2 pb-3.5 sm:flex-row sm:items-center">
        {viewControls}
        <div className="relative w-full sm:ml-auto sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by instructor email"
            className="h-11 w-full pl-8 sm:h-9"
            aria-label="Search assignments"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={openAssign}
            disabled={classes.length === 0 || failedClassIds.size === classes.length}
            className="min-h-11 sm:min-h-9"
          >
            <UserPlus data-icon="inline-start" />
            Assign instructor
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pb-4">
        <Select
          value={classFilter}
          onValueChange={(value) => setClassFilter(value ?? "all")}
          items={{
            all: "Any class",
            ...Object.fromEntries(classes.map((course) => [course.id, classLabel(course)])),
          }}
        >
          <SelectTrigger
            size="sm"
            aria-label="Filter assignments by class"
            className={`min-h-11 flex-1 rounded-full bg-background px-3 sm:min-h-8 sm:flex-none ${classFilter === "all" ? "text-muted-foreground" : ""}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any class</SelectItem>
            {classes.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {classLabel(course)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={permissionFilter}
          onValueChange={(value) => setPermissionFilter((value ?? "all") as PermissionFilter)}
          items={{
            all: "Any permission",
            materials: "Manage materials",
            analytics: "View analytics",
            none: "No additional permissions",
          }}
        >
          <SelectTrigger
            size="sm"
            aria-label="Filter assignments by permission"
            className={`min-h-11 flex-1 rounded-full bg-background px-3 sm:min-h-8 sm:flex-none ${permissionFilter === "all" ? "text-muted-foreground" : ""}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any permission</SelectItem>
            <SelectItem value="materials">Manage materials</SelectItem>
            <SelectItem value="analytics">View analytics</SelectItem>
            <SelectItem value="none">No additional permissions</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="min-h-11 sm:min-h-8">
            <X data-icon="inline-start" />
            Reset
          </Button>
        )}
      </div>

      <div className="hidden overflow-hidden sm:block">
      <Table className="min-w-[760px]">
        <TableHeader className="bg-muted/50">
          <TableRow className="border-t border-border/50 hover:bg-transparent">
            <TableHead>Instructor</TableHead>
            <TableHead>Class</TableHead>
            <TableHead className="w-56">Permissions</TableHead>
            <TableHead className="w-32">Assigned</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={5}>
                  <Skeleton className="my-1 h-4 w-72" />
                </TableCell>
              </TableRow>
            ))}
          {!isLoading && filteredAssignmentRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                {classFilter !== "all" && failedClassIds.has(classFilter)
                  ? "Assignments are unavailable for this class. Retry loading to continue."
                  : hasFilters
                    ? "No assignments match these filters."
                    : "No instructor assignments yet."}
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            filteredAssignmentRows.map((assignment) => (
              <TableRow key={`${assignment.classId}-${assignment.userId}`} className="border-border/30">
                <TableCell>
                  <span className="text-sm font-medium">{assignment.email}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{assignment.className}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {[
                      assignment.permissions?.canManageMaterials ? "Materials" : null,
                      assignment.permissions?.canViewAnalytics ? "Analytics" : null,
                    ].filter(Boolean).join(" · ") || "None"}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${assignment.email} assignment for ${assignment.className}`}
                    onClick={() => openEdit(assignment.classId, assignment.email)}
                  >
                    <Pencil />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      </div>

      <div className="flex flex-col p-3 sm:hidden" aria-label="Instructor assignments">
        {isLoading &&
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border-b border-border/50 py-3 last:border-b-0">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-3 h-3 w-1/2" />
            </div>
          ))}
        {!isLoading && filteredAssignmentRows.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {classFilter !== "all" && failedClassIds.has(classFilter)
              ? "Assignments are unavailable for this class. Retry loading to continue."
              : hasFilters
                ? "No assignments match these filters."
                : "No instructor assignments yet."}
          </div>
        )}
        {!isLoading && filteredAssignmentRows.map((assignment) => (
          <article key={`${assignment.classId}-${assignment.userId}`} className="border-b border-border/50 py-3 last:border-b-0">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={assignment.email}>{assignment.email}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {assignment.className}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Assigned {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : "—"}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={`Edit ${assignment.email} assignment for ${assignment.className}`}
                className="size-11"
                onClick={() => openEdit(assignment.classId, assignment.email)}
              >
                <Pencil />
              </Button>
            </div>
            <p className="mt-3 rounded-lg bg-muted/25 px-3 py-2.5 text-sm text-muted-foreground">
              {[
                assignment.permissions?.canManageMaterials ? "Manage materials" : null,
                assignment.permissions?.canViewAnalytics ? "View analytics" : null,
              ].filter(Boolean).join(" · ") || "No additional permissions"}
            </p>
          </article>
        ))}
      </div>

      <AssignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        classId={dialogClassId}
        onClassIdChange={setDialogClassId}
        className={selectedClass ? classLabel(selectedClass) : ""}
        classes={classes}
        editingEmail={editingEmail}
        assignments={activeAssignments}
        instructorEmails={instructorEmails}
        unavailableClassIds={failedClassIds}
        onDone={loadAssignments}
      />
    </div>
  );
};

const AssignDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  onClassIdChange: (classId: string) => void;
  className: string;
  classes: UserDirectory["classes"];
  /** Non-null when editing an existing assignment's permissions. */
  editingEmail: string | null;
  assignments: InstructorClassAssignmentInfo[];
  instructorEmails: string[];
  unavailableClassIds: Set<string>;
  onDone: () => Promise<void>;
}> = ({
  open,
  onOpenChange,
  classId,
  onClassIdChange,
  className,
  classes,
  editingEmail,
  assignments,
  instructorEmails,
  unavailableClassIds,
  onDone,
}) => {
  const isEditing = editingEmail !== null;
  const [email, setEmail] = React.useState("");
  const [permissions, setPermissions] = React.useState<InstructorPermissions>(NO_PERMISSIONS);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const target = editingEmail ?? "";
    setEmail(target);
    const existing = assignments.find((a) => a.email === target);
    setPermissions(existing?.permissions ?? NO_PERMISSIONS);
  }, [open, editingEmail, assignments, classId]);

  const save = async () => {
    if (!classId) return toast.error("Select a class");
    if (!email) return toast.error("Select an instructor");
    setIsSaving(true);
    try {
      if (isEditing) {
        await apiClient.instructorClassControllerUpdateInstructorPermissions({
          updateInstructorPermissionsDto: { classId, userEmail: email, permissions },
        });
        toast.success(`Updated permissions for ${email}`);
      } else {
        await apiClient.instructorClassControllerAssignInstructorToClass({
          assignInstructorToClassDto: { classId, userEmail: email, permissions, role: "instructor" },
        });
        toast.success(`Assigned ${email} to ${className}`);
      }
      await onDone();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        await apiErrorMessage(
          error,
          isEditing ? "Failed to update permissions" : "Failed to assign instructor"
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md [&>[data-slot=dialog-close]]:top-3.5 [&>[data-slot=dialog-close]]:right-4">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-lg font-bold">
            {isEditing ? "Edit permissions" : "Assign instructor"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `${editingEmail} · ${className}`
              : "Choose the class and instructor for this assignment."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-4">
        {!isEditing && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assignment-class">Class</Label>
              <Select
                value={classId}
                onValueChange={(value) => onClassIdChange(value ?? "")}
                items={Object.fromEntries(classes.map((course) => [course.id, classLabel(course)]))}
              >
                <SelectTrigger id="assignment-class" className="min-h-11 w-full sm:min-h-8">
                  <BookOpen className="size-4 text-muted-foreground" />
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((course) => (
                    <SelectItem
                      key={course.id}
                      value={course.id}
                      disabled={unavailableClassIds.has(course.id)}
                    >
                      {classLabel(course)}
                      {unavailableClassIds.has(course.id) ? " (assignments unavailable)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assignment-instructor">Instructor</Label>
              <Select
                value={email}
                onValueChange={(value) => setEmail(value ?? "")}
                disabled={!classId}
              >
                <SelectTrigger id="assignment-instructor" className="min-h-11 w-full sm:min-h-8">
                  <UserRound className="size-4 text-muted-foreground" />
                  <SelectValue placeholder={classId ? "Select an instructor" : "Select a class first"} />
                </SelectTrigger>
                <SelectContent>
                  {instructorEmails.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No available users have the instructor role.
                    </div>
                  ) : (
                    instructorEmails.map((instructorEmail) => (
                      <SelectItem key={instructorEmail} value={instructorEmail}>
                        {instructorEmail}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium">Permissions</legend>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-muted/60">
            <Checkbox
              checked={permissions.canManageMaterials}
              onCheckedChange={(checked) =>
                setPermissions((p) => ({ ...p, canManageMaterials: checked === true }))
              }
            />
            Manage materials
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-muted/60">
            <Checkbox
              checked={permissions.canViewAnalytics}
              onCheckedChange={(checked) =>
                setPermissions((p) => ({ ...p, canViewAnalytics: checked === true }))
              }
            />
            View analytics
          </label>
        </fieldset>
        </div>

        <DialogFooter className="m-0 rounded-b-xl border-t bg-transparent px-5 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-11 sm:min-h-8">
            Cancel
          </Button>
          <Button onClick={save} disabled={isSaving || !classId || !email} className="min-h-11 sm:min-h-8">
            {isSaving ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : isEditing ? (
              <Save data-icon="inline-start" />
            ) : (
              <UserPlus data-icon="inline-start" />
            )}
            {isEditing ? "Save permissions" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
