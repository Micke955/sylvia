"use client";

import { useEffect, useState } from "react";
import type { BookRecord } from "@/lib/books";
import BookCard from "@/components/BookCard";

type RecommendationsResponse = {
  items: Array<BookRecord & { reason?: string }>;
  basis?: {
    type: "categories" | "titles";
    values: string[];
  };
  sources?: {
    library: number;
    wishlist: number;
  };
};

export default function RecommendationsPanel() {
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [offlineHint, setOfflineHint] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const response = await fetch("/api/recommendations");
      setLoading(false);
      if (!response.ok) {
        const cached = localStorage.getItem("sylvia:last-recos");
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as RecommendationsResponse;
            setData(parsed);
            setOfflineHint("Affichage des recommandations en cache.");
          } catch {
            setOfflineHint(null);
          }
        }
        return;
      }
      const payload = (await response.json()) as RecommendationsResponse;
      setData(payload);
      setOfflineHint(null);
      localStorage.setItem("sylvia:last-recos", JSON.stringify(payload));
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="soft-card rounded-3xl p-6 text-sm text-[var(--text-muted)]">
        Chargement des recommandations...
      </div>
    );
  }

  if (!data || !data.items.length) {
    return (
      <div className="soft-card rounded-3xl p-6 text-sm text-[var(--text-muted)]">
        Ajoutez des livres a votre bibliotheque ou wishlist pour obtenir des recommandations.
      </div>
    );
  }

  const basisLabel =
    data.basis?.type === "titles" ? "Titres recents" : "Categories favorites";

  const formatReason = (reason?: string) => {
    if (!reason) return null;
    if (reason.startsWith("Categorie proche:")) {
      return {
        label: "Categorie",
        detail: reason.replace("Categorie proche:", "").trim(),
        color: "bg-[var(--accent)]",
      };
    }
    if (reason.startsWith("Auteur similaire:")) {
      return {
        label: "Auteur",
        detail: reason.replace("Auteur similaire:", "").trim(),
        color: "bg-[var(--primary)]",
      };
    }
    if (reason.startsWith("Titre proche:")) {
      return {
        label: "Titre",
        detail: reason.replace("Titre proche:", "").trim(),
        color: "bg-emerald-400",
      };
    }
    return { label: "Suggestion", detail: reason, color: "bg-slate-300" };
  };

  return (
    <div className="space-y-6">
      <div className="soft-card rounded-3xl p-5 text-sm text-[var(--text-muted)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Recommandations personnalisees
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="font-medium text-[var(--text)]">{basisLabel}</span>
          {data.basis?.values?.length ? (
            <span className="text-[var(--text-muted)]">
              {data.basis.values.join(" • ")}
            </span>
          ) : null}
        </div>
        {data.sources ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Bibliotheque: {data.sources.library} · Wishlist: {data.sources.wishlist}
          </p>
        ) : null}
      </div>
      {offlineHint ? (
        <p className="text-xs text-[var(--text-muted)]">{offlineHint}</p>
      ) : null}
      <div className="grid gap-6 md:grid-cols-2">
        {data.items.map((book) => (
          <div key={book.id} className="space-y-2">
            <BookCard book={book} />
            {book.reason ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {(() => {
                  const parsed = formatReason(book.reason);
                  if (!parsed) return null;
                  return (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1">
                      <span className={`h-2 w-2 rounded-full ${parsed.color}`} />
                      <span className="font-medium">{parsed.label}</span>
                      <span className="text-[var(--text-muted)]">•</span>
                      <span className="text-[var(--text-muted)]">{parsed.detail}</span>
                    </span>
                  );
                })()}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
