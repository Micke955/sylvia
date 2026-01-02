import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidCoverUrl } from "@/lib/utils";

type FeedRow = {
  book_id: string;
  user_id: string;
  added_at: string;
  rating: number | null;
  public_review: string | null;
  books: FeedBook;
};

type FeedBook = {
  title: string;
  authors: string[];
  cover_url: string | null;
  description: string | null;
};

type FeedRowRaw = Omit<FeedRow, "books"> & {
  books: FeedBook | FeedBook[] | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minRating = Number(searchParams.get("minRating") ?? "0");
  const sort = searchParams.get("sort") ?? "recent";

  const supabase = await createClient();

  let query = supabase
    .from("user_books")
    .select(
      "book_id, user_id, added_at, rating, public_review, books(id, title, authors, cover_url, description)",
    )
    .eq("is_public_review", true);

  if (minRating > 0) {
    query = query.gte("rating", minRating);
  }

  if (sort === "rating") {
    query = query.order("rating", { ascending: false }).order("added_at", {
      ascending: false,
    });
  } else {
    query = query.order("added_at", { ascending: false });
  }

  const { data: rows } = await query.limit(30);

  const userIds = Array.from(
    new Set((rows ?? []).map((row) => row.user_id).filter(Boolean)),
  );
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

  const normalizedRows = (rows ?? []).map((row) => {
    const raw = row as FeedRowRaw;
    const book = Array.isArray(raw.books) ? raw.books[0] : raw.books;
    return { ...raw, books: book ?? null };
  });

  const items = normalizedRows
    .filter(
      (row): row is FeedRow =>
        Boolean(
          row.books &&
            isValidCoverUrl(row.books.cover_url ?? null) &&
            row.books.description,
        ),
    )
    .map((row) => ({
      ...row,
      profile: profileMap.get(row.user_id) ?? null,
    }));

  const { data: topRows } = await supabase
    .from("user_books")
    .select("user_id")
    .eq("is_public_review", true)
    .limit(200);

  const counts = new Map<string, number>();
  (topRows ?? []).forEach((row) => {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  });

  const topSorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topIds = topSorted.map(([id]) => id);

  const topProfiles = topIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", topIds)
    : { data: [] };

  const topProfileMap = new Map(
    (topProfiles.data ?? []).map((profile) => [profile.id, profile]),
  );

  const topReviewers = topSorted.map(([id, reviews]) => ({
    user_id: id,
    username: topProfileMap.get(id)?.username ?? null,
    avatar_url: topProfileMap.get(id)?.avatar_url ?? null,
    reviews,
  }));

  return NextResponse.json({ items, topReviewers } satisfies {
    items: FeedRow[];
    topReviewers: {
      user_id: string;
      username: string | null;
      avatar_url: string | null;
      reviews: number;
    }[];
  });
}
