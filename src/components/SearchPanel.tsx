"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BookCard from "@/components/BookCard";
import type { BookRecord } from "@/lib/books";
import { isValidCoverUrl } from "@/lib/utils";
import { BrowserMultiFormatReader } from "@zxing/browser";

type SearchResponse = {
  items: BookRecord[];
  totalItems: number;
};

const sortByReleaseDate = (items: BookRecord[]) => {
  const toTime = (book: BookRecord) => {
    if (book.published_date) {
      const parsed = new Date(book.published_date);
      if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
    }
    if (book.published_year) {
      const parsed = new Date(`${book.published_year}-01-01`);
      if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
    }
    return 0;
  };
  return [...items].sort((a, b) => toTime(b) - toTime(a));
};

export default function SearchPanel() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"title" | "author" | "isbn" | "series">(
    "title",
  );
  const [includeOtherLanguages, setIncludeOtherLanguages] = useState(false);
  const [orderBy, setOrderBy] = useState("relevance");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineHint, setOfflineHint] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const portalTarget = useMemo(
    () => (typeof document !== "undefined" ? document.body : null),
    [],
  );
  useEffect(() => {
    const cached = localStorage.getItem("sylvia:last-search");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          result: SearchResponse;
          query: string;
          filter: "title" | "author" | "isbn";
          page: number;
          orderBy: string;
          includeOtherLanguages: boolean;
        };
        setResult(parsed.result);
        setQuery(parsed.query);
        setFilter(parsed.filter);
        setPage(parsed.page);
        setOrderBy(parsed.orderBy);
        setIncludeOtherLanguages(parsed.includeOtherLanguages);
      } catch {
        localStorage.removeItem("sylvia:last-search");
      }
    }
    const storedHistory = localStorage.getItem("sylvia:search-history");
    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory) as string[]);
      } catch {
        localStorage.removeItem("sylvia:search-history");
      }
    }
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSuggestLoading(true);
    const timer = setTimeout(async () => {
      const response = await fetch(
      `/api/books?query=${encodeURIComponent(query)}&filter=${filter}&page=1&lang=fr&includeOther=${includeOtherLanguages ? "1" : "0"}&orderBy=${orderBy}`,
      );
      setSuggestLoading(false);
      if (!response.ok) return;
      const data = (await response.json()) as SearchResponse;
      const titles = Array.from(
        new Set((data.items ?? []).map((item) => item.title)),
      ).slice(0, 5);
      setSuggestions(titles);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, filter, orderBy, includeOtherLanguages]);

  const saveHistory = useCallback((term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    setHistory((prev) => {
      const next = [
        cleaned,
        ...prev.filter((item) => item.toLowerCase() !== cleaned.toLowerCase()),
      ].slice(0, 6);
      localStorage.setItem("sylvia:search-history", JSON.stringify(next));
      return next;
    });
  }, []);

  const runSearch = useCallback(
    async (
      term: string,
      nextPage = 1,
      options?: { filter?: "title" | "author" | "isbn" | "series" },
    ) => {
      const cleanedTerm = term.trim();
      if (!cleanedTerm) {
        setError("Entrez une recherche.");
        return;
      }

      setError(null);
      setLoading(true);
      setPage(nextPage);
      const activeFilter = options?.filter ?? filter;

      const response = await fetch(
        `/api/books?query=${encodeURIComponent(cleanedTerm)}&filter=${activeFilter}&page=${nextPage}&lang=fr&includeOther=${includeOtherLanguages ? "1" : "0"}&orderBy=${orderBy}`,
      );

      setLoading(false);

      if (!response.ok) {
        setError("Impossible de recuperer les resultats.");
        const cached = localStorage.getItem("sylvia:last-search");
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as { result: SearchResponse };
            setResult(parsed.result);
            setOfflineHint("Affichage des derniers livres en cache.");
          } catch {
            setOfflineHint(null);
          }
        }
        return;
      }

      const data = (await response.json()) as SearchResponse;
      const cleanedItems = (data.items ?? [])
        .filter((item) => {
          if (!isValidCoverUrl(item.cover_url)) return false;
          if (!includeOtherLanguages && item.language && item.language !== "fr") {
            return false;
          }
          return true;
        })
        .filter((item, index, array) => {
          return array.findIndex((entry) => entry.id === item.id) === index;
        });
      const cleanedData = { ...data, items: cleanedItems };
      const sortedData =
        orderBy === "newest"
          ? { ...cleanedData, items: sortByReleaseDate(cleanedItems) }
          : cleanedData;
      setResult(sortedData);
      saveHistory(cleanedTerm);
      setOfflineHint(null);
      localStorage.setItem(
        "sylvia:last-search",
        JSON.stringify({
          result: sortedData,
          query: cleanedTerm,
          filter: activeFilter,
          page: nextPage,
          orderBy,
            includeOtherLanguages,
        }),
      );
    },
    [filter, includeOtherLanguages, orderBy, saveHistory],
  );

  const handleSearch = async (nextPage = 1) => {
    await runSearch(query, nextPage);
  };

  useEffect(() => {
    if (!scannerOpen) return;
    if (!videoRef.current) return;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    setScanError(null);
    setScanLoading(true);

    const start = async () => {
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!result || cancelled) return;
            const text = result.getText();
            if (!text) return;
            setQuery(text);
            setFilter("isbn");
            setScannerOpen(false);
            setScanLoading(false);
            runSearch(text, 1, { filter: "isbn" });
          },
        );
        scannerControlsRef.current = controls;
      } catch (err) {
        if (!cancelled) {
          setScanError("Camera indisponible sur cet appareil.");
        }
      } finally {
        if (!cancelled) setScanLoading(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      setScanLoading(false);
      try {
        scannerControlsRef.current?.stop();
      } catch {
        // ignore
      }
      scannerControlsRef.current = null;
    };
  }, [scannerOpen, runSearch]);

  return (
    <section className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.4fr_0.4fr_0.4fr_auto] lg:items-end">
          <div>
            <label className="text-sm text-[var(--text-muted)]">
              Rechercher un livre
            </label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Ex: Dune, Margaret Atwood, 978..."
              className="input-field mt-2"
            />
            <button
              type="button"
              className="btn-secondary mt-3 w-full text-sm sm:w-auto lg:hidden"
              onClick={() => setScannerOpen(true)}
            >
              Scanner ISBN
            </button>
            {showSuggestions && (suggestions.length || history.length) ? (
              <div className="soft-card mt-2 rounded-2xl p-3 text-xs text-[var(--text-muted)]">
                {history.length ? (
                  <div className="mb-2">
                    <p className="mb-1 text-[var(--text)]">Historique</p>
                    <div className="flex flex-wrap gap-2">
                      {history.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="btn-ghost text-xs"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setQuery(item);
                            handleSearch(1);
                          }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div>
                  <p className="mb-1 text-[var(--text)]">
                    Suggestions {suggestLoading ? "..." : ""}
                  </p>
                  <div className="flex flex-col gap-1">
                    {suggestions.length ? (
                      suggestions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className="btn-ghost text-left text-xs"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setQuery(item);
                            handleSearch(1);
                          }}
                        >
                          {item}
                        </button>
                      ))
                    ) : (
                      <span className="text-[var(--text-muted)]">
                        Aucune suggestion.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)]">Filtre</label>
            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value as "title" | "author" | "isbn" | "series",
                )
              }
              className="input-field mt-2"
            >
              <option value="title">Titre</option>
              <option value="author">Auteur</option>
              <option value="isbn">ISBN</option>
              <option value="series">Serie</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={includeOtherLanguages}
                onChange={(event) => setIncludeOtherLanguages(event.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Afficher d'autres langues
            </label>
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)]">Tri</label>
            <select
              value={orderBy}
              onChange={(event) => setOrderBy(event.target.value)}
              className="input-field mt-2"
            >
              <option value="relevance">Pertinence</option>
              <option value="newest">Recents</option>
            </select>
          </div>
          <button
            type="button"
            className="btn-primary h-12"
            onClick={() => handleSearch(1)}
          >
            {loading ? "Recherche..." : "Lancer"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-[var(--primary-strong)]">{error}</p> : null}
        {offlineHint ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">{offlineHint}</p>
        ) : null}
      </div>

      {scannerOpen && portalTarget
        ? createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/70">
              <div className="flex min-h-full items-center justify-center px-4 py-6">
                <div className="soft-card w-full max-w-md rounded-3xl p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="section-title text-lg font-semibold">
                      Scanner un ISBN
                    </h3>
                    <button
                      type="button"
                      className="btn-ghost text-sm"
                      onClick={() => setScannerOpen(false)}
                    >
                      Fermer
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Pointez le code-barres ISBN du livre.
                  </p>
                  <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
                    <video ref={videoRef} className="h-64 w-full object-cover" />
                  </div>
                  {scanLoading ? (
                    <p className="mt-3 text-xs text-[var(--text-muted)]">
                      Ouverture de la camera...
                    </p>
                  ) : null}
                  {scanError ? (
                    <p className="mt-3 text-xs text-[var(--primary-strong)]">
                      {scanError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}

      {result ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
            <span>{result.totalItems} resultats</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => handleSearch(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Page precedente
              </button>
              <span>Page {page}</span>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => handleSearch(page + 1)}
                disabled={result.items.length === 0}
              >
                Page suivante
              </button>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {result.items.length ? (
              result.items.map((book) => <BookCard key={book.id} book={book} />)
            ) : (
              <div className="soft-card rounded-2xl p-6 text-sm text-[var(--text-muted)]">
                Aucun resultat pour cette recherche.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
