"use client";

import { useMemo, useState } from "react";
import { toCsv } from "@/lib/csv";

type ExportRow = {
  added_at: string | null;
  [key: string]: string | number | null;
};

type StatsExportsProps = {
  libraryRows: ExportRow[];
  wishlistRows: ExportRow[];
};

function inRange(dateValue: string | null, start: string, end: string) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

export default function StatsExports({
  libraryRows,
  wishlistRows,
}: StatsExportsProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredLibrary = useMemo(() => {
    if (!startDate && !endDate) return libraryRows;
    return libraryRows.filter((row) => inRange(row.added_at, startDate, endDate));
  }, [libraryRows, startDate, endDate]);

  const filteredWishlist = useMemo(() => {
    if (!startDate && !endDate) return wishlistRows;
    return wishlistRows.filter((row) => inRange(row.added_at, startDate, endDate));
  }, [wishlistRows, startDate, endDate]);

  const libraryCsv = useMemo(() => toCsv(filteredLibrary), [filteredLibrary]);
  const wishlistCsv = useMemo(() => toCsv(filteredWishlist), [filteredWishlist]);

  const libraryUri = `data:text/csv;charset=utf-8,${encodeURIComponent(libraryCsv)}`;
  const wishlistUri = `data:text/csv;charset=utf-8,${encodeURIComponent(wishlistCsv)}`;

  return (
    <div className="soft-card rounded-3xl p-5">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-sm text-[var(--text-muted)]">Debut</label>
          <input
            type="date"
            className="input-field mt-2"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-[var(--text-muted)]">Fin</label>
          <input
            type="date"
            className="input-field mt-2"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            className="btn-secondary text-sm"
            href={libraryUri}
            download="libris-bibliotheque.csv"
          >
            Export Bibliotheque ({filteredLibrary.length})
          </a>
          <a
            className="btn-secondary text-sm"
            href={wishlistUri}
            download="libris-wishlist.csv"
          >
            Export Wishlist ({filteredWishlist.length})
          </a>
        </div>
      </div>
    </div>
  );
}
