"use client";

import {
  createContext,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";
import SongListSkeleton from "@/components/library/SongListSkeleton";

interface FilterTransitionContextValue {
  isPending: boolean;
  startTransition: TransitionStartFunction;
}

const FilterTransitionContext =
  createContext<FilterTransitionContextValue | null>(null);

/**
 * LibraryFilterTransitionProvider — wraps the Library interactive filter controls
 * and song list so any filter or pagination URL transition shares a single `isPending` state.
 */
export function LibraryFilterTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  const value = useMemo(
    () => ({ isPending, startTransition }),
    [isPending, startTransition]
  );

  return (
    <FilterTransitionContext.Provider value={value}>
      {children}
    </FilterTransitionContext.Provider>
  );
}

/**
 * useFilterTransition — returns the shared transition context when mounted inside
 * `LibraryFilterTransitionProvider`, or falls back to a local `useTransition()` hook
 * when rendered standalone on other routes (such as `/setlists`).
 */
export function useFilterTransition(): FilterTransitionContextValue {
  const context = useContext(FilterTransitionContext);
  const [localIsPending, localStartTransition] = useTransition();

  if (context !== null) {
    return context;
  }

  return {
    isPending: localIsPending,
    startTransition: localStartTransition,
  };
}

/**
 * LibrarySongListSlot — swaps the server-rendered song list (or empty-state card)
 * with the 10-row `SongListSkeleton` while a filter or pagination transition is pending.
 */
export function LibrarySongListSlot({ children }: { children: ReactNode }) {
  const { isPending } = useFilterTransition();

  if (isPending) {
    return <SongListSkeleton />;
  }

  return <>{children}</>;
}
