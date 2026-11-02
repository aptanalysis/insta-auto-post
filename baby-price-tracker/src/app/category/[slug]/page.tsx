import { notFound } from "next/navigation";
import { getCategory } from "@/lib/categories";
import SearchPanel from "@/components/SearchPanel";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCategory(slug);
  if (!c) notFound();
  return (
    <>
      <p className="small"><a href="/" className="muted">← 카테고리</a></p>
      <h1>{c.emoji} {c.name}</h1>
      <SearchPanel keywords={c.keywords} category={c.slug} initialQuery={c.keywords[0]} />
    </>
  );
}
