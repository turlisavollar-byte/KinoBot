"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useContentItem } from "@/features/content";
import { Loader2 } from "lucide-react";
import { routes } from "@/shared/config";

export default function BrowseDetailPage({ params }: { params: { id: string } }) {
  const { data: content, loading } = useContentItem(params.id);
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!content) {
      router.replace(routes.browse);
      return;
    }
    router.replace(content.type === "movie" ? routes.movie(content.id) : routes.seriesDetail(content.id));
  }, [content, loading, router]);

  return (
    <div className="flex justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
