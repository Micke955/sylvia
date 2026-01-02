import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeBook, type GoogleBook } from "@/lib/books";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data: missingBooks } = await supabase
    .from("books")
    .select("id")
    .or("language.is.null,published_date.is.null")
    .limit(30);

  if (!missingBooks?.length) {
    return NextResponse.json({ updated: 0, skipped: 0 });
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  let updated = 0;
  let skipped = 0;

  for (const row of missingBooks) {
    const url = new URL(
      `https://www.googleapis.com/books/v1/volumes/${row.id}`,
    );
    if (apiKey) url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), { next: { revalidate: 120 } });
    if (!response.ok) {
      skipped += 1;
      continue;
    }

    const book = (await response.json()) as GoogleBook;
    const normalized = normalizeBook(book);

    const { error } = await supabase
      .from("books")
      .update({
        cover_url: normalized.cover_url,
        description: normalized.description,
        categories: normalized.categories,
        isbn10: normalized.isbn10,
        isbn13: normalized.isbn13,
        published_year: normalized.published_year,
        published_date: normalized.published_date,
        language: normalized.language,
      })
      .eq("id", row.id);

    if (error) {
      skipped += 1;
      continue;
    }

    updated += 1;
  }

  return NextResponse.json({ updated, skipped });
}
