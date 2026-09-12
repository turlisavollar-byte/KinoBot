import { useState } from "react";
import {
  getListAdminUsersQueryKey,
  useDeleteAdminUser,
  useIdentityGetMe,
  useListAdminUsers,
  useUpdateAdminUser,
  type AdminAccount,
  type UpdateAdminUserBodyRole,
} from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type AdminUser = AdminAccount;

const roleLevel: Record<string, number> = {
  viewer: 10,
  user: 20,
  moderator: 30,
  manager: 40,
  admin: 80,
  superadmin: 100,
};

export default function AdminUsersList() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { data: usersResponse, isLoading } = useListAdminUsers({ search });
  const users = usersResponse?.data ?? [];
  const { data: me } = useIdentityGetMe();
  const updateAdminUser = useUpdateAdminUser();
  const deleteAdminUser = useDeleteAdminUser();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UpdateAdminUserBodyRole>("viewer");
  const actorRole = me?.role ?? "viewer";
  const canManage = (targetRole: string) =>
    actorRole !== "viewer" &&
    actorRole !== targetRole &&
    (roleLevel[actorRole] ?? 0) > (roleLevel[targetRole] ?? 0);

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
  };

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: getListAdminUsersQueryKey({ search }),
    });
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    try {
      await updateAdminUser.mutateAsync({
        id: editingUser.id,
        data: { name, email, role },
      });
      toast.success("Admin account updated");
      setEditingUser(null);
      refresh();
    } catch {
      toast.error("Admin account could not be updated");
    }
  };

  const removeUser = async (user: AdminUser) => {
    if (!window.confirm(`Delete ${user.email}?`)) return;
    try {
      await deleteAdminUser.mutateAsync({ id: user.id });
      toast.success("Admin account deleted");
      refresh();
    } catch {
      toast.error("Admin account could not be deleted");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("nav.adminUsers")}
        </h1>
        <p className="text-muted-foreground">
          {t("users.manageAdminAccounts")}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("users.searchAdminPlaceholder")}
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("users.tableName")}</TableHead>
              <TableHead>{t("users.tableEmail")}</TableHead>
              <TableHead>{t("users.tableRole")}</TableHead>
              <TableHead>{t("users.tableStatus")}</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {t("users.loadingAdminUsers")}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {t("users.noAdminUsersFound")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge className="bg-green-600 hover:bg-green-700">
                        {t("users.active")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{t("users.inactive")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage(user.role) && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(user)}
                          title="Edit admin account"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void removeUser(user)}
                          title="Delete admin account"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={Boolean(editingUser)}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit administrative account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Name</Label>
              <Input
                id="admin-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(value) =>
                  setRole(value as UpdateAdminUserBodyRole)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(roleLevel)
                    .filter(
                      (candidate) =>
                        (roleLevel[actorRole] ?? 0) > roleLevel[candidate],
                    )
                    .map((candidate) => (
                      <SelectItem key={candidate} value={candidate}>
                        {candidate}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveEdit()}
              disabled={updateAdminUser.isPending}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
