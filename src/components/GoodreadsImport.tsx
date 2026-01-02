"use client";

import { useMemo, useState } from "react";
import { parseCsv } from "@/lib/csv";

type ImportRow = {
  title: string;
  author: string;
  isbn: string;
  isbn13: string;
  shelf: string;
  rating: number | null;
  dateRead: string | null;
  dateAdded: string | null;
  pages: number | null;
};

const MAX_ROWS = 500;

const normalizeKey = (value: string) => value.trim().toLowerCase();

const fieldAliases: Record<keyof ImportRow, string[]> = {
  title: ["title", "book title"],
  author: ["author", "authors"],
  isbn: ["isbn"],
  isbn13: ["isbn13"],
  shelf: ["exclusive shelf", "shelf", "bookshelves"],
  rating: ["my rating", "rating"],
  dateRead: ["date read"],
  dateAdded: ["date added"],
  pages: ["number of pages", "pages"],
};

const getField = (row: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string") return value;
  }
  return "";
};

const parseNumber = (value: string) => {
  const cleaned = value.replace(",", ".").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

const mapRow = (row: Record<string, string>): ImportRow => {
  const normalized: Record<string, string> = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[normalizeKey(key)] = value;
  });
  const title = getField(normalized, fieldAliases.title);
  const author = getField(normalized, fieldAliases.author);
  const isbn = getField(normalized, fieldAliases.isbn);
  const isbn13 = getField(normalized, fieldAliases.isbn13);
  const shelf = getField(normalized, fieldAliases.shelf) || "to-read";
  const rating = parseNumber(getField(normalized, fieldAliases.rating));
  const dateRead = getField(normalized, fieldAliases.dateRead) || null;
  const dateAdded = getField(normalized, fieldAliases.dateAdded) || null;
  const pages = parseNumber(getField(normalized, fieldAliases.pages));

  return {
    title: title.trim(),
    author: author.trim(),
    isbn: isbn.trim(),
    isbn13: isbn13.trim(),
    shelf: shelf.trim(),
    rating,
    dateRead,
    dateAdded,
    pages: pages ? Math.round(pages) : null,
  };
};

export default function GoodreadsImport() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [limitWarning, setLimitWarning] = useState(false);

  const handleFile = async (file: File) => {
    setStatus(null);
    setLimitWarning(false);
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    const mapped = parsed
      .map(mapRow)
      .filter((row) => row.title || row.isbn || row.isbn13);
    if (mapped.length > MAX_ROWS) {
      setLimitWarning(true);
      setRows(mapped.slice(0, MAX_ROWS));
      return;
    }
    setRows(mapped);
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setStatus("Import en cours...");
    try {
      const response = await fetch("/api/import-goodreads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!response.ok) {
        setStatus("Import impossible.");
        return;
      }
      const data = (await response.json()) as {
        imported: number;
        skipped: number;
      };
      setStatus(
        `Import termine. ${data.imported} livres ajoutes, ${data.skipped} ignores.`,
      );
    } catch {
      setStatus("Import impossible.");
    } finally {
      setImporting(false);
    }
  };

  const stats = useMemo(() => {
    const shelves = rows.reduce(
      (acc, row) => {
        const key = row.shelf.toLowerCase();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    return shelves;
  }, [rows]);

  return (
    <div className="soft-card rounded-3xl p-6">
      <div className="space-y-2">
        <h2 className="section-title text-xl font-semibold">
          Import Goodreads
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Exportez votre CSV depuis Goodreads (My Books &gt; Tools &gt; Import
          and export) puis importez-le ici. Seuls les livres avec couverture et
          synopsis en francais seront gardes.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          className="input-field"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
          disabled={importing}
        />
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={handleImport}
          disabled={importing || !rows.length}
        >
          {importing ? "Import..." : "Lancer l'import"}
        </button>
      </div>
      {fileName ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Fichier: {fileName} ({rows.length} lignes)
        </p>
      ) : null}
      {limitWarning ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Limite de {MAX_ROWS} lignes appliquee pour eviter un import trop long.
        </p>
      ) : null}
      {rows.length ? (
        <div className="mt-4 grid gap-3 text-xs text-[var(--text-muted)] sm:grid-cols-3">
          <div className="glass rounded-2xl p-3">
            <p className="text-sm text-[var(--text)]">{rows.length}</p>
            <p>Lignes detectees</p>
          </div>
          <div className="glass rounded-2xl p-3">
            <p className="text-sm text-[var(--text)]">
              {stats["read"] ?? 0}
            </p>
            <p>Deja lus</p>
          </div>
          <div className="glass rounded-2xl p-3">
            <p className="text-sm text-[var(--text)]">
              {stats["to-read"] ?? 0}
            </p>
            <p>A lire</p>
          </div>
        </div>
      ) : null}
      {rows.length ? (
        <div className="mt-4">
          <p className="text-xs text-[var(--text-muted)]">
            Apercu des 5 premieres lignes:
          </p>
          <ul className="mt-2 space-y-2 text-xs text-[var(--text-muted)]">
            {rows.slice(0, 5).map((row, index) => (
              <li key={`${row.title}-${index}`} className="glass rounded-2xl p-3">
                <p className="text-sm text-[var(--text)]">{row.title}</p>
                <p>
                  {row.author || "Auteur inconnu"} · {row.shelf}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {status ? (
        <p className="mt-4 text-sm text-[var(--text-muted)]">{status}</p>
      ) : null}
    </div>
  );
}
