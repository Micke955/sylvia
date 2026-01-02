"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import SignOutButton from "@/components/SignOutButton";
import AvatarImage from "@/components/AvatarImage";
import { formatUsername, normalizeAvatarUrl } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Profile = {
  username: string | null;
  avatar_url: string | null;
};

type SiteNavProps = {
  user: User | null;
  profile: Profile | null;
};

export default function SiteNav({ user, profile }: SiteNavProps) {
  const avatarUrl = normalizeAvatarUrl(profile?.avatar_url ?? null);
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!menuOpen || !triggerRef.current) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 208;
      const padding = 8;
      const left = Math.min(
        Math.max(padding, rect.right - menuWidth),
        window.innerWidth - menuWidth - padding,
      );
      setMenuPos({
        top: rect.bottom + 8,
        left,
        width: rect.width,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen]);

  return (
    <header className="site-nav fixed inset-x-0 top-0 z-50 isolate border-b border-[var(--border)] bg-[color-mix(in srgb,var(--surface) 90%,transparent)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-4">
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href={user ? "/home" : "/"}
            className="flex items-center gap-2 sm:gap-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="SYLVIA"
              className="logo-spin h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20"
            />
            <span className="site-title hidden text-lg font-semibold sm:inline sm:text-xl lg:text-2xl">
              SYLVIA
            </span>
          </Link>
        </div>
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 text-sm lg:flex">
          <Link href="/search" className="btn-ghost whitespace-nowrap">
            Recherche
          </Link>
          <Link href="/home" className="btn-ghost whitespace-nowrap">
            Accueil
          </Link>
          <Link href="/library" className="btn-ghost whitespace-nowrap">
            Bibliotheque
          </Link>
          <Link href="/wishlist" className="btn-ghost whitespace-nowrap">
            Wishlist
          </Link>
          <Link href="/profile" className="btn-ghost whitespace-nowrap">
            Profil
          </Link>
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              className="btn-ghost whitespace-nowrap"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              Plus
            </button>
          </div>
        </nav>
        <div className="flex min-w-0 items-center gap-1 overflow-hidden rounded-full border border-[var(--glass-border)] bg-[color-mix(in srgb,var(--surface) 75%,transparent)] px-2 py-1.5 shadow-lg shadow-black/20 sm:gap-2 sm:px-3 sm:py-2">
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 text-sm">
                <span className="h-8 w-8 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-muted)]">
                  {avatarUrl ? (
                    <AvatarImage
                      src={avatarUrl}
                      alt={profile.username ?? "Avatar"}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </span>
                <span className="hidden max-w-[120px] truncate lg:inline">
                  {formatUsername(profile?.username) || user.email}
                </span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="btn-secondary text-xs !px-3 !py-2 sm:text-sm sm:!px-4 sm:!py-2.5"
              >
                Connexion
              </Link>
              <Link
                href="/signup"
                className="btn-primary text-xs !px-3 !py-2 sm:text-sm sm:!px-4 sm:!py-2.5"
              >
                Inscription
              </Link>
            </>
          )}
        </div>
      </div>
      {menuOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999]"
              onClick={() => setMenuOpen(false)}
            >
              <div
                className="absolute rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg shadow-black/40"
                style={{
                  top: menuPos.top,
                  left: menuPos.left,
                  width: 208,
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <Link
                  href="/stats"
                  className="btn-ghost block w-full text-left"
                  onClick={() => setMenuOpen(false)}
                >
                  Statistiques
                </Link>
                <Link
                  href="/feed"
                  className="btn-ghost block w-full text-left"
                  onClick={() => setMenuOpen(false)}
                >
                  Feed
                </Link>
                <Link
                  href="/recommendations"
                  className="btn-ghost block w-full text-left"
                  onClick={() => setMenuOpen(false)}
                >
                  Recommandations
                </Link>
              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}
