import * as React from "react";
import { AlertCircle, BookOpen, CheckCircle2, Copy, Download, LoaderCircle, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  classLabel,
  downloadCsv,
  isSsoDomainEmail,
  parseEmails,
  EMAIL_REGEX,
  type BulkResult,
  type RegistrationResult,
} from "./lib.ts";
import type { UserDirectory } from "./useUserDirectory.ts";

/**
 * Two ways in: whitelist SSO (Google) accounts so they can sign in themselves,
 * or directly register password accounts into a class.
 */
export const AddUsersDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directory: UserDirectory;
}> = ({ open, onOpenChange, directory }) => {
  const { users, classes, isLoadingClasses, addToWhitelist, registerUsers } = directory;

  const [tab, setTab] = React.useState("whitelist");
  const [whitelistInput, setWhitelistInput] = React.useState("");
  const [registerInput, setRegisterInput] = React.useState("");
  const [classId, setClassId] = React.useState("");
  const [isWorking, setIsWorking] = React.useState(false);
  const [whitelistResults, setWhitelistResults] = React.useState<BulkResult[]>([]);
  const [registerResults, setRegisterResults] = React.useState<RegistrationResult[]>([]);
  const [credentialsExported, setCredentialsExported] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setWhitelistInput("");
      setRegisterInput("");
      setError("");
      setWhitelistResults([]);
      setRegisterResults([]);
      setCredentialsExported(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!classId && classes.length > 0) setClassId(classes[0].id);
  }, [classes, classId]);

  const existing = new Set(users.map((u) => u.email.toLowerCase()));
  const hasSuccessfulCredentials = registerResults.some((result) => result.status === "success");
  const hasUnexportedCredentials = hasSuccessfulCredentials && !credentialsExported;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) return onOpenChange(true);
    if (isWorking) {
      setError("Wait for the current operation to finish before closing this dialog.");
      return;
    }
    if (hasUnexportedCredentials) {
      setTab("register");
      setError("Export the generated credentials before closing. They cannot be recovered later.");
      return;
    }
    onOpenChange(false);
  };

  const handleTabChange = (nextTab: string) => {
    if (nextTab !== "register" && hasUnexportedCredentials) {
      setError("Export the generated credentials before leaving the registration results.");
      return;
    }
    setTab(nextTab);
    setError("");
  };

  const submitWhitelist = async () => {
    setError("");
    const emails = parseEmails(whitelistInput);
    const invalid = emails.filter((email) => !EMAIL_REGEX.test(email));
    if (emails.length === 0) return setError("Enter at least one email address.");
    if (invalid.length > 0) return setError(`Invalid emails: ${invalid.join(", ")}`);
    const fresh = emails.filter((e) => !existing.has(e.toLowerCase()));
    if (fresh.length === 0) return setError("All of these emails are already in the directory.");
    setIsWorking(true);
    try {
      setWhitelistResults(await addToWhitelist(fresh));
      setWhitelistInput("");
    } finally {
      setIsWorking(false);
    }
  };

  const submitRegister = async () => {
    setError("");
    const emails = parseEmails(registerInput);
    const invalid = emails.filter((email) => !EMAIL_REGEX.test(email));
    if (!classId) return setError("Select a class to enroll the new accounts in.");
    if (emails.length === 0) return setError("Enter at least one email address.");
    if (invalid.length > 0) return setError(`Invalid emails: ${invalid.join(", ")}`);
    const sso = emails.filter(isSsoDomainEmail);
    const passwordEmails = emails.filter((email) => !isSsoDomainEmail(email));
    if (passwordEmails.length === 0) {
      return setError(
        `SSO emails sign in with Google and cannot get passwords — use the whitelist tab for: ${sso.join(", ")}`
      );
    }
    setIsWorking(true);
    try {
      const processed = await registerUsers(passwordEmails, classId);
      const processedByEmail = new Map(processed.map((result) => [result.email, result]));
      const results = emails.map<RegistrationResult>((email) =>
        isSsoDomainEmail(email)
          ? {
              email,
              password: "",
              classId,
              status: "error",
              error: "Skipped: SSO accounts use Google sign-in and must be whitelisted instead.",
            }
          : processedByEmail.get(email)!
      );
      setRegisterResults(results);
      setCredentialsExported(!results.some((result) => result.status === "success"));
      setRegisterInput("");
    } finally {
      setIsWorking(false);
    }
  };

  const exportCredentials = () => {
    downloadCsv(
      `registrations_${new Date().toISOString().split("T")[0]}.csv`,
      ["Email", "Password", "Class", "Status", "Error"],
      registerResults.map((r) => [r.email, r.password, r.classId, r.status, r.error || ""])
    );
    setCredentialsExported(true);
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="gap-0 p-0 sm:max-w-lg [&>[data-slot=dialog-close]]:top-3.5 [&>[data-slot=dialog-close]]:right-4"
        aria-busy={isWorking}
        showCloseButton={!isWorking}
      >
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-lg font-bold">Add users</DialogTitle>
          <DialogDescription>
            Whitelist SSO accounts for Google sign-in, or register password accounts into a class.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-4">
        <Tabs value={tab} onValueChange={(value) => handleTabChange(value as string)}>
          <TabsList className="h-11 w-full sm:h-8">
            <TabsTrigger value="whitelist" className="flex-1">
              Whitelist
            </TabsTrigger>
            <TabsTrigger value="register" className="flex-1">
              Register with password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whitelist" className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="whitelist-emails">Email addresses</Label>
              <Textarea
                id="whitelist-emails"
                value={whitelistInput}
                onChange={(event) => setWhitelistInput(event.target.value)}
                placeholder={"student1@example.edu\nstudent2@example.edu"}
                rows={5}
                className="min-h-40"
                aria-invalid={error ? true : undefined}
                aria-describedby="whitelist-emails-help add-users-error"
              />
              <p id="whitelist-emails-help" className="text-xs text-muted-foreground">
                One per line (commas also work). Whitelisted users sign in with Google.
              </p>
            </div>
            <ResultList results={whitelistResults} />
          </TabsContent>

          <TabsContent value="register" className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="registration-class">Class</Label>
              <Select
                value={classId}
                onValueChange={(v) => setClassId(v ?? "")}
                items={Object.fromEntries(classes.map((c) => [c.id, classLabel(c)]))}
              >
                <SelectTrigger id="registration-class" className="min-h-11 w-full sm:min-h-8" disabled={isLoadingClasses}>
                  <BookOpen className="size-4 text-muted-foreground" />
                  <SelectValue
                    placeholder={isLoadingClasses ? "Loading classes…" : "Select a class"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {classLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="register-emails">Email addresses</Label>
              <Textarea
                id="register-emails"
                value={registerInput}
                onChange={(event) => setRegisterInput(event.target.value)}
                placeholder={"guest1@example.com\nguest2@example.com"}
                rows={4}
                className="min-h-40"
                aria-invalid={error ? true : undefined}
                aria-describedby="register-emails-help add-users-error"
              />
              <p id="register-emails-help" className="text-xs text-muted-foreground">
                Non-SSO accounts receive a random password. Credentials are shown once and must be
                exported before closing.
              </p>
            </div>
            {registerResults.length > 0 && (
              <div className="flex flex-col gap-2">
                <RegistrationResultList results={registerResults} />
                <Button variant="outline" size="sm" onClick={exportCredentials} className="min-h-11 sm:min-h-7">
                  <Download data-icon="inline-start" />
                  {credentialsExported ? "Export credentials again" : "Export credentials CSV"}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <p id="add-users-error" role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
        </div>

        <DialogFooter className="m-0 rounded-b-xl border-t bg-transparent px-5 py-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isWorking} className="min-h-11 sm:min-h-8">
            Close
          </Button>
          <Button
            onClick={tab === "whitelist" ? submitWhitelist : submitRegister}
            disabled={isWorking || (tab === "register" && isLoadingClasses)}
            className="min-h-11 sm:min-h-8"
          >
            {isWorking ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <UserPlus data-icon="inline-start" />
            )}
            {tab === "whitelist" ? "Add to whitelist" : "Register accounts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RegistrationResultList: React.FC<{ results: RegistrationResult[] }> = ({ results }) => {
  const ok = results.filter((result) => result.status === "success").length;
  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-sm font-medium">Registration results</span>
        <Badge variant="secondary">
          {ok}/{results.length} succeeded
        </Badge>
      </div>
      <ScrollArea className="max-h-52">
        <ul className="p-1" aria-label="Registration results and credentials">
          {results.map((result) => (
            <li key={result.email} className="rounded-md px-2 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                {result.status === "success" ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success" />
                ) : (
                  <AlertCircle className="size-4 shrink-0 text-destructive" />
                )}
                <span className="min-w-0 flex-1 truncate" title={result.email}>
                  {result.email}
                </span>
              </div>
              {result.status === "success" ? (
                <div className="mt-2 flex min-w-0 items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                  <code className="min-w-0 flex-1 truncate text-xs" title={result.password}>
                    {result.password}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 shrink-0"
                    aria-label={`Copy password for ${result.email}`}
                    onClick={() => navigator.clipboard.writeText(result.password)}
                  >
                    <Copy />
                  </Button>
                </div>
              ) : (
                <p className="mt-1 pl-6 text-xs text-muted-foreground">{result.error}</p>
              )}
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
};

const ResultList: React.FC<{ results: BulkResult[] }> = ({ results }) => {
  if (results.length === 0) return null;
  const ok = results.filter((r) => r.status === "success").length;
  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-sm font-medium">Results</span>
        <Badge variant="secondary">
          {ok}/{results.length} succeeded
        </Badge>
      </div>
      <ScrollArea className="max-h-40">
        <ul className="p-1" aria-label="Operation results">
          {results.map((r) => (
            <li key={r.email} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm">
              {r.status === "success" ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-destructive" />
              )}
              <span className="truncate">{r.email}</span>
              {r.error && (
                <span className="ml-auto max-w-48 truncate text-xs text-muted-foreground" title={r.error}>{r.error}</span>
              )}
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
};
