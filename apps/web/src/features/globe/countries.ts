import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

/** Country boundaries for the globe.
 *
 * Geometry: Natural Earth 1:110m Admin-0 countries (public domain), vendored at
 * `public/geo/ne_110m_admin_0_countries.geojson` and served from our own origin
 * — no external call per camera movement.
 *
 * Facts shown in the UI come from the same file (`POP_EST`, `CONTINENT`,
 * `SUBREGION`, `ISO_A*`), so nothing here is invented. Natural Earth has no
 * capital field at this scale; capitals wait for the `countries` table in
 * Phase 5 rather than being guessed.
 */

export const CONTINENTS = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
  "Antarctica",
] as const;

export type Continent = (typeof CONTINENTS)[number];

export type CountryProperties = {
  NAME: string;
  NAME_LONG: string;
  ADM0_A3: string;
  ISO_A2: string;
  ISO_A3: string;
  CONTINENT: string;
  SUBREGION: string;
  POP_EST: number;
  POP_YEAR: number;
  CAPITAL: string | null;
  LATITUDE: number;
  LONGITUDE: number;
  LABEL_X: number;
  LABEL_Y: number;
};

export type Country = {
  /** Stable id: `ADM0_A3`, present on all 177 features (5 have ISO_A2 = "-99"). */
  id: string;
  name: string;
  fullName: string;
  iso2: string | null;
  iso3: string | null;
  continent: Continent;
  subregion: string;
  capital: string | null;
  population: number | null;
  populationYear: number | null;
  /** Cartographic label point — where the cameras should aim, not a border centroid. */
  center: [number, number];
  /** Largest side of the feature's bbox in degrees; drives country-scale zoom. */
  spanDegrees: number;
  /** Approx. centre used for map pins / detail views. */
  lat: number;
  lng: number;
};

export type CountryLayer = {
  data: FeatureCollection<Polygon | MultiPolygon, CountryProperties>;
  countries: Country[];
  byId: Map<string, Country>;
};

const SOURCE_URL = "/geo/ne_110m_admin_0_countries.geojson";
const UNKNOWN_ISO = "-99";

function toIso(value: string): string | null {
  return !value || value === UNKNOWN_ISO ? null : value;
}

function isContinent(value: string): value is Continent {
  return (CONTINENTS as readonly string[]).includes(value);
}

function spanOf(feature: Feature<Polygon | MultiPolygon, CountryProperties>): number {
  const box = feature.bbox;
  if (!box) return 30;
  const [west, south, east, north] = box;
  return Math.max(Math.abs(east - west), Math.abs(north - south));
}

function toCountry(feature: Feature<Polygon | MultiPolygon, CountryProperties>): Country {
  const p = feature.properties;
  return {
    id: p.ADM0_A3,
    name: p.NAME,
    fullName: p.NAME_LONG || p.NAME,
    iso2: toIso(p.ISO_A2),
    iso3: toIso(p.ISO_A3),
    continent: p.CONTINENT as Continent,
    subregion: p.SUBREGION,
    capital: p.CAPITAL ?? null,
    population:
      typeof p.POP_EST === "number" && p.POP_EST > 0 ? p.POP_EST : null,
    populationYear: typeof p.POP_YEAR === "number" ? p.POP_YEAR : null,
    center: [p.LABEL_X, p.LABEL_Y],
    lat: typeof p.LATITUDE === "number" ? p.LATITUDE : 0,
    lng: typeof p.LONGITUDE === "number" ? p.LONGITUDE : 0,
    spanDegrees: spanOf(feature),
  };
}

/** Loads and normalises the boundary file once; callers cache the promise. */
export async function loadCountryLayer(): Promise<CountryLayer> {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Country geometry unavailable (HTTP ${response.status})`);
  }

  const raw = (await response.json()) as FeatureCollection<
    Polygon | MultiPolygon,
    CountryProperties
  >;

  // Natural Earth includes one "Seven seas (open ocean)" feature that is not a
  // country and has no ISO code; keeping it would make it selectable.
  const features = raw.features.filter((feature) => isContinent(feature.properties.CONTINENT));
  const countries = features.map(toCountry);

  return {
    data: { type: "FeatureCollection", features },
    countries,
    byId: new Map(countries.map((country) => [country.id, country])),
  };
}

let cached: Promise<CountryLayer> | null = null;

/** One fetch per page load, shared by the globe and any country list. */
export function getCountryLayer(): Promise<CountryLayer> {
  cached ??= loadCountryLayer();
  return cached;
}

export function formatPopulation(value: number | null): string | null {
  if (value === null) return null;
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}