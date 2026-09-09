import { useParams, useLocation } from "wouter";
import { useGetMovie, useUpdateMovie, useDeleteMovie, getGetMovieQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: movie, isLoading } = useGetMovie(params.id as string, { query: { queryKey: getGetMovieQueryKey(params.id as string), enabled: !!params.id } });
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
    updateMovie.mutate({ id: params.id, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMovieQueryKey(params.id as string) });
      }
    });
  };

  const handleDelete = () => {
    if (!params.id) return;
    if (confirm("Are you sure you want to delete this movie?")) {
      deleteMovie.mutate({ id: params.id }, {
        onSuccess: () => {
          setLocation("/catalog/movies");
        }
      });
    }
  };

  if (isLoading) return <div className="text-muted-foreground text-center py-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Movie</h1>
          <p className="text-muted-foreground">{movie?.title}</p>
        </div>
        <Button variant="destructive" onClick={handleDelete} disabled={deleteMovie.isPending}>
          Delete
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="originalTitle" render={({ field }) => (
                  <FormItem><FormLabel>Original Title</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="releaseYear" render={({ field }) => (
                  <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem><FormLabel>Duration (m)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="ageRating" render={({ field }) => (
                  <FormItem><FormLabel>Age Rating</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Media & Storage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="posterUrl" render={({ field }) => (
                  <FormItem><FormLabel>Poster URL</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="backgroundUrl" render={({ field }) => (
                  <FormItem><FormLabel>Background URL</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="sourceType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a source" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="telegram">Telegram File ID</SelectItem>
                        <SelectItem value="minio">MinIO Storage Key</SelectItem>
                        <SelectItem value="hls">HLS Stream URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="telegramFileId" render={({ field }) => (
                  <FormItem><FormLabel>File ID / Key</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={updateMovie.isPending} size="lg">
            {updateMovie.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
