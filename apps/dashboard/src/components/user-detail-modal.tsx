import { useEffect, useMemo, useState } from "react";
import {
  useBlockUser,
  useGetUser,
  useGetUserAuditHistory,
  useIdentityGetMe,
  useUpdateUser,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { UserAvatar } from "@/components/avatar";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const roleOptions = ["viewer", "user", "moderator", "manager", "admin", "superadmin"];
const statusOptions = ["active", "blocked", "inactive", "suspended"];

function pickName(user: { fullName?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null; username?: string | null } | undefined) {
  if (!user) return "Unknown user";
  if (user.fullName && user.fullName.trim()) return user.fullName;
  const names = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (names) return names;
  if (user.username) return user.username;
  if (user.email) return user.email;
  return "Unknown user";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function UserDetailModal({
  userId,
  open,
  onClose,
}: {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: me } = useIdentityGetMe();
  const currentRole = me?.role ?? "viewer";
  const canSave = !["viewer", "user"].includes(currentRole);
  const canBlock = ["superadmin", "admin", "manager", "moderator"].includes(currentRole);

  const { data: userResponse, isLoading, isError } = useGetUser(
    userId ?? "",
    undefined,
    {
      query: {
        queryKey: ["user", userId],
        enabled: Boolean(userId) && open,
        retry: false,
      },
    },
  );
  const user = userResponse?.data;

  const { data: auditResponse } = useGetUserAuditHistory(userId ?? "", {
    query: {
      queryKey: ["user-audit", userId],
      enabled: Boolean(userId) && open,
      retry: false,
    },
  });

  const updateUser = useUpdateUser();
  const blockUser = useBlockUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("user");
  const [status, setStatus] = useState<string>("active");

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setUsername(user.username ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
    setRole(user.role ?? "user");
    setStatus(user.isBlocked ? "blocked" : "active");
  }, [user]);

  const auditItems = useMemo(() => auditResponse?.data ?? [], [auditResponse]);

  const handleSave = () => {
    if (!user) return;
    updateUser.mutate(
      {
        id: user.id,
        data: {
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          username: username.trim() || undefined,
          languageCode: "en",
          isActive: status !== "blocked",
          status: "active",
          role: role as any,
          accountStatus: status === "blocked" ? "blocked" : "active",
        },
      },
      {
        onSuccess: () => {
          toast.success("User updated");
          onClose();
        },
        onError: () => toast.error("Could not update user"),
      },
    );
  };

  const handleBlockToggle = () => {
    if (!user) return;
    const nextBlocked = !user.isBlocked;
    blockUser.mutate(
      { id: user.id, data: { blocked: nextBlocked, reason: nextBlocked ? "Blocked by admin" : "Unblocked by admin" } },
      {
        onSuccess: () => {
          toast.success(nextBlocked ? "User blocked" : "User unblocked");
          onClose();
        },
        onError: () => toast.error("Could not update user status"),
      },
    );
  };

  return (
    <Dialog open={open && Boolean(userId)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading user details…
          </div>
        ) : isError || !user ? (
          <div className="space-y-4 p-2">
            <DialogHeader>
              <DialogTitle>User not available</DialogTitle>
              <DialogDescription>Could not load the requested user.</DialogDescription>
            </DialogHeader>
            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <UserAvatar src={user.avatar ?? undefined} name={pickName(user)} size="lg" />
                <div>
                  <DialogTitle className="text-left text-2xl font-semibold">
                    {pickName(user)}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">{user.email ?? "No email"}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="mt-1">
                ×
              </Button>
            </DialogHeader>

            <div className="mt-4 flex items-center gap-2">
              <Badge variant={user.isBlocked ? "destructive" : "default"}>
                {user.isBlocked ? "Blocked" : "Active"}
              </Badge>
              <Badge variant="outline">{user.role}</Badge>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Basic info
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>First name</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last name</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Stats</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border p-3"><span className="text-xs text-muted-foreground">Created</span><p className="mt-1 font-medium">{formatDate(user.createdAt)}</p></div>
                  <div className="rounded-md border p-3"><span className="text-xs text-muted-foreground">Last login</span><p className="mt-1 font-medium">{formatDate(user.lastLoginAt)}</p></div>
                  <div className="rounded-md border p-3"><span className="text-xs text-muted-foreground">Watch sessions</span><p className="mt-1 font-medium">{user.watchCount ?? 0}</p></div>
                  <div className="rounded-md border p-3"><span className="text-xs text-muted-foreground">Subscription</span><p className="mt-1 font-medium">{user.activeSubscription?.planName ?? "No active plan"}</p></div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent audit</h3>
                <div className="space-y-2 rounded-md border p-3">
                  {auditItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity recorded.</p>
                  ) : (
                    auditItems.slice(0, 10).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-4 border-b pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="text-sm font-medium">{entry.action}</p>
                          <p className="text-xs text-muted-foreground">{entry.targetType}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t pt-4">
              {canSave ? <Button onClick={handleSave}>Save</Button> : null}
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              {canBlock ? (
                <Button variant={user.isBlocked ? "outline" : "destructive"} onClick={handleBlockToggle}>
                  {user.isBlocked ? "Unblock" : "Block"}
                </Button>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
