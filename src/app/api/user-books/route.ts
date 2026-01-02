import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BookRecord } from "@/lib/books";

type Payload = {
  book: BookRecord;
  inLibrary?: boolean;
  inWishlist?: boolean;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Payload;
  const { book, inLibrary = false, inWishlist = false } = payload;

  const safeBook: BookRecord | null =
    book && typeof book.id === "string" && book.id.trim()
      ? {
          id: book.id.trim(),
          title: book.title?.trim() || "Titre inconnu",
          authors: Array.isArray(book.authors) ? book.authors : [],
          cover_url: book.cover_url ?? null,
          description: book.description ?? null,
          categories: Array.isArray(book.categories) ? book.categories : [],
          isbn10: book.isbn10 ?? null,
          isbn13: book.isbn13 ?? null,
          language: book.language ?? null,
          published_date: book.published_date ?? null,
          published_year:
            typeof book.published_year === "number" &&
            Number.isFinite(book.published_year)
              ? book.published_year
              : null,
        }
      : null;

  if (!safeBook) {
    return NextResponse.json({ message: "Livre invalide." }, { status: 400 });
  }

  const { error: bookError } = await supabase.from("books").upsert(safeBook, {
    onConflict: "id",
  });

  if (bookError) {
    return NextResponse.json(
      { message: "Book error", detail: bookError.message },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("user_books")
    .select("in_library, in_wishlist")
    .eq("user_id", user.id)
    .eq("book_id", safeBook.id)
    .maybeSingle();

  const wasInLibrary = existing?.in_library ?? false;
  const wasInWishlist = existing?.in_wishlist ?? false;

  if (inWishlist && (wasInLibrary || inLibrary)) {
    return NextResponse.json(
      { message: "Deja dans la bibliotheque." },
      { status: 409 },
    );
  }

  let nextInLibrary = wasInLibrary || inLibrary;
  let nextInWishlist = wasInWishlist || inWishlist;

  if (inLibrary && wasInWishlist) {
    nextInWishlist = false;
  }

  const { error: relationError } = await supabase.from("user_books").upsert(
    {
      user_id: user.id,
      book_id: safeBook.id,
      in_library: nextInLibrary,
      in_wishlist: nextInWishlist,
    },
    { onConflict: "user_id,book_id" },
  );

  if (relationError) {
    return NextResponse.json({ message: "Relation error" }, { status: 400 });
  }

  revalidatePath("/library");
  revalidatePath("/wishlist");
  revalidatePath("/profile");

  return NextResponse.json({
    ok: true,
    alreadyInLibrary: wasInLibrary,
    alreadyInWishlist: wasInWishlist,
  });
}
