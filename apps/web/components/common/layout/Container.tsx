import { cn } from "@/shared/lib";

const widthMap = {
  default: "max-w-[1800px]",
  narrow: "max-w-4xl",
  wide: "max-w-[1400px]",
} as const;

interface ContainerProps {
  children: React.ReactNode;
  width?: keyof typeof widthMap;
  className?: string;
}

export function Container({ children, width = "default", className }: ContainerProps) {
  return (
    <div className={cn("mx-auto px-4 sm:px-6 lg:px-8", widthMap[width], className)}>
      {children}
    </div>
  );
}
