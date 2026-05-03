"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import Button from "@/components/client/button";

interface CloneSetlistDialogProps {
  isOpen: boolean;
  setlistName: string;
  isCloning: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * CloneSetlistDialog — Artisan-styled confirmation dialog for cloning a setlist.
 *
 * Accessibility:
 * - role="dialog" + aria-modal="true" + aria-labelledby
 * - Focus moves to Cancel button on open; returns to trigger on close.
 * - Escape key dismisses without cloning.
 * - Tab cycles within the two interactive buttons (focus trap).
 */
export default function CloneSetlistDialog({
  isOpen,
  setlistName,
  isCloning,
  onConfirm,
  onCancel,
}: CloneSetlistDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Move focus to Cancel button when dialog opens
  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  // Escape key + focus trap
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
        return;
      }

      // Focus trap — cycle between Cancel and Confirm buttons
      if (e.key === "Tab") {
        const focusables = [cancelRef.current, confirmRef.current].filter(
          Boolean
        ) as HTMLElement[];
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-brand-espresso/40"
        aria-hidden="true"
        onClick={onCancel}
      />

      {/* Dialog panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clone-setlist-dialog-title"
        className={[
          "fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-[min(90vw,24rem)]",
          "bg-[var(--brand-background)] border border-brand-brown/20 rounded-2xl",
          "p-6 flex flex-col gap-4 shadow-lg",
        ].join(" ")}
      >
        {/* Title */}
        <h2
          id="clone-setlist-dialog-title"
          className="font-sans font-bold text-base text-brand-espresso dark:text-brand-cream"
        >
          Clone setlist?
        </h2>

        {/* Body */}
        <p className="font-sans text-sm text-brand-brown dark:text-brand-tan">
          A copy of{" "}
          <span className="font-semibold text-brand-espresso dark:text-brand-cream">
            {setlistName}
          </span>{" "}
          will be created as &ldquo;{setlistName} copy&rdquo;. You will be taken
          to the new setlist.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-1">
          <Button
            ref={cancelRef}
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isCloning}
          >
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={isCloning}
            aria-label={isCloning ? "Cloning setlist" : "Clone setlist"}
          >
            {isCloning ? (
              <>
                <Loader2
                  size={14}
                  className="animate-spin mr-2"
                  aria-hidden="true"
                />
                Cloning&hellip;
              </>
            ) : (
              "Clone setlist"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
