import SearchPanel from "@/components/SearchPanel";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return (
    <>
      <h1>🔎 상품 검색</h1>
      <SearchPanel initialQuery={q} />
    </>
  );
}
