import * as React from "react";
import { GraduationCap, Users } from "lucide-react";
import { AdminPage, AdminPageHeader } from "../../components/AdminPage/index.ts";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AddUsersDialog } from "./user-management/AddUsersDialog.tsx";
import { DirectoryTab } from "./user-management/DirectoryTab.tsx";
import {
  InstructorsTab,
  type LoadInstructorAssignments,
} from "./user-management/InstructorsTab.tsx";
import {
  useUserDirectory,
  type UserDirectory,
} from "./user-management/useUserDirectory.ts";

// Re-exported so existing regression tests (issue #174) keep their import path.
export { isSsoDomainEmail } from "./user-management/lib.ts";

/**
 * Admin user management: a compact account directory and per-class instructor
 * assignments, presented in the same outlined work surface as other admin pages.
 */
export const UserManagementView: React.FC<{
  directory: UserDirectory;
  loadInstructorAssignments?: LoadInstructorAssignments;
}> = ({ directory, loadInstructorAssignments }) => {
  const [addOpen, setAddOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("directory");

  // Rendered inside whichever panel is mounted; Base UI only mounts the active
  // one, so the trigger ids never coexist in the DOM.
  const viewControls = (
    <TabsList
      variant="line"
      aria-label="User management sections"
      className="h-9 w-full justify-start gap-3 sm:w-auto"
    >
      <TabsTrigger id="user-directory-tab" value="directory" className="flex-none px-2.5">
        <Users data-icon="inline-start" />
        Users
      </TabsTrigger>
      <TabsTrigger id="instructor-assignments-tab" value="instructors" className="flex-none px-2.5">
        <GraduationCap data-icon="inline-start" />
        Assignments
      </TabsTrigger>
    </TabsList>
  );

  return (
    <TooltipProvider>
      <AdminPage>
        <AdminPageHeader
          title="User Management"
          description="Manage team members, account access, and instructor assignments."
        />

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as string)}
          className="gap-0"
        >
          <TabsContent
            value="directory"
            id="user-directory-panel"
            aria-labelledby="user-directory-tab"
            className="m-0"
          >
            <DirectoryTab
              directory={directory}
              onAddUsers={() => setAddOpen(true)}
              viewControls={viewControls}
            />
          </TabsContent>
          <TabsContent
            value="instructors"
            id="instructor-assignments-panel"
            aria-labelledby="instructor-assignments-tab"
            className="m-0"
          >
            <InstructorsTab
              directory={directory}
              loadInstructorAssignments={loadInstructorAssignments}
              viewControls={viewControls}
            />
          </TabsContent>
        </Tabs>

        <AddUsersDialog open={addOpen} onOpenChange={setAddOpen} directory={directory} />
      </AdminPage>
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
  );
};

const UserManagement: React.FC = () => {
  const directory = useUserDirectory();
  return <UserManagementView directory={directory} />;
};

export default UserManagement;
