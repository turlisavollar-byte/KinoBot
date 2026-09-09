import { useListSeries, usePublishSeries, getListSeriesQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

export default function SeriesList() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { data: series, isLoading } = useListSeries({ search });
  const publishSeries = usePublishSeries();
  const queryClient = useQueryClient();

  const handlePublishToggle = (id: string, currentStatus: boolean) => {
    publishSeries.mutate({ id, data: { published: !currentStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSeriesQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("series.title")}</h1>
          <p className="text-muted-foreground">{t("series.list")}</p>
        </div>
        <Link href="/catalog/series/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          <Plus className="mr-2 h-4 w-4" />
          {t("series.add")}
        </Link>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("series.searchPlaceholder")}
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
              <TableHead>{t("series.name")}</TableHead>
              <TableHead>{t("series.year")}</TableHead>
              <TableHead>{t("series.seasons")}</TableHead>
              <TableHead>{t("series.status")}</TableHead>
              <TableHead className="text-right">{t("common.edit")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("common.loading")}</TableCell>
              </TableRow>
            ) : series?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("series.noSeries")}</TableCell>
              </TableRow>
            ) : (
              series?.data?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div>{item.title}</div>
                    {item.originalTitle && <div className="text-xs text-muted-foreground">{item.originalTitle}</div>}
                  </TableCell>
                  <TableCell>{item.releaseYear}</TableCell>
                  <TableCell>{item.seasonsCount || 0}</TableCell>
                  <TableCell>
                    <Badge variant={item.isPublished ? "default" : "secondary"}>
                      {item.isPublished ? t("series.published") : t("series.draft")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePublishToggle(item.id, item.isPublished)}
                      disabled={publishSeries.isPending}
                    >
                      {item.isPublished ? t("series.unpublish") : t("series.publish")}
                    </Button>
                    <Link href={`/catalog/series/${item.id}`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                      <Edit className="h-4 w-4 mr-2" />
                      {t("common.edit")}
                    </Link>
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
