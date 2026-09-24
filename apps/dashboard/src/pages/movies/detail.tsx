import { useParams, useLocation } from "wouter";
import {
  useGetMovie,
  useUpdateMovie,
  useDeleteMovie,
  getGetMovieQueryKey,
  getListMoviesQueryKey,
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  originalTitle: z.string().optional(),
  description: z.string().optional(),
  releaseYear: z.coerce.number().optional(),
  duration: z.coerce.number().optional(),
  ageRating: z.string().optional(),
  posterUrl: z.string().optional(),
  backgroundUrl: z.string().optional(),
  trailerUrl: z.string().optional(),
  telegramFileId: z.string().optional(),
  storageKey: z.string().optional(),
  sourceType: z.string().optional(),
});

export default function MovieDetail() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: movie, isLoading } = useGetMovie(params.id as string, {
    query: {
      queryKey: getGetMovieQueryKey(params.id as string),
      enabled: !!params.id,
    },
  });
  const updateMovie = useUpdateMovie();
  const deleteMovie = useDeleteMovie();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      originalTitle: "",
      description: "",
      releaseYear: undefined,
      duration: undefined,
      ageRating: "",
      posterUrl: "",
      backgroundUrl: "",
      trailerUrl: "",
      telegramFileId: "",
      storageKey: "",
      sourceType: "telegram",
    },
  });

  useEffect(() => {
    if (movie) {
      form.reset({
        title: movie.title,
        originalTitle: (movie as any).originalTitle || "",
        description: movie.description || "",
        releaseYear: (movie as any).releaseYear || undefined,
        duration: (movie as any).duration || undefined,
        ageRating: (movie as any).ageRating || "",
        posterUrl: movie.posterUrl || "",
        backgroundUrl: (movie as any).backgroundUrl || "",
        trailerUrl: (movie as any).trailerUrl || "",
        telegramFileId: (movie as any).telegramFileId || "",
        storageKey: (movie as any).storageKey || "",
        sourceType: (movie as any).sourceType || "telegram",
      });
    }
  }, [movie, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!params.id) return;
    updateMovie.mutate(
      { id: params.id, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetMovieQueryKey(params.id as string),
          });
          toast.success(t("movies.updateSuccess"));
          setLocation("/");
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : t("movies.updateError"),
          );
        },
      },
    );
  };

  const handleDelete = () => {
    if (!params.id) return;
    if (confirm(t("movies.deleteConfirm"))) {
      deleteMovie.mutate(
        { id: params.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListMoviesQueryKey(),
            });
            setLocation("/catalog/movies");
          },
        },
      );
    }
  };

  if (isLoading)
    return (
      <div className="text-muted-foreground text-center py-8">
        {t("common.loading")}
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("movies.edit")}
          </h1>
          <p className="text-muted-foreground">{movie?.title}</p>
        </div>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleteMovie.isPending}
        >
          {t("common.delete")}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{t("movies.metadata")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.titleLabel")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="originalTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.originalTitle")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("movies.description")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="releaseYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.releaseYear")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.durationMin")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ageRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.ageRating")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("movies.mediaStorage")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="posterUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.poster")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="backgroundUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.background")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sourceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.sourceType")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("movies.selectSource")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="telegram">
                            {t("movies.telegramFileId")}
                          </SelectItem>
                          <SelectItem value="minio">
                            {t("movies.minioStorageKey")}
                          </SelectItem>
                          <SelectItem value="hls">
                            {t("movies.hlsStreamUrl")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telegramFileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("movies.fileIdKey")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={updateMovie.isPending} size="lg">
            {updateMovie.isPending
              ? t("common.saving")
              : t("movies.saveChanges")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
