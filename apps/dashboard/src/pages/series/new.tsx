import { useCreateSeries } from "@workspace/api-client-react";
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
  title: z.string().min(1, "series.titleRequired"),
  originalTitle: z.string().optional(),
  description: z.string().optional(),
  releaseYear: z.coerce.number().optional(),
  ageRating: z.string().optional(),
});

export default function NewSeries() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const createSeries = useCreateSeries();

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
    createSeries.mutate({ data: values }, {
      onSuccess: (data) => {
        setLocation(`/catalog/series/${data.id}`);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("series.add")}</h1>
        <p className="text-muted-foreground">{t("series.addDescription")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("series.titleLabel")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("series.titleLabel")} {...field} />
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
                <FormLabel>{t("series.originalTitle")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("series.originalTitle")} {...field} />
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
                <FormLabel>{t("series.description")}</FormLabel>
                <FormControl>
                  <Textarea placeholder={t("series.synopsisPlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="releaseYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("series.releaseYear")}</FormLabel>
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
                  <FormLabel>{t("series.ageRating")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("series.ageRatingPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={createSeries.isPending}>
            {createSeries.isPending ? t("series.creating") : t("series.createSeries")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
