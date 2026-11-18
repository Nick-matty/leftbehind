import { Search, Star } from "lucide-react";
import { useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/layouts/container";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchNearbyPlaces } from "@/lib/api-client";

const PLACE_KINDS = [
  "hotel",
  "restaurant",
  "attraction",
  "beach",
  "shopping",
  "entertainment",
  "historical",
  "nature",
];

export function ExplorePage() {
  const [query, setQuery] = useState("");
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const buttonVariant = selectedKind === null ? "secondary" : "primary";
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Debounced search: poll query every 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPlaces();
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadPlaces = async (reset = false) => {
    setLoading(true);
    setError(null);
    setPlaces([]);
    setHasMore(true);

    const pageSize = 20;

    try {
      const result = await fetchNearbyPlaces({
        kind: selectedKind as string | undefined,
        city: undefined,
        country_code: undefined,
        radius_km: 100,
        page: reset ? 1 : page,
        limit: pageSize,
      });

      const items = result.items ?? [];
      setPlaces(items);
      setHasMore(items.length > 0 && items.length >= pageSize);
    } catch (e: any) {
      setError(e.message ?? "Failed to load places");
    } finally {
      setLoading(false);
    }
  };

  // Load more
  const loadMore = () => {
    if (hasMore && !loading && query.trim()) {
      setPage((p) => p + 1);
      loadPlaces(false);
    }
  };

  const resetSearch = () => {
    setQuery("");
    setPage(1);
    setPlaces([]);
    setHasMore(true);
    setSelectedKind(null);
  };

  return (
    <Container className="py-section-mobile">
      <p className="text-overline text-clay-700">Discovery</p>
      <h1 className="text-display-sm text-foreground mb-6">
        Explore the catalogue
      </h1>

      {/* Search and filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-section-mobile md:mb-8">
        <Input
          placeholder="Search places, cities…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          className="flex-1"
          disabled={loading}
        />
        <div className="flex flex-wrap gap-2">
          {PLACE_KINDS.map((kind) => (
            <Button
              key={kind}
              variant={buttonVariant}
              size="sm"
              onClick={() => setSelectedKind(selectedKind === kind ? null : kind)}
              disabled={loading}
            >
              {kind}
            </Button>
          ))}
        </div>
        {!query.trim() && (
          <Button
            size="icon"
            variant="ghost"
            aria-label="Clear search"
            onClick={resetSearch}
            disabled={loading}
          >
            <Search aria-hidden />
          </Button>
        )}
      </div>

      {/* Results or loading/empty state */}
      {loading && (
        <div className="mt-6 flex justify-center">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-24" />
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 border border-border rounded-md bg-background-sunken">
          <p className="text-body-sm text-foreground">{error}</p>
        </div>
      )}

      {!loading && !error && places.length === 0 && (
        <div className="mt-6 p-8 text-center">
          {selectedKind && (
            <p className="text-body-md text-muted-foreground">
              No {selectedKind} places found. Try a different kind or clear the search.
            </p>
          )}
          {!selectedKind && (
            <p className="text-body-md text-muted-foreground">
              No places match your search. Try adjusting filters.
            </p>
          )}
        </div>
      )}

      {places.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {places.map((place) => (
            <article
              key={place.id}
              className="border border-border rounded-md bg-background overflow-hidden hover:shadow-md transition-shadow"
            >
              <a
                href={`/place/${place.slug}`}
                className="block"
              >
                {place.hero_image_path ? (
                  <div className="h-48 bg-surface/50 flex items-center justify-center">
                    <Search className="size-6 text-subtle-foreground" />
                  </div>
                ) : null}
                <div className="p-4">
                  <h3 className="text-sm text-foreground line-clamp-2">{place.name}</h3>
                  <p className="text-xs text-subtle-foreground line-clamp-1">
                    {place.city}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-caption">
                      {place.distance_km !== undefined ? `${Math.round(place.distance_km)} km` : ""}
                    </span>
                    {place.rating_avg !== undefined && (
                      <>
                        <span className="text-caption">
                          {place.rating_avg.toFixed(1)}
                        </span>
                        <Star className="size-3 fill-current text-star" aria-hidden />
                        <span className="text-caption ml-1">
                          {place.rating_count ?? 0}
                        </span>
                      </>
                    )}
                    {place.featured && (
                      <Badge variant="outline" className="text-xs">
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>
              </a>
            </article>
          ))}
        </div>
      )}

      {/* Load more button */}
      {!loading && hasMore && places.length > 0 && (
        <div className="mt-8 text-center">
          <Button size="icon" variant="ghost" onClick={loadMore}>
            <Search aria-hidden /> Load more
          </Button>
        </div>
      )}

      {/* Permalink share note */}
      {query.trim() && !error && (
        <p className="mt-4 text-body-sm text-subtle-foreground">
          Search "{query}" — results are from the published catalogue only.
        </p>
      )}
    </Container>
  );
}