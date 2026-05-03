import type { ReactElement } from "react";
import Link from "next/link";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-espresso dark:focus-visible:ring-brand-tan";

const actionClasses = [
  "inline-flex items-center justify-center font-sans font-semibold",
  "bg-brand-tan text-brand-espresso hover:bg-brand-brown hover:text-brand-cream",
  "border border-brand-tan hover:border-brand-brown",
  "transition-colors duration-200",
  "text-base px-4 py-2 rounded-xl",
  focusRing,
].join(" ");

export default function QuickActions(): ReactElement {
  return (
    <section className="rounded-2xl border border-brand-tan/30 bg-brand-cream dark:bg-brand-espresso dark:border-brand-tan/20 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-brown dark:text-brand-tan mb-3">
        Quick Actions
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/setlists/new" className={actionClasses}>
          New Setlist
        </Link>
        <Link href="/library/new" className={actionClasses}>
          Add Song
        </Link>
      </div>
    </section>
  );
}
