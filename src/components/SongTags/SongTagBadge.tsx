import type { SongTag } from "@/types/Song";

interface SongTagBadgeProps {
  tag: SongTag | string;
  size?: "sm" | "md";
  className?: string;
}

const TAG_STYLES: Record<string, string> = {
  joyful:
    "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/60",
  solemn:
    "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-700/60",
  hymn:
    "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700/60",
};

const DEFAULT_STYLE =
  "bg-brand-cream dark:bg-brand-espresso text-brand-brown dark:text-brand-tan border-brand-brown/20 dark:border-brand-tan/20";

export default function SongTagBadge({
  tag,
  size = "md",
  className = "",
}: SongTagBadgeProps) {
  const normalizedTag = tag.trim().toLowerCase();
  const colorClass = TAG_STYLES[normalizedTag] ?? DEFAULT_STYLE;
  const label =
    normalizedTag.charAt(0).toUpperCase() + normalizedTag.slice(1);

  const sizeClass =
    size === "sm"
      ? "text-[11px] px-2 py-0.25 rounded-md"
      : "text-xs px-2.5 py-0.5 rounded-lg";

  return (
    <span
      className={[
        "inline-flex items-center font-semibold border tracking-wide uppercase transition-colors shrink-0",
        sizeClass,
        colorClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-tag={normalizedTag}
    >
      {label}
    </span>
  );
}
