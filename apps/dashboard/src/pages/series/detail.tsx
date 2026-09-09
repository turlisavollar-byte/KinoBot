import { useParams, useLocation } from "wouter";
import { useGetSeries, useUpdateSeries, useDeleteSeries, getGetSeriesQueryKey, useListSeasons, getListSeasonsQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  originalTitle: z.string().optional(),
  description: z.string().optional(),
  releaseYear: z.coerce.number().optional(),
  ageRating: z.string().optional(),
  posterUrl: z.string().optional(),
  backgroundUrl: z.string().optional(),
  trailerUrl: z.string().optional(),
});

export default function SeriesDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: series, isLoading: isLoadingSeries } = useGetSeries(params.id as string, { query: { queryKey: getGetSeriesQueryKey(params.id as string), enabled: !!params.id } });
  const { data: seasons, isLoading: isLoadingSeasons } = useListSeasons(params.id as string, { query: { queryKey: getListSeasonsQueryKey(params.id as string), enabled: !!params.id } });
  
  const updateSeries = useUpdateSeries();
  const deleteSeries = useDeleteSeries();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      originalTitle: "",
      description: "",
      releaseYear: undefined,
      ageRating: "",
      posterUrl: "",
      backgroundUrl: "",
      trailerUrl: "",
    },
  });

  useEffect(() => {
    if (series) {
      form.reset({
        title: series.title,
        originalTitle: (series as any).originalTitle || "",
        description: series.description || "",
        releaseYear: (series as any).releaseYear || undefined,
        ageRating: (series as any).ageRating || "",
        posterUrl: series.posterUrl || "",
        backgroundUrl: (series as any).backgroundUrl || "",
        trailerUrl: (series as any).trailerUrl || "",
      });
    }
  }, [series, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!params.id) return;
    updateSeries.mutate({ id: params.id, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSeriesQueryKey(params.id as string) });
      }
    });
  };

  const handleDelete = () => {
    if (!params.id) return;
    if (confirm("Are you sure you want to delete this series?")) {
      deleteSeries.mutate({ id: params.id }, {
        onSuccess: () => {
          setLocation("/catalog/series");
        }
      });
    }
  };

  if (isLoadingSeries) return <div className="text-muted-foreground text-center py-8">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Series</h1>
          <p className="text-muted-foreground">{series?.title}</p>
        </div>
        <Button variant="destructive" onClick={handleDelete} disabled={deleteSeries.isPending}>
          Delete
        </Button>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="seasons">Seasons & Episodes</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-8">
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="releaseYear" render={({ field }) => (
                      <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ageRating" render={({ field }) => (
                      <FormItem><FormLabel>Age Rating</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Media</CardTitle>
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
                </CardContent>
              </Card>

              <Button type="submit" disabled={updateSeries.isPending} size="lg">
                {updateSeries.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </TabsContent>
        <TabsContent value="seasons">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Seasons</CardTitle>
              <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Add Season</Button>
            </CardHeader>
            <CardContent>
              {isLoadingSeasons ? (
                <div className="text-muted-foreground text-sm">Loading seasons...</div>
              ) : seasons && seasons.length > 0 ? (
                <div className="space-y-4">
                  {seasons.map((season: any) => (
                    <div key={season.id} className="border p-4 rounded-md">
                      <div className="flex justify-between items-center font-medium">
                        <span>Season {season.seasonNumber} {season.title && `- ${season.title}`}</span>
                        <span className="text-sm text-muted-foreground">{season.episodesCount || 0} episodes</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm py-4">No seasons added yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
