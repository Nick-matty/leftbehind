import { MapPin, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchPlaceDetail } from "@/lib/api-client";

interface Place {
  id: string;
  slug: string;
  name: string;
  kind: string;
  destination_id?: string;
  city: string;
  country_code: string;
  description: string;
  hero_image_path?: string;
  status: string;
  featured: boolean;
  popularity: number;
  rating_avg: number;
  rating_count: number;
  price_level?: number;
}

export function PlaceDetailPage() {
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const { slug: routeSlug } = useParams<{ slug: string }>();
  const slug = routeSlug ?? new URLSearchParams(window.location.search).get("slug");

  useEffect(() => {
    if (!slug) {
      setError("No slug provided");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setPlace(null);

    (async () => {
      try {
        const data = await fetchPlaceDetail(slug);

        if (!data) {
          setError("Place not found");
          setLoading(false);
          return;
        }
        setPlace(data);
      } catch (e: any) {
        setError(e.message ?? "Failed to load place");
        toast({
          title: "Load failed",
          description: e.message ?? "Unknown error",
        });
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-4">
        <div className="h-6 w-64 text-subtle-foreground" />
        <div className="h-48 w-3/4 text-subtle-foreground" />
        <div className="h-6 w-48 text-subtle-foreground" />
        <div className="h-6 w-24 text-subtle-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-8">
        <p className="text-body-md text-foreground">{error}</p>
        <Button onClick={handleBack}>Back</Button>
      </div>
    );
  }
  if (!place) {
    return (
      <div className="py-8">
        <p className="text-body-md text-muted-foreground">
          Place not found. <Button onClick={handleBack}>Back</Button>
        </p>
      </div>
    );
  }

  return (
    <div className="py-section-mobile">
      <p className="text-overline text-clay-700">Place detail</p>
      <h1 className="text-display-sm text-foreground mb-6">{place.name}</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          {place.hero_image_path ? (
            <div className="rounded-md overflow-hidden aspect-[4/3] bg-surface" style={{ backgroundImage: place.hero_image_path }} />
          ) : (
            <div className="h-48 bg-surface/50 flex items-center justify-center">
              <MapPin className="size-12 text-subtle-foreground" />
            </div>
          )}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Star className="size-3 fill-current text-star" aria-hidden />
              <span className="font-medium text-foreground">
                {place.rating_avg?.toFixed(1) ?? "—"}
              </span>
              <span className="text-caption ml-1">
                {place.rating_count ?? 0} reviews
              </span>
            </div>
            {place.price_level !== undefined && (
              <Badge variant="outline" className="mt-1 text-xs">€{place.price_level}</Badge>
            )}
          </div>
        </div>
        <div>
          <dl className="flex flex-col gap-3 text-body-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Country</dt>
              <dd className="text-foreground">{place.country_code || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">City</dt>
              <dd className="text-foreground">{place.city}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="mt-6">
        <Button onClick={handleBack}>Save</Button>
      </div>
    </div>
  );
}

function handleBack() {
  window.location.href = "/explore";
}