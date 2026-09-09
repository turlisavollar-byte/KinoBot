import { useListMovies, usePublishMovie, getListMoviesQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

export default function MoviesList() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { data: movies, isLoading, error } = useListMovies({ search });
  const publishMovie = usePublishMovie();
  const queryClient = useQueryClient();

  const handlePublishToggle = (id: string, currentStatus: boolean) => {
    publishMovie.mutate({ id, data: { published: !currentStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() });
      }
    });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("movies.title")}</h1>
            <p className="text-muted-foreground">{t("movies.list")}</p>
          </div>
          <Link href="/catalog/movies/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />
            {t("movies.add")}
          </Link>
        </div>
        <div className="border rounded-md p-8 text-center">
          <p className="text-destructive mb-2">{t("error.server")}</p>
          <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : t("error.unknown")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("movies.title")}</h1>
          <p className="text-muted-foreground">{t("movies.list")}</p>
        </div>
        <Link href="/catalog/movies/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          <Plus className="mr-2 h-4 w-4" />
          {t("movies.add")}
        </Link>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("movies.searchPlaceholder")}
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
              <TableHead>{t("movies.name")}</TableHead>
              <TableHead>{t("movies.year")}</TableHead>
              <TableHead>{t("movies.duration")}</TableHead>
              <TableHead>{t("movies.status")}</TableHead>
              <TableHead className="text-right">{t("common.edit")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("common.loading")}</TableCell>
              </TableRow>
            ) : movies?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("movies.noMovies")}</TableCell>
              </TableRow>
            ) : (
              movies?.data?.map((movie: any) => (
                <TableRow key={movie.id}>
                  <TableCell className="font-medium">
                    <div>{movie.title}</div>
                    {movie.originalTitle && <div className="text-xs text-muted-foreground">{movie.originalTitle}</div>}
                  </TableCell>
                  <TableCell>{movie.releaseYear}</TableCell>
                  <TableCell>{movie.duration}m</TableCell>
                  <TableCell>
                    <Badge variant={movie.isPublished ? "default" : "secondary"}>
                      {movie.isPublished ? t("movies.published") : t("movies.draft")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePublishToggle(movie.id, movie.isPublished)}
                      disabled={publishMovie.isPending}
                    >
                      {movie.isPublished ? t("movies.unpublish") : t("movies.publish")}
                    </Button>
                    <Link href={`/catalog/movies/${movie.id}`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
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
