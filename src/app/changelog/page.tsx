import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import { parseChangelog } from "@/utils/changelogParser";
import ChangelogClientView from "@/components/changelog/ChangelogClientView";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "All notable improvements, features, and fixes to the Saliw Music Portal.",
  openGraph: {
    title: "Changelog | Saliw",
    description:
      "All notable improvements, features, and fixes to the Saliw Music Portal.",
    url: "https://saliw.vercel.app/changelog",
    siteName: "Saliw",
    type: "website",
  },
};

export default function ChangelogPage() {
  let content = "";
  try {
    const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
    content = fs.readFileSync(changelogPath, "utf-8");
  } catch (err) {
    console.error("Failed to read CHANGELOG.md:", err);
  }

  const releases = parseChangelog(content);

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-brand-darker font-sans text-brand-espresso dark:text-brand-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Page Header */}
        <header className="mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-brown/10 text-brand-brown dark:bg-brand-tan/10 dark:text-brand-tan mb-3 select-none">
            <span>Release Notes</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream mb-3 font-sans">
            Changelog
          </h1>
          <p className="text-sm sm:text-base text-brand-brown dark:text-brand-tan max-w-2xl font-sans">
            All notable updates, improvements, and fixes to the Saliw Music
            Portal are documented here.
          </p>
        </header>

        {/* Content or Graceful Fallback */}
        {releases.length === 0 ? (
          <div
            className="rounded-3xl border border-brand-brown/20 dark:border-brand-tan/20 bg-brand-cream/30 dark:bg-brand-espresso/20 p-8 sm:p-12 text-center"
            role="status"
          >
            <p className="text-base font-semibold text-brand-espresso dark:text-brand-cream mb-1 font-sans">
              No changelog entries available.
            </p>
            <p className="text-xs text-brand-brown/80 dark:text-brand-tan/80 font-sans">
              Check back soon for new releases and updates.
            </p>
          </div>
        ) : (
          <ChangelogClientView releases={releases} />
        )}
      </div>
    </div>
  );
}
