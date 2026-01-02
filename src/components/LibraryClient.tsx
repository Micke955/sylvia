"use client";

import { useEffect, useMemo, useState } from "react";
import type { BookRecord } from "@/lib/books";
import { createClient } from "@/lib/supabase/client";
import { isValidCoverUrl, synopsisText } from "@/lib/utils";
import SynopsisModal from "@/components/SynopsisModal";

export type LibraryItem = {
  book_id: string;
  reading_status: string | null;
  reading_started_at: string | null;
  reading_finished_at: string | null;
  pages_total: number | null;
  pages_read: number | null;
  is_public_review: boolean | null;
  public_review: string | null;
  personal_note: string | null;
  rating: number | null;
  added_at: string;
  books: BookRecord;
};

type LibraryClientProps = {
  items: LibraryItem[];
};

export default function LibraryClient({ items }: LibraryClientProps) {
  const cacheKey = "sylvia_library_cache_v1";
  const filterCacheKey = "sylvia_library_filters_v1";
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [localItems, setLocalItems] = useState(items);
  const [hydrated, setHydrated] = useState(false);
  const [activeSynopsis, setActiveSynopsis] = useState<{
    title: string;
    description: string | null;
  } | null>(null);
  const [activeActions, setActiveActions] = useState<LibraryItem | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
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

      try {
        const saved = localStorage.getItem(filterCacheKey);
        if (saved) {
          const parsed = JSON.parse(saved) as {
            statusFilter?: string;
            sort?: string;
          };
          if (parsed.statusFilter) setStatusFilter(parsed.statusFilter);
          if (parsed.sort) {
            setSort(parsed.sort === "added" ? "recent" : parsed.sort);
          }
        }
      } catch {
        // ignore storage errors
      }

      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as LibraryItem[];
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
        .select(
          "book_id, reading_status, reading_started_at, reading_finished_at, pages_total, pages_read, is_public_review, public_review, personal_note, rating, added_at, books(*)",
        )
        .eq("in_library", true)
        .order("added_at", { ascending: false });

      if (error) {
        setHydrated(true);
        return;
      }

      setLocalItems((data ?? []) as LibraryItem[]);
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

  useEffect(() => {
    const appShell =
      typeof document !== "undefined"
        ? document.querySelector<HTMLElement>(".app-shell")
        : null;
    if (!appShell) return;
    const previousOverflow = appShell.style.overflow;
    if (activeActions) {
      appShell.style.overflow = "hidden";
      return () => {
        appShell.style.overflow = previousOverflow;
      };
    }
    appShell.style.overflow = previousOverflow;
  }, [activeActions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        filterCacheKey,
        JSON.stringify({ statusFilter, sort }),
      );
    } catch {
      // ignore storage errors
    }
  }, [filterCacheKey, sort, statusFilter]);

  const filtered = useMemo(() => {
    const filteredByCover = localItems.filter((item) => {
      const cover = item.books?.cover_url;
      if (!isValidCoverUrl(cover) || !item.books?.description) return false;
      return true;
    });
    const base =
      statusFilter === "all"
        ? filteredByCover
        : filteredByCover.filter((item) => item.reading_status === statusFilter);
    const cleanedQuery = query.trim().toLowerCase();
    const withQuery = cleanedQuery
      ? base.filter((item) => {
          const title = item.books.title.toLowerCase();
          const authors = item.books.authors.join(", ").toLowerCase();
          return title.includes(cleanedQuery) || authors.includes(cleanedQuery);
        })
      : base;

    const toTime = (value?: string | null, year?: number | null) => {
      if (value) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
      }
      if (year) {
        const parsed = new Date(`${year}-01-01`);
        if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
      }
      return 0;
    };

    if (sort === "recent") {
      return [...withQuery].sort(
        (a, b) =>
          toTime(b.added_at) - toTime(a.added_at) ||
          toTime(b.books.published_date, b.books.published_year) -
            toTime(a.books.published_date, a.books.published_year),
      );
    }

    if (sort === "release") {
      return [...withQuery].sort(
        (a, b) =>
          toTime(b.books.published_date, b.books.published_year) -
          toTime(a.books.published_date, a.books.published_year),
      );
    }

    if (sort === "rating") {
      return [...withQuery].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return [...withQuery].sort((a, b) =>
      a.books.title.localeCompare(b.books.title),
    );
  }, [localItems, query, sort, statusFilter]);

  const updateItem = async (bookId: string, data: Record<string, unknown>) => {
    const response = await fetch(`/api/user-books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) return;

    setLocalItems((prev) =>
      prev.map((item) =>
        item.book_id === bookId ? { ...item, ...data } : item,
      ),
    );
    setActiveActions((prev) =>
      prev?.book_id === bookId ? { ...prev, ...data } : prev,
    );
  };

  const removeItem = async (bookId: string) => {
    const response = await fetch(`/api/user-books/${bookId}`, {
      method: "DELETE",
    });

    if (!response.ok) return;

    setLocalItems((prev) => prev.filter((item) => item.book_id !== bookId));
  };

  const updateActiveItem = (bookId: string, data: Record<string, unknown>) => {
    setLocalItems((prev) =>
      prev.map((item) =>
        item.book_id === bookId ? { ...item, ...data } : item,
      ),
    );
    setActiveActions((prev) =>
      prev?.book_id === bookId ? { ...prev, ...data } : prev,
    );
  };

  const handleValidate = () => {
    setActionStatus("Modifications enregistrees.");
    setTimeout(() => {
      setActiveActions(null);
      setActionStatus(null);
    }, 900);
  };

  return (
    <>
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="input-field min-w-[220px] flex-1"
            placeholder="Rechercher un titre ou un auteur"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="text-xs text-[var(--text-muted)]">
            {filtered.length} resultat{filtered.length > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => setShowFilters((value) => !value)}
          >
            {showFilters ? "Masquer les filtres" : "Filtres"}
          </button>
          {query ? (
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => setQuery("")}
            >
              Effacer
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: "Tous" },
            { value: "to_read", label: "A lire" },
            { value: "reading", label: "En cours" },
            { value: "finished", label: "Lu" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={
                statusFilter === option.value ? "btn-secondary text-xs" : "btn-ghost text-xs"
              }
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {showFilters ? (
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm text-[var(--text-muted)]">Tri</label>
              <select
                className="input-field mt-2"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="recent">Recent</option>
                <option value="title">Titre</option>
                <option value="release">Date de sortie</option>
                <option value="rating">Note</option>
              </select>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {filtered.length ? (
          filtered.map((item) => (
            <article
              key={item.book_id}
              className="soft-card relative rounded-3xl p-5"
            >
              <span className="pill absolute right-4 top-4 text-[10px] uppercase tracking-[0.15em]">
                {statusLabels[item.reading_status ?? "to_read"]}
              </span>
              <div className="space-y-4">
                <div className="mx-auto aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
                  {item.books.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.books.cover_url}
                      alt={item.books.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="space-y-2">
                  <h3 className="section-title text-center text-lg font-semibold">
                    {item.books.title}
                  </h3>
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
                  className="btn-ghost text-sm"
                  onClick={() => removeItem(item.book_id)}
                >
                  Retirer
                </button>
              </div>
              <button
                type="button"
                className="btn-secondary absolute bottom-4 right-4 text-xs"
                onClick={() => setActiveActions(item)}
              >
                Actions
              </button>
            </article>
          ))
        ) : (
          <div className="soft-card rounded-3xl p-6 text-sm text-[var(--text-muted)]">
            {hydrated
              ? "Aucun livre dans votre bibliotheque pour ce filtre."
              : "Chargement de la bibliotheque..."}
          </div>
        )}
      </div>
    </div>
    <SynopsisModal
      open={Boolean(activeSynopsis)}
      title={activeSynopsis?.title ?? ""}
      description={activeSynopsis?.description ?? null}
      onClose={() => setActiveSynopsis(null)}
    />
    {activeActions ? (
      <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/40">
        <div className="flex min-h-full items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
          <div className="soft-card w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:max-h-[85vh]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="section-title text-2xl font-semibold">
                {activeActions.books.title}
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                {activeActions.books.authors.length
                  ? activeActions.books.authors.join(", ")
                  : "Auteur inconnu"}
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setActiveActions(null);
                setActionStatus(null);
              }}
            >
              Fermer
            </button>
          </div>
          <div className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <label className="text-[var(--text-muted)]">Statut</label>
              <select
                className="input-field mt-1"
                value={activeActions.reading_status ?? "to_read"}
                onChange={(event) =>
                  (() => {
                    updateActiveItem(activeActions.book_id, {
                      reading_status: event.target.value,
                    });
                    updateItem(activeActions.book_id, {
                      reading_status: event.target.value,
                    });
                  })()
                }
              >
                <option value="to_read">A lire</option>
                <option value="reading">En cours</option>
                <option value="finished">Lu</option>
              </select>
            </div>
            <div>
              <label className="text-[var(--text-muted)]">Note</label>
              <select
                className="input-field mt-1"
                value={activeActions.rating ?? 0}
                onChange={(event) =>
                  (() => {
                    const rating =
                      event.target.value === "0"
                        ? null
                        : Number(event.target.value);
                    updateActiveItem(activeActions.book_id, { rating });
                    updateItem(activeActions.book_id, { rating });
                  })()
                }
              >
                <option value={0}>Note</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}/5
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[var(--text-muted)]">Debut</label>
              <input
                type="date"
                className="input-field mt-1"
                value={activeActions.reading_started_at ?? ""}
                onChange={(event) =>
                  (() => {
                    const reading_started_at = event.target.value || null;
                    updateActiveItem(activeActions.book_id, {
                      reading_started_at,
                    });
                    updateItem(activeActions.book_id, { reading_started_at });
                  })()
                }
              />
            </div>
            <div>
              <label className="text-[var(--text-muted)]">Fin</label>
              <input
                type="date"
                className="input-field mt-1"
                value={activeActions.reading_finished_at ?? ""}
                onChange={(event) =>
                  (() => {
                    const reading_finished_at = event.target.value || null;
                    updateActiveItem(activeActions.book_id, {
                      reading_finished_at,
                    });
                    updateItem(activeActions.book_id, { reading_finished_at });
                  })()
                }
              />
            </div>
            <div>
              <label className="text-[var(--text-muted)]">Pages totales</label>
              <input
                type="number"
                min={0}
                className="input-field mt-1"
                value={activeActions.pages_total ?? ""}
                onChange={(event) =>
                  (() => {
                    const pages_total = event.target.value
                      ? Number(event.target.value)
                      : null;
                    updateActiveItem(activeActions.book_id, { pages_total });
                    updateItem(activeActions.book_id, { pages_total });
                  })()
                }
              />
            </div>
            <div>
              <label className="text-[var(--text-muted)]">Pages lues</label>
              <input
                type="number"
                min={0}
                className="input-field mt-1"
                value={activeActions.pages_read ?? ""}
                onChange={(event) =>
                  (() => {
                    const pages_read = event.target.value
                      ? Number(event.target.value)
                      : null;
                    updateActiveItem(activeActions.book_id, { pages_read });
                    updateItem(activeActions.book_id, { pages_read });
                  })()
                }
              />
            </div>
          </div>
          <textarea
            className="input-field mt-4"
            placeholder="Note personnelle"
            value={activeActions.personal_note ?? ""}
            onChange={(event) =>
              updateActiveItem(activeActions.book_id, {
                personal_note: event.target.value,
              })
            }
            onBlur={(event) =>
              updateItem(activeActions.book_id, {
                personal_note: event.target.value,
              })
            }
          />
          <div className="mt-4 space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={activeActions.is_public_review ?? false}
                onChange={(event) =>
                  (() => {
                    const is_public_review = event.target.checked;
                    updateActiveItem(activeActions.book_id, {
                      is_public_review,
                    });
                    updateItem(activeActions.book_id, { is_public_review });
                  })()
                }
              />
              Rendre mon avis public
            </label>
            <textarea
              className="input-field"
              placeholder="Mini avis public (max 280 caracteres)"
              maxLength={280}
              value={activeActions.public_review ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                updateActiveItem(activeActions.book_id, {
                  public_review: value,
                });
              }}
              onBlur={(event) =>
                updateItem(activeActions.book_id, {
                  public_review: event.target.value,
                })
              }
            />
            <p className="text-xs text-[var(--text-muted)]">
              {(activeActions.public_review ?? "").length}/280
            </p>
          </div>
          {actionStatus ? (
            <p className="mt-4 text-sm text-[var(--accent-strong)]">
              {actionStatus}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={handleValidate}
            >
              Valider
            </button>
          </div>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
