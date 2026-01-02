type ReadingItem = {
  book_id: string;
  reading_started_at: string | null;
  title: string;
};

type NotificationBannerProps = {
  wishlistCount: number;
  readingItems: ReadingItem[];
};

export default function NotificationBanner({
  wishlistCount,
  readingItems,
}: NotificationBannerProps) {
  const now = new Date();
  const stalled = readingItems.filter((item) => {
    if (!item.reading_started_at) return false;
    const started = new Date(item.reading_started_at);
    const diffDays = Math.floor(
      (now.getTime() - started.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diffDays >= 14;
  });

  const showWishlist = wishlistCount >= 20;
  const showReading = stalled.length > 0;

  if (!showWishlist && !showReading) return null;

  return (
    <div className="glass rounded-2xl p-4 text-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
        Notifications
      </p>
      <div className="mt-2 space-y-2 text-[var(--text)]">
        {showReading ? (
          <p>
            Lecture en cours depuis un moment :{" "}
            <span className="font-semibold">
              {stalled.slice(0, 2).map((item) => item.title).join(", ")}
            </span>
            .
          </p>
        ) : null}
        {showWishlist ? (
          <p>
            Votre wishlist est longue ({wishlistCount} livres). Pensez a trier
            vos priorites.
          </p>
        ) : null}
      </div>
    </div>
  );
}
