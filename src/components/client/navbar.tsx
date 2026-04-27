"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Music,
  LayoutDashboard,
  Library,
  List,
  Moon,
  Sun,
  LogIn,
  LogOut,
  Menu,
  X,
  UserRound,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/services/supabase/client";
import type { User } from "@supabase/supabase-js";
import LogoutModal from "@/components/client/logout-modal";

const navLinks = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/library", label: "Library", Icon: Library },
  { href: "/setlists", label: "Setlists", Icon: List },
  { href: "/musicians", label: "Musicians", Icon: UsersRound },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isDark, setIsDark] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("theme") === "dark"
  );
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const desktopLogoutRef = useRef<HTMLButtonElement>(null);
  const sidebarLogoutRef = useRef<HTMLButtonElement>(null);

  // Track which trigger opened the modal so we can return focus on close
  const logoutTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Keep document.documentElement in sync with isDark state
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Subscribe to Supabase auth state changes; fetch full name from profiles table
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Fetch full_name from the profiles table (authoritative source).
        // RLS policy profiles_select_own ensures the user can only read their own row.
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", currentUser.id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error("Failed to fetch profile name:", error.message);
            }
            setFullName(data?.full_name ?? null);
          });
      } else {
        setFullName(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  function openSidebar() {
    setIsOpen(true);
  }

  function closeSidebar() {
    setIsOpen(false);
    hamburgerButtonRef.current?.focus();
  }

  // Escape key listener and body scroll lock when sidebar is open
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeSidebar();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  function openLogoutModal(triggerRef: React.RefObject<HTMLButtonElement | null>) {
    logoutTriggerRef.current = triggerRef.current;
    setShowLogoutModal(true);
  }

  function handleLogoutCancel() {
    setShowLogoutModal(false);
    logoutTriggerRef.current?.focus();
    logoutTriggerRef.current = null;
  }

  async function handleLogoutConfirm() {
    setShowLogoutModal(false);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out failed:", error.message);
        return;
      }
      router.refresh();
    } catch (err) {
      console.error("Unexpected sign out error:", err);
    }
  }

  function handleLoginClick() {
    router.push("/login");
  }

  // Greeting text — "Hi, {name}!" or fallback "Hi there!"
  const greetingText = user
    ? `Hi, ${fullName?.trim() || "there"}!`
    : null;

  // Shared icon button class string to avoid repetition
  const iconBtnClass = [
    "flex items-center justify-center w-9 h-9 rounded-lg",
    "text-brand-espresso dark:text-brand-cream",
    "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
    "transition-colors duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2",
  ].join(" ");

  // Auth button class — wider to accommodate text label
  const authBtnClass = [
    "flex items-center gap-2 px-3 h-9 rounded-lg",
    "text-brand-espresso dark:text-brand-cream",
    "text-sm font-sans font-semibold",
    "hover:bg-brand-brown/10 dark:hover:bg-brand-tan/10",
    "transition-colors duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2",
  ].join(" ");

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[var(--brand-background)] border-b border-brand-brown/20 text-brand-espresso dark:text-brand-espresso">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center gap-4">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2 rounded-lg"
            aria-label="Saliw home"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-brown text-brand-cream">
              <Music size={16} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="font-sans font-bold text-base text-brand-espresso dark:text-brand-cream">
              Saliw
            </span>
          </Link>

          {/* Desktop navigation links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-1 ml-4">
            {navLinks.map(({ href, label, Icon }) => {
              if (href === "/musicians" && !user) return null;
              const isActive =
                pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold font-sans",
                    "transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2",
                    isActive
                      ? "bg-brand-brown/10 text-brand-brown dark:bg-brand-tan/10 dark:text-brand-tan"
                      : "text-brand-espresso dark:text-brand-cream hover:bg-brand-brown/10 hover:text-brand-brown dark:hover:bg-brand-tan/10 dark:hover:text-brand-tan",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon size={15} strokeWidth={2} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Desktop controls — hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className={iconBtnClass}
            >
              {isDark ? (
                <Sun size={18} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Moon size={18} strokeWidth={2} aria-hidden="true" />
              )}
            </button>

            {/* Authenticated greeting */}
            {greetingText && (
              <span className="font-sans font-semibold text-sm text-brand-espresso dark:text-brand-cream whitespace-nowrap">
                {greetingText}
              </span>
            )}

            {user && (
              <Link
                href="/profile"
                aria-label="Your profile"
                className={[
                  iconBtnClass,
                  pathname === "/profile"
                    ? "bg-brand-brown/10 text-brand-brown dark:bg-brand-tan/10 dark:text-brand-tan"
                    : "",
                ].join(" ")}
              >
                <UserRound size={18} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}

            {user ? (
              /* Logout button with inline label */
              <button
                ref={desktopLogoutRef}
                type="button"
                onClick={() => openLogoutModal(desktopLogoutRef)}
                aria-label="Sign out"
                className={authBtnClass}
              >
                <span>Logout</span>
                <LogOut size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : (
              /* Login button with inline label */
              <button
                type="button"
                onClick={handleLoginClick}
                aria-label="Sign in"
                className={authBtnClass}
              >
                <span>Login</span>
                <LogIn size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Mobile hamburger button — visible only on mobile */}
          <button
            ref={hamburgerButtonRef}
            type="button"
            onClick={openSidebar}
            aria-label="Open navigation menu"
            aria-expanded={isOpen}
            aria-controls="mobile-sidebar"
            className={[
              "md:hidden",
              iconBtnClass,
            ].join(" ")}
          >
            <Menu size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </nav>

      {/* ── Logout confirmation modal ─────────────────────────────────────── */}
      <LogoutModal
        isOpen={showLogoutModal}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />

      {/* ── Mobile sidebar drawer ─────────────────────────────────────────── */}

      {/* Backdrop overlay */}
      <div
        id="mobile-sidebar-backdrop"
        onClick={closeSidebar}
        aria-hidden="true"
        className={[
          "fixed inset-0 z-[60] bg-brand-espresso/40",
          "transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      />

      {/* Sidebar panel */}
      <aside
        id="mobile-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={[
          "fixed top-0 left-0 z-[70] h-full w-72",
          "bg-[var(--brand-background)] border-r border-brand-brown/20",
          "flex flex-col",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Sidebar header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-brand-brown/20 shrink-0">
          <Link
            href="/"
            onClick={closeSidebar}
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2 rounded-lg"
            aria-label="Saliw home"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-brown text-brand-cream">
              <Music size={16} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="font-sans font-bold text-base text-brand-espresso dark:text-brand-cream">
              Saliw
            </span>
          </Link>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeSidebar}
            aria-label="Close navigation menu"
            className={iconBtnClass}
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Sidebar nav links */}
        <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1 list-none m-0 p-0">
            {navLinks.map(({ href, label, Icon }) => {
              if (href === "/musicians" && !user) return null;
              const isActive =
                pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={closeSidebar}
                    className={[
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold font-sans",
                      "transition-colors duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brown focus-visible:ring-offset-2",
                      isActive
                        ? "bg-brand-brown/10 text-brand-brown dark:bg-brand-tan/10 dark:text-brand-tan"
                        : "text-brand-espresso dark:text-brand-cream hover:bg-brand-brown/10 hover:text-brand-brown dark:hover:bg-brand-tan/10 dark:hover:text-brand-tan",
                    ].join(" ")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon size={18} strokeWidth={2} aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar footer — greeting + theme toggle + auth */}
        <div className="shrink-0 px-3 py-4 border-t border-brand-brown/20 flex flex-col gap-2">
          {/* Greeting (authenticated only) */}
          {greetingText && (
            <span className="font-sans font-semibold text-sm text-brand-espresso dark:text-brand-cream px-3">
              {greetingText}
            </span>
          )}

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className={[iconBtnClass, "flex-1 justify-start gap-3 px-3 text-sm font-semibold font-sans w-auto h-auto py-2.5"].join(" ")}
            >
              {isDark ? (
                <Sun size={18} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Moon size={18} strokeWidth={2} aria-hidden="true" />
              )}
              <span>{isDark ? "Light mode" : "Dark mode"}</span>
            </button>

            {/* Profile link (authenticated only) */}
            {user && (
              <Link
                href="/profile"
                onClick={closeSidebar}
                aria-label="Your profile"
                className={[
                  iconBtnClass,
                  pathname === "/profile"
                    ? "bg-brand-brown/10 text-brand-brown dark:bg-brand-tan/10 dark:text-brand-tan"
                    : "",
                ].join(" ")}
              >
                <UserRound size={18} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}

            {/* Auth action */}
            {user ? (
              <button
                ref={sidebarLogoutRef}
                type="button"
                onClick={() => {
                  closeSidebar();
                  // Brief delay so sidebar closes before modal opens (avoids z-index overlap)
                  setTimeout(() => openLogoutModal(sidebarLogoutRef), 50);
                }}
                aria-label="Sign out"
                className={iconBtnClass}
              >
                <LogOut size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeSidebar();
                  handleLoginClick();
                }}
                aria-label="Sign in"
                className={iconBtnClass}
              >
                <LogIn size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
