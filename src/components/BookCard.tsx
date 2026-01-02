"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookRecord } from "@/lib/books";
import { isValidCoverUrl, synopsisText } from "@/lib/utils";
import SynopsisModal from "@/components/SynopsisModal";

type BookCardProps = {
  book: BookRecord;
};

export default function BookCard({ book }: BookCardProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [flags, setFlags] = useState({ inLibrary: false, inWishlist: false });
  const [openSynopsis, setOpenSynopsis] = useState(false);
  const router = useRouter();
  if (!isValidCoverUrl(book.cover_url)) {
    return null;
  }

  const handleAdd = async (mode: "library" | "wishlist") => {
    setStatus("Envoi...");
    const response = await fetch("/api/user-books", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        book,
        inLibrary: mode === "library",
        inWishlist: mode === "wishlist",
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        alreadyInLibrary?: boolean;
        alreadyInWishlist?: boolean;
      };
      if (mode === "library") {
        if (data.alreadyInLibrary) {
          setStatus("Deja dans la bibliotheque.");
        } else {
          setStatus("Ajoute a la bibliotheque.");
        }
        setFlags((prev) => ({ ...prev, inLibrary: true }));
      } else {
        if (data.alreadyInWishlist) {
          setStatus("Deja dans la wishlist.");
        } else {
          setStatus("Ajoute a la wishlist.");
        }
        setFlags((prev) => ({ ...prev, inWishlist: true }));
      }
      router.refresh();
      return;
    }

    if (response.status === 409) {
      const data = (await response.json()) as { message?: string };
      setStatus(data.message ?? "Deja dans la bibliotheque.");
      return;
    }

    if (response.status === 401) {
      setStatus("Connectez-vous pour ajouter.");
      return;
    }

    setStatus("Erreur lors de l'ajout.");
  };

  return (
    <article className="soft-card flex flex-col gap-4 rounded-3xl p-5">
      <div className="flex gap-4">
        <div className="h-28 w-20 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
          {book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover_url}
              alt={book.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--text-muted)]">
              Sans couverture
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="section-title text-lg font-semibold">{book.title}</h3>
          <p className="text-sm text-[var(--text-muted)]">
            {book.authors.length ? book.authors.join(", ") : "Auteur inconnu"}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {book.published_date
              ? `Sorti le ${new Date(book.published_date).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}`
              : book.published_year
                ? `Annee ${book.published_year}`
                : "Date inconnue"}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {synopsisText(book.description)}
          </p>
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => setOpenSynopsis(true)}
          >
            Lire le synopsis
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[var(--text-muted)]">Quick actions</span>
        <button
          type="button"
          className="btn-secondary text-xs"
          onClick={() => handleAdd("wishlist")}
          disabled={flags.inWishlist}
        >
          + Wishlist
        </button>
        <button
          type="button"
          className="btn-primary text-xs"
          onClick={() => handleAdd("library")}
          disabled={flags.inLibrary}
        >
          + Bibliotheque
        </button>
      </div>
      {status ? <p className="text-xs text-[var(--text-muted)]">{status}</p> : null}
      <SynopsisModal
        open={openSynopsis}
        title={book.title}
        description={book.description}
        onClose={() => setOpenSynopsis(false)}
      />
    </article>
  );
}
