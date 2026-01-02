"use client";

import type { BookRecord } from "@/lib/books";
import { isValidCoverUrl, synopsisText } from "@/lib/utils";

type HomeBookCardProps = {
  book: BookRecord;
};

export default function HomeBookCard({ book }: HomeBookCardProps) {
  if (!isValidCoverUrl(book.cover_url)) return null;
  return (
    <article className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-3">
      <div className="h-20 w-14 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
        {book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.cover_url}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {book.title}
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          {book.authors.length ? book.authors.join(", ") : "Auteur inconnu"}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {synopsisText(book.description, 120)}
        </p>
      </div>
    </article>
  );
}
