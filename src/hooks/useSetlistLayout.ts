import { useState, useCallback } from "react";

export type ContentWidth = "centered" | "full";
export type PageColumns = 1 | 2 | 3;
export type LayoutMode = "scroll" | "page";
export type OverflowBehavior = "paginate" | "fit";

export interface SetlistLayoutSettings {
  lineHeight: number;
  contentWidth: ContentWidth;
  layoutMode: LayoutMode;
  pageColumns: PageColumns;
  overflowBehavior: OverflowBehavior;
}

export interface UseSetlistLayoutReturn {
  settings: SetlistLayoutSettings;
  lineHeight: number;
  contentWidth: ContentWidth;
  layoutMode: LayoutMode;
  pageColumns: PageColumns;
  overflowBehavior: OverflowBehavior;
  increaseLineHeight: () => void;
  decreaseLineHeight: () => void;
  resetLineHeight: () => void;
  setContentWidth: (width: ContentWidth) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setPageColumns: (columns: PageColumns) => void;
  setOverflowBehavior: (behavior: OverflowBehavior) => void;
}

const STORAGE_KEY = "saliw-layout-settings";

export const MIN_LINE_HEIGHT = 1.2;
export const MAX_LINE_HEIGHT = 2.4;
export const DEFAULT_LINE_HEIGHT = 1.8;
export const LINE_HEIGHT_STEP = 0.1;

export const DEFAULT_LAYOUT_SETTINGS: SetlistLayoutSettings = {
  lineHeight: DEFAULT_LINE_HEIGHT,
  contentWidth: "centered",
  layoutMode: "scroll",
  pageColumns: 1,
  overflowBehavior: "paginate",
};

function clampLineHeight(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Math.min(MAX_LINE_HEIGHT, Math.max(MIN_LINE_HEIGHT, rounded));
}

function readStoredSettings(): SetlistLayoutSettings {
  if (typeof window === "undefined") return DEFAULT_LAYOUT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = JSON.parse(stored) as Partial<SetlistLayoutSettings>;
      const lineHeight =
        typeof parsed.lineHeight === "number"
          ? clampLineHeight(parsed.lineHeight)
          : DEFAULT_LAYOUT_SETTINGS.lineHeight;

      const contentWidth: ContentWidth =
        parsed.contentWidth === "full" ? "full" : "centered";

      const layoutMode: LayoutMode =
        parsed.layoutMode === "page" ? "page" : "scroll";

      const pageColumns: PageColumns =
        parsed.pageColumns === 2 || parsed.pageColumns === 3
          ? parsed.pageColumns
          : 1;

      const overflowBehavior: OverflowBehavior =
        parsed.overflowBehavior === "fit" ? "fit" : "paginate";

      return {
        lineHeight,
        contentWidth,
        layoutMode,
        pageColumns,
        overflowBehavior,
      };
    }
  } catch {
    // localStorage unavailable or invalid JSON — fallback to default
  }
  return DEFAULT_LAYOUT_SETTINGS;
}

export function useSetlistLayout(): UseSetlistLayoutReturn {
  const [settings, setSettings] = useState<SetlistLayoutSettings>(readStoredSettings);

  const persist = useCallback((nextSettings: SetlistLayoutSettings) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
      }
    } catch {
      // localStorage unavailable — non-fatal
    }
  }, []);

  const increaseLineHeight = useCallback(() => {
    setSettings((prev) => {
      const nextLineHeight = clampLineHeight(prev.lineHeight + LINE_HEIGHT_STEP);
      const next = { ...prev, lineHeight: nextLineHeight };
      persist(next);
      return next;
    });
  }, [persist]);

  const decreaseLineHeight = useCallback(() => {
    setSettings((prev) => {
      const nextLineHeight = clampLineHeight(prev.lineHeight - LINE_HEIGHT_STEP);
      const next = { ...prev, lineHeight: nextLineHeight };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetLineHeight = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, lineHeight: DEFAULT_LINE_HEIGHT };
      persist(next);
      return next;
    });
  }, [persist]);

  const setContentWidth = useCallback(
    (width: ContentWidth) => {
      setSettings((prev) => {
        const next = { ...prev, contentWidth: width };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setLayoutMode = useCallback(
    (mode: LayoutMode) => {
      setSettings((prev) => {
        const next: SetlistLayoutSettings = {
          ...prev,
          layoutMode: mode,
          // When page mode with 2 or 3 columns is set or mode changes, ensure consistency
          contentWidth:
            mode === "page" && prev.pageColumns > 1 ? "full" : prev.contentWidth,
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setPageColumns = useCallback(
    (columns: PageColumns) => {
      setSettings((prev) => {
        // When multi-page mode (2 or 3 columns) is enabled, content width automatically defaults to Full Width (AC-5)
        const nextWidth = columns > 1 ? "full" : prev.contentWidth;
        const next: SetlistLayoutSettings = {
          ...prev,
          pageColumns: columns,
          contentWidth: nextWidth,
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setOverflowBehavior = useCallback(
    (behavior: OverflowBehavior) => {
      setSettings((prev) => {
        const next = { ...prev, overflowBehavior: behavior };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return {
    settings,
    lineHeight: settings.lineHeight,
    contentWidth: settings.contentWidth,
    layoutMode: settings.layoutMode,
    pageColumns: settings.pageColumns,
    overflowBehavior: settings.overflowBehavior,
    increaseLineHeight,
    decreaseLineHeight,
    resetLineHeight,
    setContentWidth,
    setLayoutMode,
    setPageColumns,
    setOverflowBehavior,
  };
}
