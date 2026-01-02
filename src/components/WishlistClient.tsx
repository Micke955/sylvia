"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BookRecord } from "@/lib/books";
import { createClient } from "@/lib/supabase/client";
import { isValidCoverUrl, synopsisText } from "@/lib/utils";
import SynopsisModal from "@/components/SynopsisModal";

export type WishlistItem = {
  book_id: string;
  added_at: string;
  reading_status: string | null;
  books: BookRecord;
};

type WishlistClientProps = {
  items: WishlistItem[];
};

export default function WishlistClient({ items }: WishlistClientProps) {
  const cacheKey = "sylvia_wishlist_cache_v1";
  const [localItems, setLocalItems] = useState(items);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [activeSynopsis, setActiveSynopsis] = useState<{
    title: string;
    description: string | null;
  } | null>(null);
  const statusLabels: Record<string, string> = {
    to_read: "A lire",
    reading: "En cours",
    finished: "Lu",
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (items.length) {
        setLocalItems(items);
        setHydrated(true);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(items));
        } catch {
          // ignore storage errors
        }
        return;
      }

      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as WishlistItem[];
          if (parsed.length) {
            setLocalItems(parsed);
          }
        } catch {
          // ignore cache errors
        }
      }
    }

    if (items.length) {
      setLocalItems(items);
      setHydrated(true);
      return;
    }

    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_books")
        .select("book_id, added_at, reading_status, books(*)")
        .eq("in_wishlist", true)
        .order("added_at", { ascending: false });

      if (error) {
        setHydrated(true);
        return;
      }

      setLocalItems((data ?? []) as WishlistItem[]);
      setHydrated(true);
    };

    load();
  }, [items]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(localItems));
    } catch {
      // ignore storage errors
    }
  }, [cacheKey, hydrated, localItems]);

  const moveToLibrary = async (bookId: string) => {
    const response = await fetch(`/api/user-books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ in_library: true, in_wishlist: false }),
    });

    if (!response.ok) return;

    setLocalItems((prev) => prev.filter((item) => item.book_id !== bookId));
    router.refresh();
  };

  const removeItem = async (bookId: string) => {
    const response = await fetch(`/api/user-books/${bookId}`, {
      method: "DELETE",
    });

    if (!response.ok) return;

    setLocalItems((prev) => prev.filter((item) => item.book_id !== bookId));
    router.refresh();
  };

  const visibleItems = localItems.filter((item) => {
    if (!isValidCoverUrl(item.books?.cover_url)) return false;
    return Boolean(item.books?.description);
  });

  return (
    <>
    <div className="grid gap-6 md:grid-cols-2">
    {visibleItems.length ? (
      visibleItems.map((item) => (
        <article key={item.book_id} className="soft-card rounded-3xl p-5">
            <div className="flex gap-4">
              <div className="h-24 w-16 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
                {item.books.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.books.cover_url}
                    alt={item.books.title}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="section-title text-lg font-semibold">
                  {item.books.title}
                </h3>
                <span className="pill text-[10px] uppercase tracking-[0.15em]">
                  {statusLabels[item.reading_status ?? "to_read"]}
                </span>
                <p className="text-xs text-[var(--text-muted)]">
                  {item.books.authors.length
                    ? item.books.authors.join(", ")
                    : "Auteur inconnu"}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {synopsisText(item.books.description)}
                </p>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() =>
                    setActiveSynopsis({
                      title: item.books.title,
                      description: item.books.description,
                    })
                  }
                >
                  Lire le synopsis
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={() => moveToLibrary(item.book_id)}
              >
                Deplacer vers bibliotheque
              </button>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => removeItem(item.book_id)}
              >
                Retirer
              </button>
            </div>
          </article>
        ))
    ) : (
      <div className="soft-card rounded-3xl p-6 text-sm text-[var(--text-muted)]">
        {hydrated
          ? "Aucun livre avec couverture et synopsis dans votre wishlist."
          : "Chargement de la wishlist..."}
      </div>
    )}
    </div>
    <SynopsisModal
      open={Boolean(activeSynopsis)}
      title={activeSynopsis?.title ?? ""}
      description={activeSynopsis?.description ?? null}
      onClose={() => setActiveSynopsis(null)}
    />
    </>
  );
}
