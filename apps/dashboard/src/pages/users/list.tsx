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
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  ShieldAlert,
} from "lucide-react";
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
  const { t, formatDate, formatNumber, locale } = useI18n();
  const [search, setSearch] = useState("");
  // Keep the page size aligned with the API default.
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const {
    data: usersResponse,
    isLoading,
    isFetching,
    isError,
    error,
  } = useListUsers({
    search,
    role: "user",
    page,
    limit,
  });
  const blockUser = useBlockUser();
  const users = usersResponse?.data as UserWithSubscription[] | undefined;
  const meta = usersResponse?.meta;
  const pageCount = Math.max(meta?.totalPages ?? 1, 1);
  const paginationLabels = {
    en: {
      previous: "Previous",
      next: "Next",
      page: "Page",
      total: "Total",
      loadError: "Could not load users",
    },
    ru: {
      previous: "Назад",
      next: "Далее",
      page: "Страница",
      total: "Всего",
      loadError: "Не удалось загрузить пользователей",
    },
    uz: {
      previous: "Oldingi",
      next: "Keyingi",
      page: "Sahifa",
      total: "Jami",
      loadError: "Foydalanuvchilarni yuklab bo'lmadi",
    },
  }[locale];
  const isPageLoading = isLoading || isFetching;

  const handleBlockToggle = (id: string, isBlocked: boolean) => {
    blockUser.mutate(
      { id, data: { blocked: !isBlocked } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast.success(
            isBlocked ? t("users.unblocked") : t("users.blockedToast"),
          );
        },
        onError: () => toast.error(t("users.statusUpdateFailed")),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("nav.users")}
          </h1>
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
              <TableHead className="text-right">
                {t("users.tableActions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPageLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-destructive"
                >
                  {paginationLabels.loadError}
                  {error instanceof Error && error.message
                    ? `: ${error.message}`
                    : ""}
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
                          {user.activeSubscription.planName ||
                            t("users.active")}
                        </Badge>
                        {user.activeSubscription.endDate && (
                          <div className="text-xs text-muted-foreground">
                            {t("users.until")}{" "}
                            {formatDate(user.activeSubscription.endDate, {
                              dateStyle: "medium",
                            })}
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

      {/* Page controls follow the server-provided pagination metadata. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {paginationLabels.total}: {formatNumber(meta?.total ?? 0)}
        </p>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
            disabled={isPageLoading || !meta?.hasPrevious}
          >
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            {paginationLabels.previous}
          </Button>
          <span
            className="whitespace-nowrap text-sm text-muted-foreground"
            aria-live="polite"
          >
            {paginationLabels.page} {formatNumber(page)} / {formatNumber(pageCount)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((currentPage) => currentPage + 1)}
            disabled={isPageLoading || !meta?.hasNext}
          >
            {paginationLabels.next}
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
