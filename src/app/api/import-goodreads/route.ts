import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeBook, type GoogleBook } from "@/lib/books";

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

function buildQuery(row: ImportRow) {
  if (row.isbn13) return `isbn:${row.isbn13}`;
  if (row.isbn) return `isbn:${row.isbn}`;
  if (row.title && row.author) {
    return `intitle:${row.title}+inauthor:${row.author}`;
  }
  return row.title ? `intitle:${row.title}` : "";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as { rows: ImportRow[] };
  const rows = payload.rows ?? [];

  if (!rows.length) {
    return NextResponse.json({ imported: 0, skipped: 0 });
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const query = buildQuery(row);
    if (!query) {
      skipped += 1;
      continue;
    }

    const apiUrl = new URL("https://www.googleapis.com/books/v1/volumes");
    apiUrl.searchParams.set("q", query);
    apiUrl.searchParams.set("maxResults", "1");
    apiUrl.searchParams.set("langRestrict", "fr");
    if (apiKey) apiUrl.searchParams.set("key", apiKey);

    const response = await fetch(apiUrl.toString(), {
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      skipped += 1;
      continue;
    }

    const data = (await response.json()) as { items?: GoogleBook[] };
    const book = (data.items ?? [])[0];
    if (!book) {
      skipped += 1;
      continue;
    }

    const normalized = normalizeBook(book);
    if (!normalized.cover_url || !normalized.description) {
      skipped += 1;
      continue;
    }

    const { error: bookError } = await supabase
      .from("books")
      .upsert(normalized, { onConflict: "id" });

    if (bookError) {
      skipped += 1;
      continue;
    }

    const shelf = row.shelf.toLowerCase();
    const inWishlist = shelf === "to-read";
    const inLibrary = shelf !== "to-read";
    const readingStatus =
      shelf === "currently-reading"
        ? "reading"
        : shelf === "read"
          ? "finished"
          : "to_read";

    const { error: relationError } = await supabase.from("user_books").upsert(
      {
        user_id: user.id,
        book_id: normalized.id,
        in_library: inLibrary,
        in_wishlist: inWishlist,
        reading_status: readingStatus,
        rating: row.rating ?? null,
        reading_finished_at: row.dateRead ?? null,
        added_at: row.dateAdded ?? null,
        pages_total: row.pages ?? null,
      },
      { onConflict: "user_id,book_id" },
    );

    if (relationError) {
      skipped += 1;
      continue;
    }

    imported += 1;
  }

  return NextResponse.json({ imported, skipped });
}
