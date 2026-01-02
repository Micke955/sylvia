import FeedList from "@/components/FeedList";

export default async function FeedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title text-3xl font-semibold">Feed public</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Les derniers avis partages par la communaute.
        </p>
      </div>
      <FeedList />
    </div>
  );
}
