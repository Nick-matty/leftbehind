import "maplibre-gl/dist/maplibre-gl.css";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as maplibregl from "maplibre-gl";
import type {
  ErrorEvent,
  FilterSpecification,
  Map as MapLibreMap,
} from "maplibre-gl";

import { getCountryLayer, type Country, type CountryLayer } from "@/features/globe/countries";
import type { ColorScheme } from "@/lib/use-color-scheme";

import { Search, Plus, Minus, MapPin, Maximize2, Badge } from "lucide-react";

import { Button } from "@/components/ui/button";

/** MapLibre globe (brief §4). OpenFreeMap vector tiles, OSM-derived, keyless.
 *
 * This is MapLibre's own projection (`setProjection({ type: "globe" })`), not a
 * custom sphere: the same tiles reproject client side, which is what makes the
 * later globe → street-map step a camera change rather than an engine swap.
 */

const STYLE_URL: Record<ColorScheme, string> = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

const HOME = { center: [10, 20] as [number, number], zoom: 1.35 };

const COUNTRY_FILL = "country-fill";
const COUNTRY_OUTLINE = "country-outline";
const SELECTED_FILL = "country-selected-fill";
const SELECTED_OUTLINE = "country-selected-outline";

export type GlobeStatus = "loading" | "ready" | "error";

export type GlobeHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  focusCountry: (id: string) => void;
};

type GlobeCanvasProps = {
  scheme: ColorScheme;
  selectedId: string | null;
  onSelectCountry: (country: Country | null) => void;
  onStatusChange: (status: GlobeStatus) => void;
  className?: string;
};

const PRIMARY = "rgb(27, 27, 27)";
const INK = "rgb(251, 250, 247)";

function countryFilter(selectedId: string | null): FilterSpecification {
  return ["==", ["get", "ADM0_A3"], selectedId ?? "__none__"];
}

function addCountryLayers(map: MapLibreMap, layer: CountryLayer, selectedId: string | null) {
  if (!map.getSource("countries")) {
    map.addSource("countries", {
      type: "geojson",
      data: layer.data,
      promoteId: "ADM0_A3",
    });
  }

  if (!map.getLayer(COUNTRY_FILL)) {
    map.addLayer({
      id: COUNTRY_FILL,
      type: "fill",
      source: "countries",
      paint: {
        "fill-color": PRIMARY,
        "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.2, 0.04],
      },
    });
  }

  if (!map.getLayer(COUNTRY_OUTLINE)) {
    map.addLayer({
      id: COUNTRY_OUTLINE,
      type: "line",
      source: "countries",
      paint: { "line-color": INK, "line-width": 0.5, "line-opacity": 0.35 },
    });
  }

  if (!map.getLayer(SELECTED_FILL)) {
    map.addLayer({
      id: SELECTED_FILL,
      type: "fill",
      source: "countries",
      filter: countryFilter(selectedId),
      paint: { "fill-color": PRIMARY, "fill-opacity": 0.38 },
    });
  }

  if (!map.getLayer(SELECTED_OUTLINE)) {
    map.addLayer({
      id: SELECTED_OUTLINE,
      type: "line",
      source: "countries",
      filter: countryFilter(selectedId),
      paint: { "line-color": PRIMARY, "line-width": 2, "line-opacity": 0.9 },
    });
  }
}

export const GlobeCanvas = forwardRef<GlobeHandle, GlobeCanvasProps>(
  function GlobeCanvas(
    { scheme, selectedId, onSelectCountry, onStatusChange, className },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const layerRef = useRef<CountryLayer | null>(null);
    const selectedRef = useRef<string | null>(selectedId);
    const hoverRef = useRef<string | null>(null);
    const schemeRef = useRef<ColorScheme>(scheme);
    const [status, setStatus] = useState<"loading" | "ready" | "error">(
      "loading"
    );
    const [destinations, setDestinations] = useState<any[]>([]);
    const [destLoading, setDestLoading] = useState(true);
    const [showDestinations, setShowDestinations] = useState(false);

    useImperativeHandle(ref, () => ({
      zoomIn: () => mapRef.current?.zoomIn({ duration: 300 }),
      zoomOut: () => mapRef.current?.zoomOut({ duration: 300 }),
      resetView: () => {
        mapRef.current?.flyTo({
          center: HOME.center,
          zoom: HOME.zoom,
          bearing: 0,
          pitch: 0,
          duration: 1200,
          essential: true,
        });
      },
      focusCountry: (id: string) => {
        const country = layerRef.current?.byId.get(id);
        if (!country || !mapRef.current) return;
        const zoom = Math.min(6, Math.max(2, 8 - country.spanDegrees / 8));
        mapRef.current.flyTo({ center: country.center, zoom, duration: 1200 });
      },
    }), []);

    useEffect(() => {
      onStatusChange(status);
    }, [status, onStatusChange]);

    useEffect(() => {
      selectedRef.current = selectedId;
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;
      if (map.getLayer(SELECTED_FILL))
        map.setFilter(SELECTED_FILL, ["==", ["get", "ADM0_A3"], selectedId ?? "__none__"]);
      if (map.getLayer(SELECTED_OUTLINE))
        map.setFilter(SELECTED_OUTLINE, ["==", ["get", "ADM0_A3"], selectedId ?? "__none__"]);
    }, [selectedId]);

    useEffect(() => {
      schemeRef.current = scheme;
      const map = mapRef.current;
      if (!map) return;
      setStatus("loading");
      map.setStyle(STYLE_URL[scheme]);
    }, [scheme]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const map = new maplibregl.Map({
        container,
        style: STYLE_URL[schemeRef.current],
        center: HOME.center,
        zoom: HOME.zoom,
        minZoom: 0.4,
        maxZoom: 12,
        attributionControl: { compact: true },
        renderWorldCopies: false,
        dragRotate: true,
        pitchWithRotate: false,
      });
      mapRef.current = map;

      if (import.meta.env.DEV) {
        (window as Window & { __lbGlobe?: MapLibreMap }).__lbGlobe = map;
      }

      const onStyleLoad = () => {
        map.setProjection({ type: "globe" });
        map.setSky({
          "sky-color": "rgb(135, 206, 250)",
          "horizon-color": "rgb(255, 255, 255)",
          "atmosphere-blend": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            1,
            5,
            0.4,
            8,
            0,
          ],
        });
        if (layerRef.current) addCountryLayers(map, layerRef.current, selectedRef.current);
        setStatus("ready");
      };

      const onError = (event: ErrorEvent) => {
        const message = event.error?.message ?? "";
        if (/style|source/i.test(message)) setStatus("error");
      };

      const onClick = (event: maplibregl.MapMouseEvent) => {
        if (!mapRef.current?.getLayer(COUNTRY_FILL)) return;
        const [feature] = mapRef.current.queryRenderedFeatures(event.point, {
          layers: [COUNTRY_FILL],
        });
        const id = feature?.properties?.ADM0_A3;
        if (typeof id !== "string") {
          onSelectCountry(null);
          return;
        }
        onSelectCountry(layerRef.current?.byId.get(id) ?? null);
      };

      const onMouseMove = (event: maplibregl.MapMouseEvent) => {
        if (!mapRef.current?.getLayer(COUNTRY_FILL)) return;
        const [feature] = mapRef.current.queryRenderedFeatures(event.point, {
          layers: [COUNTRY_FILL],
        });
        const nextId =
          typeof feature?.properties?.ADM0_A3 === "string"
            ? feature.properties.ADM0_A3
            : null;
        mapRef.current.getCanvas().style.cursor = nextId ? "pointer" : "";
        if (hoverRef.current === nextId) return;
        if (hoverRef.current) {
          mapRef.current.setFeatureState(
            { source: "countries", id: hoverRef.current },
            { hover: false }
          );
        }
        hoverRef.current = nextId;
        if (nextId) {
          mapRef.current.setFeatureState(
            { source: "countries", id: nextId },
            { hover: true }
          );
        }
      };

      map.on("style.load", onStyleLoad);
      map.on("error", onError);
      map.on("click", onClick);
      map.on("mousemove", onMouseMove);

      getCountryLayer()
        .then((layer) => {
          layerRef.current = layer;
          if (map.isStyleLoaded()) addCountryLayers(map, layer, selectedRef.current);
        })
        .catch(() => setStatus("error"));

      // Tear the WebGL map down on unmount so its render loop does not keep
      // running (and blocking the main thread) after leaving this page.
      return () => {
        map.remove();
        mapRef.current = null;
        layerRef.current = null;
      };
    }, []);

    // Fetch destinations from backend after map is ready
    useEffect(() => {
      async function loadDestinations() {
        if (!mapRef.current || status !== "ready") return;
        setDestLoading(true);
        try {
          const result = await fetch("/api/places", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
          if (!result.ok) throw new Error("Failed to fetch destinations");
          const data = await result.json();
          setDestinations(data.items || []);
        } catch (e) {
          console.error("Failed to load destinations:", e);
        } finally {
          setDestLoading(false);
        }
      }
      loadDestinations();
    }, [mapRef.current, status]);

    // Add destination markers layer once on style load
    useEffect(() => {
      if (!mapRef.current || destLoading) return;

      const map = mapRef.current;

      // Add source for destination markers
      if (!map.getSource("destination-markers")) {
        map.addSource("destination-markers", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
      }

      // Add marker layer visible at zoom > 3 (individual markers) and hidden at zoom <= 3 (clusters)
      if (!map.getLayer("dest-marker")) {
        map.addLayer({
          id: "dest-marker",
          type: "symbol",
          source: "destination-markers",
          layout: {
            "icon-image": "map-pin",
            "icon-allow-overlap": true,
            "icon-size": 0.8,
          },
          paint: {
            "icon-color": PRIMARY,
          },
          // Show only when zoomed in enough (zoom > 3)
          filter: ["all", [">", ["zoom"], 3]],
        });
      }

      // Initially hide markers (will be shown/hidden via button)
      map.setLayoutProperty("dest-marker", "visibility", "none");
    }, [destLoading, mapRef.current]);

    // Toggle destination markers visibility
    const toggleDestinations = () => {
      setShowDestinations((prev) => !prev);
      if (!mapRef.current) return;
      const newVis = !showDestinations ? "visible" : "none";
      mapRef.current.setLayoutProperty("dest-marker", "visibility", newVis);
    };

    return (
      <div
        ref={containerRef}
        className={className}
        role="application"
        aria-label="Interactive 3D globe. Drag to rotate, scroll to zoom, click a country to select it."
      >
        <h2 className="text-title-sm text-foreground">Global Exploration</h2>
        <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-md border border-border bg-surface p-1 shadow-sm">
          <Plus
            size="4"
            aria-label="Zoom in"
            onClick={() => mapRef.current?.zoomIn({ duration: 300 })}
          />
          <Minus
            size="4"
            aria-label="Zoom out"
            onClick={() => mapRef.current?.zoomOut({ duration: 300 })}
          />
          <Maximize2
            size="4"
            aria-label="Reset to the global view"
            onClick={() => {
              mapRef.current?.flyTo({
                center: HOME.center,
                zoom: HOME.zoom,
                bearing: 0,
                pitch: 0,
                duration: 1200,
                essential: true,
              });
            }}
          />
        </div>

        {status !== "ready" && (
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 p-6 text-center"
            role="status"
          >
            {status === "loading" ? (
              <>
                <div className="size-24 rounded-full" />
                <p className="text-body-sm text-muted-foreground">Loading the globe…</p>
              </>
            ) : (
              <>
                <p className="text-title-md text-foreground">The map could not load</p>
                <p className="measure text-body-sm text-muted-foreground">
                  The OpenFreeMap style or its tiles did not respond. This is a network or
                  provider problem, not missing data — reload the page to try again.
                </p>
              </>
            )}
          </div>
        )}

        {/* Destination markers toggle and list */}
        {status === "ready" && destinations.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDestinations}
            >
              <Search aria-hidden /> {showDestinations ? "Hide" : "Show"} markers
            </Button>

            {showDestinations && (
              <div
                className="absolute left-3 bottom-32 flex flex-col items-start gap-2 max-w-sm md:max-w-none bg-surface/90 border border-rounded-md border-rounded-md rounded-md p-3 shadow-lg z-10 max-h-40 overflow-y-auto text-caption"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-subtle-foreground">
                    {destinations.length} destinations
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  {destinations
                    .slice(0, 20)
                    .map((dest) => (
                      <div
                        key={dest.id}
                        className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-background-sunken"
                        onClick={() => {
                          window.location.href = `/place/${dest.slug}`;
                        }}
                      >
                        <MapPin className="size-4" />
                        <span className="truncate max-w-xs">{dest.name}</span>
                      </div>
                    ))}
                  {destinations.length > 20 && (
                    <div className="text-center text-xxxs text-subtle-foreground">
                      +{destinations.length - 20} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Selected country info panel */}
        {selectedId && (
          <div
            className="absolute left-3 bottom-3 max-w-sm bg-surface/90 border rounded-md p-4 shadow-lg z-10 max-h-80 overflow-y-auto"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-md bg-surface flex items-center justify-center flex-shrink-0">
                <Badge>
                  {selectedId}
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-ui text-title-sm text-foreground line-clamp-1">
                  Country selected
                </h3>
                <p className="text-body-sm text-muted-foreground">
                  Click any country on the globe to select it.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);