import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  GlobeCanvas,
  type GlobeHandle,
  type GlobeStatus,
} from "@/components/globe/globe-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatPopulation,
  getCountryLayer,
  type Country,
} from "@/features/globe/countries";
import { Container } from "@/layouts/container";
import { useColorScheme } from "@/lib/use-color-scheme";

const SEARCH_LIMIT = 6;

export function GlobePage() {
  const scheme = useColorScheme();
  const globeRef = useRef<GlobeHandle | null>(null);
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [selected, setSelected] = useState<Country | null>(null);
  const [status, setStatus] = useState<GlobeStatus>("loading");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    getCountryLayer()
      .then((layer) => {
        if (active) setAllCountries(layer.countries);
      })
      .catch(() => {
        /* the canvas surfaces its own error state */
      });
    return () => {
      active = false;
    };
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allCountries
      .filter((country) => country.name.toLowerCase().includes(q))
      .slice(0, SEARCH_LIMIT);
  }, [allCountries, query]);

  const onSelectCountry = useCallback((country: Country | null) => {
    setSelected(country);
  }, []);

  const population = selected ? formatPopulation(selected.population) : null;

  return (
    <Container className="py-8">
      <h1 className="text-title-lg text-foreground">Globe</h1>
      <p className="measure mt-2 text-body-sm text-muted-foreground">
        Spin the globe to find a country, then pick it to read its geography.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="relative">
          <GlobeCanvas
            ref={globeRef}
            scheme={scheme}
            selectedId={selected?.id ?? null}
            onSelectCountry={onSelectCountry}
            onStatusChange={setStatus}
            className="relative h-[58vh] min-h-[380px] w-full overflow-hidden rounded-md border border-border bg-background-sunken"
          />
        </div>

        <div className="space-y-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search countries…"
            aria-label="Search countries"
          />

          {matches.length > 0 && (
            <ul className="max-h-64 overflow-y-auto rounded-md border border-border">
              {matches.map((country) => (
                <li key={country.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-body-sm text-foreground hover:bg-background-sunken"
                    onClick={() => {
                      setSelected(country);
                      setQuery("");
                    }}
                  >
                    {country.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected ? (
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-title-sm text-foreground">{selected.fullName}</h2>
                <Badge>{selected.id}</Badge>
              </div>
              <dl className="mt-3 space-y-1 text-body-sm text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <dt>Continent</dt>
                  <dd className="text-foreground">{selected.continent}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Subregion</dt>
                  <dd className="text-foreground">{selected.subregion}</dd>
                </div>
                {population && (
                  <div className="flex justify-between gap-3">
                    <dt>Population</dt>
                    <dd className="text-foreground">{population}</dd>
                  </div>
                )}
              </dl>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setSelected(null)}
              >
                Clear
              </Button>
            </div>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              {status === "ready"
                ? "Click a country on the globe, or search above."
                : status === "error"
                  ? "The map could not load. Reload the page to try again."
                  : "Loading the globe…"}
            </p>
          )}
        </div>
      </div>
    </Container>
  );
}
