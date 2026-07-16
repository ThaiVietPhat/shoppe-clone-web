import { SearchClient } from './SearchClient';

// Deliberately a Server Component reading `searchParams` as a prop instead of a
// client component calling useSearchParams() behind a <Suspense> boundary — that
// combination (Suspense boundary + an unauthenticated useQuery resolving during the
// server render) reproducibly left the page stuck on the loading fallback forever on
// a hard navigation/refresh, with the actual results rendered but detached outside
// <main>. Reading the params server-side and passing them down as plain props avoids
// the hook (and its Suspense requirement) entirely.
interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;

  return (
    <SearchClient
      q={first(sp.q)}
      categoryId={first(sp.categoryId)}
      sort={first(sp.sort) || 'RELEVANCE'}
      brand={first(sp.brand)}
      minPrice={first(sp.minPrice)}
      maxPrice={first(sp.maxPrice)}
      semantic={first(sp.semantic) === '1'}
      page={Number(first(sp.page) || '0')}
    />
  );
}
