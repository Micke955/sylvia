export type BookVolumeInfo = {
  title?: string;
  authors?: string[];
  publishedDate?: string;
  language?: string;
  description?: string;
  categories?: string[];
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
  industryIdentifiers?: Array<{
    type?: string;
    identifier?: string;
  }>;
};

export type GoogleBook = {
  id: string;
  volumeInfo: BookVolumeInfo;
};

export type BookRecord = {
  id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
  description: string | null;
  categories: string[];
  language: string | null;
  isbn10: string | null;
  isbn13: string | null;
  published_date: string | null;
  published_year: number | null;
};

export function normalizeBook(book: GoogleBook): BookRecord {
  const info = book.volumeInfo ?? {};
  const identifiers = info.industryIdentifiers ?? [];
  const isbn10 =
    identifiers.find((item) => item.type === "ISBN_10")?.identifier ?? null;
  const isbn13 =
    identifiers.find((item) => item.type === "ISBN_13")?.identifier ?? null;

  const publishedYear = info.publishedDate
    ? Number.parseInt(info.publishedDate.slice(0, 4), 10)
    : null;
  const publishedDate = info.publishedDate
    ? info.publishedDate.length >= 10
      ? info.publishedDate.slice(0, 10)
      : `${info.publishedDate}-01-01`
    : null;

  const cover =
    info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
  const safeCover = cover?.startsWith("http://")
    ? cover.replace("http://", "https://")
    : cover;
  const upgradedCover = safeCover
    ? safeCover.includes("zoom=")
      ? safeCover.replace(/zoom=\d/, "zoom=2")
      : `${safeCover}&zoom=2`
    : null;
  const invalidCover =
    upgradedCover &&
    /image[_-]?not[_-]?available|no[_-]?cover|placeholder/i.test(upgradedCover);
  const finalCover = invalidCover ? null : upgradedCover;

  return {
    id: book.id,
    title: info.title ?? "Titre inconnu",
    authors: info.authors ?? [],
    cover_url: finalCover,
    description: info.description ?? null,
    categories: info.categories ?? [],
    language: info.language ?? null,
    isbn10,
    isbn13,
    published_date: publishedDate,
    published_year: Number.isNaN(publishedYear) ? null : publishedYear,
  };
}
