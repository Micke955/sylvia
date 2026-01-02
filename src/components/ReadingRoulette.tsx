"use client";

import { useEffect, useMemo, useState } from "react";
import type { BookRecord } from "@/lib/books";
import { isValidCoverUrl, synopsisText } from "@/lib/utils";

type RouletteItem = {
  book: BookRecord;
  reason?: string;
};

export default function ReadingRoulette() {
  const [randomPicks, setRandomPicks] = useState<RouletteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanedItems = useMemo(
    () =>
      randomPicks.filter(
        (item) => isValidCoverUrl(item.book.cover_url) && item.book.description,
      ),
    [randomPicks],
  );
  const [current, setCurrent] = useState<RouletteItem | null>(null);
  const [initialPick, setInitialPick] = useState<RouletteItem | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const randomResponse = await fetch("/api/recommendations/random");
      setLoading(false);
      if (!randomResponse.ok) {
        setError("Impossible de charger la roulette.");
        return;
      }
      const payload = (await randomResponse.json()) as {
        items?: Array<BookRecord & { reason?: string }>;
      };
      const next = (payload.items ?? []).map((book) => ({
        book,
        reason: book.reason ?? "Decouverte",
      }));
      setCurrent(null);
      setInitialPick(null);
      setRandomPicks(next);
    };
    load();
  }, []);

  useEffect(() => {
    if (!cleanedItems.length) {
      setCurrent(null);
      return;
    }
    if (!current) {
      const randomIndex = Math.floor(Math.random() * cleanedItems.length);
      const picked = cleanedItems[randomIndex];
      setCurrent(picked);
      if (!initialPick) {
        setInitialPick(picked);
      }
    }
  }, [cleanedItems, current, initialPick]);

  if (!cleanedItems.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
        {loading
          ? "Chargement de la roulette..."
          : error
            ? error
            : "Aucune suggestion aleatoire pour le moment."}
        {!loading ? (
          <div className="mt-3">
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => {
                setRandomPicks([]);
                setCurrent(null);
                setInitialPick(null);
                setLoading(true);
                fetch("/api/recommendations/random")
                  .then((response) => response.json())
                  .then((payload: { items?: Array<BookRecord & { reason?: string }> }) => {
                    const next = (payload.items ?? []).map((book) => ({
                      book,
                      reason: book.reason ?? "Decouverte",
                    }));
                    setRandomPicks(next);
                  })
                  .catch(() => setError("Impossible de charger la roulette."))
                  .finally(() => setLoading(false));
              }}
            >
              Reessayer
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.4fr_0.6fr]">
      <div className="mx-auto aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
        {current?.book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.book.cover_url}
            alt={current.book.title}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="pill text-[10px] uppercase tracking-[0.15em]">
            Aleatoire
          </span>
          <span className="text-[var(--text-muted)]">Lecture surprise</span>
        </div>
        <h3 className="section-title text-xl font-semibold">
          {current?.book.title ?? "Choisissez un livre"}
        </h3>
        <p className="text-sm text-[var(--text-muted)]">
          {current?.book.authors.length
            ? current.book.authors.join(", ")
            : "Auteur inconnu"}
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          {synopsisText(current?.book.description ?? null, 220)}
        </p>
        {current?.reason ? (
          <p className="text-xs text-[var(--text-muted)]">
            Pourquoi ce livre : {current.reason}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={() => {
                if (!cleanedItems.length) return;
                const randomIndex = Math.floor(Math.random() * cleanedItems.length);
                setCurrent(cleanedItems[randomIndex]);
              }}
            >
              Surprends-moi
            </button>
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => {
              if (!initialPick) return;
              setCurrent(initialPick);
            }}
            disabled={!initialPick}
          >
            Revenir au premier
          </button>
        </div>
      </div>
    </div>
  );
}
