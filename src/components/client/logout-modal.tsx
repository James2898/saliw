"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import Button from "@/components/client/button";

interface LogoutModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isSigningOut?: boolean;
  error?: string | null;
}

/**
 * LogoutModal — Artisan-styled confirmation dialog for sign-out.
 *
 * Accessibility:
 * - role="dialog" + aria-modal="true" + aria-labelledby
 * - Focus moves to Cancel button on open; returns to trigger on close.
 * - Escape key dismisses without signing out.
 * - Tab cycles within the two buttons (focus trap).
 *
 * Loading / error feedback (TASK-034):
 * - When `isSigningOut` is true the Sign out button shows a Loader2 spinner
 *   and both action buttons are disabled to prevent double submission.
 * - When `error` is non-null an inline `role="alert"` message renders below
 *   the action row so screen readers announce the failure.
 */
export default function LogoutModal({
  isOpen,
  onConfirm,
  onCancel,
  isSigningOut = false,
  error = null,
}: LogoutModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Move focus to Cancel button when modal opens
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
        aria-labelledby="logout-modal-title"
        className={[
          "fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-[min(90vw,24rem)]",
          "bg-[var(--brand-background)] border border-brand-brown/20 rounded-2xl",
          "p-6 flex flex-col gap-4 shadow-lg",
        ].join(" ")}
      >
        {/* Title */}
        <h2
          id="logout-modal-title"
          className="font-sans font-bold text-base text-brand-espresso dark:text-brand-cream"
        >
          Sign out?
        </h2>

        {/* Body */}
        <p className="font-sans text-sm text-brand-brown dark:text-brand-tan">
          You&rsquo;ll be signed out of Saliw.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-1">
          <Button
            ref={cancelRef}
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSigningOut}
          >
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={isSigningOut}
            aria-label={isSigningOut ? "Signing out" : "Sign out"}
          >
            {isSigningOut ? (
              <>
                <Loader2
                  size={14}
                  className="animate-spin mr-2"
                  aria-hidden="true"
                />
                Signing out&hellip;
              </>
            ) : (
              "Sign out"
            )}
          </Button>
        </div>

        {/* Error message — sign-out failure feedback (TASK-034 AC-14) */}
        {error && (
          <p
            role="alert"
            className="text-sm font-medium text-red-700 dark:text-red-400"
          >
            {error}
          </p>
        )}
      </div>
    </>
  );
}
