import type { ReactElement } from "react";
import Link from "next/link";
import { ListMusic, Music, Sparkles } from "lucide-react";
import RecentSongs, {
  type RecentSong,
} from "@/components/dashboard/RecentSongs";
import UpcomingSetlists, {
  type UpcomingSetlist,
} from "@/components/dashboard/UpcomingSetlists";

interface FeatureCardProps {
  icon: ReactElement;
  title: string;
  description: string;
}

function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps): ReactElement {
  return (
    <section className="rounded-2xl border border-brand-tan/30 bg-brand-cream dark:bg-brand-espresso dark:border-brand-tan/20 p-6">
      <div
        className="text-brand-brown dark:text-brand-tan mb-3"
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 className="text-base font-bold text-brand-espresso dark:text-brand-cream mb-1">
        {title}
      </h3>
      <p className="text-sm text-brand-brown dark:text-brand-tan">
        {description}
      </p>
    </section>
  );
}

interface PublicDashboardViewProps {
  upcomingSetlists: UpcomingSetlist[];
  recentSongs: RecentSong[];
}

export default function PublicDashboardView({
  upcomingSetlists,
  recentSongs,
}: PublicDashboardViewProps): ReactElement {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-brand-espresso dark:text-brand-cream">
          Saliw{" "}
          <span className="text-brand-brown dark:text-brand-tan font-normal">
            (sa·líw)
          </span>
        </h1>
        <p className="text-lg text-brand-espresso dark:text-brand-cream italic max-w-prose">
          Saliw is the gentle art of accompaniment, where music and voice weave
          together in a soulful, rhythmic embrace.
        </p>
        <p className="text-base text-brand-brown dark:text-brand-tan max-w-prose">
          A space for worship leaders, musicians, and congregations — where
          every song finds its key, every setlist finds its flow, and every
          service is shared in sync.
        </p>

        {/* Public Hero CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            href="/library"
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl font-sans font-semibold text-base inline-flex items-center justify-center transition-colors duration-200 bg-brand-tan text-brand-espresso hover:bg-brand-brown hover:text-brand-cream border border-brand-tan hover:border-brand-brown focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2"
          >
            Browse Song Library →
          </Link>
          <Link
            href="/setlists"
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl font-sans font-semibold text-base inline-flex items-center justify-center transition-colors duration-200 bg-transparent text-brand-brown border border-brand-brown hover:bg-[var(--brand-tan-alpha)] dark:text-brand-tan dark:border-brand-tan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2"
          >
            Explore Setlists
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          icon={<Music size={24} aria-hidden="true" />}
          title="Chord charts that transpose"
          description="Change keys live without rewriting a single chord."
        />
        <FeatureCard
          icon={<ListMusic size={24} aria-hidden="true" />}
          title="Setlists that sync"
          description="Everyone sees the same song and key during service."
        />
        <FeatureCard
          icon={<Sparkles size={24} aria-hidden="true" />}
          title="Built for worship"
          description="Crafted for directors, musicians, and the moments in between."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentSongs songs={recentSongs} />
        <UpcomingSetlists setlists={upcomingSetlists} />
      </div>
    </div>
  );
}
