import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getListMoviesQueryKey,
  useIdentityGetMe,
  useListMovies,
} from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api-fetch";
import { useI18n } from "@/lib/i18n";

type TelegramMediaItem = {
  id: string;
  fileName: string | null;
  mimeType: string;
  fileSize: number;
  duration: number | null;
  status: "pending" | "processing" | "uploaded" | "failed";
  createdAt: string;
  uploadedAt: string | null;
  previewUrl: string | null;
};

type TelegramMediaResponse = {
  media: TelegramMediaItem[];
  total: number;
  page: number;
  limit: number;
};

const PAGE_SIZE = 20;
const statuses = ["all", "pending", "processing", "uploaded", "failed"] as const;

export default function TelegramMediaPage() {
  const { t, formatDate, formatNumber, locale } = useI18n();
  const [status, setStatus] = useState<(typeof statuses)[number]>("all");
  const [page, setPage] = useState(1);
  const [selectedMovies, setSelectedMovies] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const { data: identity } = useIdentityGetMe();
  const canLinkMedia = identity?.permissions?.includes("update:content") ?? false;
  const moviesQuery = useListMovies({ page: 1, limit: 100 });
  const mediaQuery = useQuery({
    queryKey: ["telegram-media", status, page, PAGE_SIZE],
    queryFn: () =>
      apiFetch<TelegramMediaResponse>(
        `/api/catalog/telegram-media?status=${status}&page=${page}&limit=${PAGE_SIZE}`,
      ),
  });
  const linkMedia = useMutation({
    mutationFn: ({ movieId, mediaId }: { movieId: string; mediaId: string }) =>
      apiFetch(`/api/catalog/movies/${encodeURIComponent(movieId)}/link-media`, {
        method: "POST",
        body: JSON.stringify({ mediaId }),
      }),
    onSuccess: async () => {
      toast.success(t("telegramMedia.linkSuccess"));
      await queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("telegramMedia.linkError"),
      );
    },
  });

  const media = mediaQuery.data?.media ?? [];
  const total = mediaQuery.data?.total ?? 0;
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const labels = {
    all: t("telegramMedia.allStatuses"),
    pending: t("telegramMedia.status.pending"),
    processing: t("telegramMedia.status.processing"),
    uploaded: t("telegramMedia.status.uploaded"),
    failed: t("telegramMedia.status.failed"),
  };
  const formatFileSize = (bytes: number) =>
    `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
      bytes / (1024 * 1024),
    )} MB`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("telegramMedia.title")}
          </h1>
          <p className="text-muted-foreground">{t("telegramMedia.description")}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span>{t("telegramMedia.statusFilter")}</span>
          <select
            className="h-9 rounded-md border border-input bg-background px-3"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as (typeof statuses)[number]);
              setPage(1);
            }}
          >
            {statuses.map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("telegramMedia.file")}</TableHead>
              <TableHead>{t("telegramMedia.statusFilter")}</TableHead>
              <TableHead>{t("telegramMedia.size")}</TableHead>
              <TableHead>{t("telegramMedia.created")}</TableHead>
              <TableHead>{t("telegramMedia.preview")}</TableHead>
              {canLinkMedia && <TableHead>{t("telegramMedia.movie")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {mediaQuery.isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={canLinkMedia ? 6 : 5}
                  className="py-8 text-center"
                >
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : mediaQuery.isError ? (
              <TableRow>
                <TableCell
                  colSpan={canLinkMedia ? 6 : 5}
                  className="py-8 text-center text-destructive"
                >
                  {t("telegramMedia.loadError")}
                  {mediaQuery.error instanceof Error
                    ? `: ${mediaQuery.error.message}`
                    : ""}
                </TableCell>
              </TableRow>
            ) : media.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canLinkMedia ? 6 : 5}
                  className="py-8 text-center"
                >
                  {t("telegramMedia.empty")}
                </TableCell>
              </TableRow>
            ) : (
              media.map((item) => {
                const movieId =
                  selectedMovies[item.id] ?? moviesQuery.data?.data?.[0]?.id ?? "";
                const canLink =
                  canLinkMedia &&
                  item.status === "uploaded" &&
                  item.mimeType === "video/mp4" &&
                  item.fileSize > 0 &&
                  Boolean(movieId);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>{item.fileName || item.id}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.mimeType}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "uploaded" ? "default" : "secondary"
                        }
                      >
                        {labels[item.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(item.fileSize)}</TableCell>
                    <TableCell>
                      {item.createdAt
                        ? formatDate(new Date(item.createdAt))
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {item.previewUrl ? (
                        <a
                          href={item.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {t("telegramMedia.openPreview")}
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">
                          {t("telegramMedia.noPreview")}
                        </span>
                      )}
                    </TableCell>
                    {canLinkMedia && (
                      <TableCell>
                        <div className="flex min-w-64 items-center gap-2">
                          <select
                            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2"
                            value={movieId}
                            onChange={(event) =>
                              setSelectedMovies((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            disabled={
                              item.status !== "uploaded" ||
                              item.mimeType !== "video/mp4" ||
                              moviesQuery.isLoading
                            }
                            aria-label={`${t("telegramMedia.movie")}: ${item.fileName ?? item.id}`}
                          >
                            <option value="">{t("telegramMedia.selectMovie")}</option>
                            {moviesQuery.data?.data?.map((movie) => (
                              <option key={movie.id} value={movie.id}>
                                {movie.title}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            disabled={!canLink || linkMedia.isPending}
                            onClick={() =>
                              linkMedia.mutate({ movieId, mediaId: item.id })
                            }
                          >
                            {linkMedia.isPending
                              ? t("telegramMedia.linking")
                              : t("telegramMedia.link")}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("telegramMedia.total")}: {formatNumber(total)}
        </p>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={mediaQuery.isFetching || page <= 1}
          >
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("telegramMedia.previous")}
          </Button>
          <span
            className="whitespace-nowrap text-sm text-muted-foreground"
            aria-live="polite"
          >
            {t("telegramMedia.page")} {formatNumber(page)} /{" "}
            {formatNumber(pageCount)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((current) => current + 1)}
            disabled={mediaQuery.isFetching || page >= pageCount}
          >
            {t("telegramMedia.next")}
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
