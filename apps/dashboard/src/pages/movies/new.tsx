import { useCreateMovie } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";

const formSchema = z.object({
  title: z.string().min(1, "movies.titleRequired"),
  originalTitle: z.string().optional(),
  description: z.string().optional(),
  releaseYear: z.coerce.number().optional(),
  duration: z.coerce.number().optional(),
  ageRating: z.string().optional(),
});

export default function NewMovie() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const createMovie = useCreateMovie();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      originalTitle: "",
      description: "",
      ageRating: "12+",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMovie.mutate({ data: values }, {
      onSuccess: (data) => {
        setLocation(`/catalog/movies/${data.id}`);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("movies.add")}</h1>
        <p className="text-muted-foreground">{t("movies.addDescription")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("movies.titleLabel")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("movies.titleLabel")} {...field} />
                </FormControl>
                <FormMessage />
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
                  <Input placeholder={t("movies.originalTitle")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("movies.description")}</FormLabel>
                <FormControl>
                  <Textarea placeholder={t("movies.synopsisPlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
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
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
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
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
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
                    <Input placeholder={t("movies.ageRatingPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={createMovie.isPending}>
            {createMovie.isPending ? t("movies.creating") : t("movies.createMovie")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
