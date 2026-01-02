"use client";

import { useEffect, useState } from "react";
import { normalizeAvatarUrl, synopsisText } from "@/lib/utils";
import SynopsisModal from "@/components/SynopsisModal";

type FeedItem = {
  book_id: string;
  user_id: string;
  added_at: string;
  rating: number | null;
  public_review: string | null;
  books: {
    title: string;
    authors: string[];
    cover_url: string | null;
    description?: string | null;
  };
  profile: {
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type TopReviewer = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  reviews: number;
};

type FeedResponse = {
  items: FeedItem[];
  topReviewers: TopReviewer[];
};

export default function FeedList() {
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState("recent");
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSynopsis, setActiveSynopsis] = useState<{
    title: string;
    description: string | null;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const response = await fetch(
        `/api/feed?minRating=${minRating}&sort=${sort}`,
      );
      setLoading(false);
      if (!response.ok) return;
      const payload = (await response.json()) as FeedResponse;
      setData(payload);
    };
    load();
  }, [minRating, sort]);

  return (
    <>
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-sm text-[var(--text-muted)]">Filtrer par note</label>
            <select
              className="input-field mt-2 w-full sm:w-60"
              value={minRating}
              onChange={(event) => setMinRating(Number(event.target.value))}
            >
              <option value={0}>Toutes les notes</option>
              <option value={5}>5 uniquement</option>
              <option value={4}>4 et +</option>
              <option value={3}>3 et +</option>
              <option value={2}>2 et +</option>
              <option value={1}>1 et +</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[var(--text-muted)]">Tri</label>
            <select
              className="input-field mt-2 w-full sm:w-52"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="recent">Plus recents</option>
              <option value="rating">Mieux notes</option>
            </select>
          </div>
        </div>
      </div>

      {data?.topReviewers?.length ? (
        <div className="soft-card rounded-2xl p-4">
          <p className="text-sm text-[var(--text-muted)]">Top reviewers</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {data.topReviewers.map((reviewer) => (
              <div
                key={reviewer.user_id}
                className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs"
              >
                <span className="h-6 w-6 overflow-hidden rounded-full border border-[var(--border)]">
                  {normalizeAvatarUrl(reviewer.avatar_url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={normalizeAvatarUrl(reviewer.avatar_url) ?? ""}
                      alt={reviewer.username ?? "Avatar"}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = "/logo.png";
                        event.currentTarget.classList.add("object-contain");
                      }}
                    />
                  ) : null}
                </span>
                <span>{reviewer.username ?? "Lecteur"}</span>
                <span className="text-[var(--text-muted)]">
                  {reviewer.reviews} avis
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="soft-card rounded-3xl p-6 text-sm text-[var(--text-muted)]">
          Chargement...
        </div>
      ) : data?.items?.length ? (
        <div className="grid gap-4">
          {data.items.map((item) => (
            <article
              key={`${item.user_id}-${item.book_id}`}
              className="soft-card rounded-3xl p-5"
            >
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-muted)]">
                  {normalizeAvatarUrl(item.profile?.avatar_url ?? null) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={normalizeAvatarUrl(item.profile?.avatar_url ?? null) ?? ""}
                      alt={item.profile.username ?? "Avatar"}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = "/logo.png";
                        event.currentTarget.classList.add("object-contain");
                      }}
                    />
                  ) : null}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-[var(--text)]">
                    {item.profile?.username ?? "Lecteur"} a partage un avis
                  </p>
                  <h2 className="section-title text-lg font-semibold">
                    {item.books?.title ?? "Titre"}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {item.books?.authors?.length
                      ? item.books.authors.join(", ")
                      : "Auteur inconnu"}
                  </p>
                  <p className="text-xs text-[var(--text)]/80">
                    {synopsisText(item.books?.description ?? null)}
                  </p>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() =>
                      setActiveSynopsis({
                        title: item.books?.title ?? "Synopsis",
                        description: item.books?.description ?? null,
                      })
                    }
                  >
                    Lire le synopsis
                  </button>
                  {item.rating ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      Note : {item.rating}/5
                    </p>
                  ) : null}
                  {item.public_review ? (
                    <div className="mt-2 rounded-2xl border border-[var(--border)] bg-white/5 p-3 text-sm text-[var(--text)]">
                      “{item.public_review}”
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="soft-card rounded-3xl p-6 text-sm text-[var(--text-muted)]">
          Aucun avis pour ce filtre.
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
