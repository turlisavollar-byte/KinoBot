import { ContentCard } from "../cards/ContentCard";
import type { ContentItem } from "@/features/content";

interface ContentGridProps {
  title?: string;
  subtitle?: string;
  items: ContentItem[];
  columns?: number;
}

export function ContentGrid({
  title,
  subtitle,
  items,
  columns = 5,
}: ContentGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
  };

  return (
    <section>
      {(title || subtitle) && (
        <div className="mb-6 px-4 sm:px-6 lg:px-8">
          {title && (
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">{title}</h2>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      )}
      <div className={`grid ${gridCols[columns as keyof typeof gridCols]} gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8`}>
        {items.map((item) => (
          <ContentCard
            key={item.id}
            id={item.id}
            title={item.title}
            image={item.image}
            year={item.year}
            rating={item.rating}
            duration={item.duration}
            type={item.type}
            href={item.type === "movie" ? `/movies/${item.id}` : `/series/${item.id}`}
            fullWidth
          />
        ))}
      </div>
    </section>
  );
}
