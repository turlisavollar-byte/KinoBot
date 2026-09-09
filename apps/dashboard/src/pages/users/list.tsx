import { useState } from "react";
import {
  getListUsersQueryKey,
  useBlockUser,
  useListUsers,
} from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Eye, Search, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { User } from "@workspace/api-client-react";

type UserWithSubscription = User & {
  activeSubscription?: {
    id: string;
    planId: string;
    planName: string;
    endDate: string;
    autoRenew: boolean;
  } | null;
};

export default function UsersList() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: usersResponse, isLoading } = useListUsers({
    search,
    role: "user",
  });
  const blockUser = useBlockUser();
  const users = usersResponse?.data as UserWithSubscription[] | undefined;

  const handleBlockToggle = (id: string, isBlocked: boolean) => {
    blockUser.mutate(
      { id, data: { blocked: !isBlocked } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast.success(isBlocked ? "User unblocked" : "User blocked");
        },
        onError: () => toast.error("Could not update user status"),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("nav.users")}</h1>
          <p className="text-muted-foreground">{t("users.manageAccounts")}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("users.searchPlaceholder")}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("users.tableUser")}</TableHead>
              <TableHead>{t("users.tableTelegramId")}</TableHead>
              <TableHead>{t("users.tableStatus")}</TableHead>
              <TableHead>{t("users.tableSubscription")}</TableHead>
              <TableHead className="text-right">{t("users.tableActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : !users || users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {t("users.noUsersFound")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">
                      {user.fullName ||
                        user.username ||
                        user.email ||
                        t("common.unknown")}
                    </div>
                    {user.username && (
                      <div className="text-xs text-muted-foreground">
                        @{user.username}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {user.telegramId}
                  </TableCell>
                  <TableCell>
                    {user.isBlocked ? (
                      <Badge variant="destructive">{t("users.blocked")}</Badge>
                    ) : (
                      <Badge
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {t("users.active")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.activeSubscription ? (
                      <div className="space-y-0.5">
                        <Badge
                          variant="outline"
                          className="border-primary text-primary"
                        >
                          {user.activeSubscription.planName || t("users.active")}
                        </Badge>
                        {user.activeSubscription.endDate && (
                          <div className="text-xs text-muted-foreground">
                            {t("users.until")}{" "}
                            {new Date(
                              user.activeSubscription.endDate,
                            ).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {t("users.noActiveSubscription")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/users/${user.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t("users.view")}
                      </Button>
                      <Button
                        size="sm"
                        variant={user.isBlocked ? "outline" : "destructive"}
                        onClick={() =>
                          handleBlockToggle(user.id, user.isBlocked)
                        }
                        disabled={blockUser.isPending}
                      >
                        <ShieldAlert className="h-4 w-4 mr-2" />
                        {user.isBlocked ? t("users.unblock") : t("users.block")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
