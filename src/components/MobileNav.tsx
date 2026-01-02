import Link from "next/link";
import type { User } from "@supabase/supabase-js";

type MobileNavProps = {
  user: User | null;
};

const items = [
  { href: "/home", label: "Accueil", icon: "home" },
  { href: "/search", label: "Recherche", icon: "search" },
  { href: "/library", label: "Bibliotheque", icon: "library" },
  { href: "/wishlist", label: "Wishlist", icon: "wishlist" },
  { href: "/profile", label: "Profil", icon: "profile" },
  { href: "/menu", label: "Plus", icon: "more" },
];

function Icon({ name }: { name: string }) {
  switch (name) {
    case "search":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" />
          <line
            x1="16.5"
            y1="16.5"
            x2="21"
            y2="21"
            stroke="currentColor"
          />
        </svg>
      );
    case "home":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M4 11.5l8-6 8 6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.5 10.5V19h11V10.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
          />
        </svg>
      );
    case "library":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <rect x="4" y="5" width="4" height="14" fill="none" stroke="currentColor" />
          <rect x="10" y="5" width="4" height="14" fill="none" stroke="currentColor" />
          <rect x="16" y="5" width="4" height="14" fill="none" stroke="currentColor" />
        </svg>
      );
    case "wishlist":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M12 19l-6.5-6.5a4 4 0 0 1 5.7-5.7L12 7l.8-.2a4 4 0 0 1 5.7 5.7z"
            fill="none"
            stroke="currentColor"
          />
        </svg>
      );
    case "feed":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="6" cy="12" r="2" fill="currentColor" />
          <line x1="10" y1="8" x2="20" y2="8" stroke="currentColor" />
          <line x1="10" y1="12" x2="20" y2="12" stroke="currentColor" />
          <line x1="10" y1="16" x2="20" y2="16" stroke="currentColor" />
        </svg>
      );
    case "list":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="6" cy="7" r="1.5" fill="currentColor" />
          <circle cx="6" cy="12" r="1.5" fill="currentColor" />
          <circle cx="6" cy="17" r="1.5" fill="currentColor" />
          <line x1="10" y1="7" x2="20" y2="7" stroke="currentColor" />
          <line x1="10" y1="12" x2="20" y2="12" stroke="currentColor" />
          <line x1="10" y1="17" x2="20" y2="17" stroke="currentColor" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" />
          <path
            d="M5 20a7 7 0 0 1 14 0"
            fill="none"
            stroke="currentColor"
          />
        </svg>
      );
    case "more":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="6" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="18" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

export default function MobileNav({ user }: MobileNavProps) {
  return (
    <nav className="mobile-nav fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-2 border-t border-[var(--border)] bg-[color-mix(in srgb,var(--surface) 90%,transparent)] px-2 py-2 backdrop-blur lg:hidden">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-1 flex-col items-center gap-1 text-[9px] text-[var(--text-muted)]"
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </Link>
      ))}
      {user ? null : (
        <Link
          href="/login"
          className="flex flex-1 flex-col items-center gap-1 text-[9px] text-[var(--text-muted)]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path
              d="M10 7l5 5-5 5"
              fill="none"
              stroke="currentColor"
            />
            <rect
              x="4"
              y="5"
              width="12"
              height="14"
              rx="2"
              fill="none"
              stroke="currentColor"
            />
          </svg>
          <span>Connexion</span>
        </Link>
      )}
    </nav>
  );
}
