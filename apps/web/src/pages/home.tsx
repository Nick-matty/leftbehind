import { ArrowRight, Compass, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/layouts/container";

export function HomePage() {
  return (
    <>
      <section className="border-b border-border">
        <Container className="flex flex-col gap-6 py-section-mobile md:py-section">
          <div className="flex flex-col gap-4">
            <p className="text-overline text-clay-700">Travel discovery</p>
            <h1 className="max-w-3xl font-display text-display-sm text-foreground md:text-display-md lg:text-display-lg">
              Find the places worth the detour.
            </h1>
            <p className="measure text-body-lg text-muted-foreground">
              A catalogue of destinations, hotels, restaurants and attractions with
              real ratings, real opening hours and real addresses — reviewed by
              travellers, curated by editors.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/explore">
                Explore destinations
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/map">Open the map</Link>
            </Button>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-12 py-section-mobile md:py-section">
        <section aria-labelledby="destinations-heading" className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="destinations-heading" className="text-title-lg text-foreground">
                Featured destinations
              </h2>
              <p className="text-body-md text-muted-foreground">
                Editorial picks from the published catalogue.
              </p>
            </div>
            <Badge variant="outline">Catalogue not connected</Badge>
          </div>
          <EmptyState
            icon={Compass}
            title="No destination is published yet"
            description="This rail reads published destinations from the database and shows nothing until editors publish the first one. No placeholder photography or invented ratings are used to fill it."
            action={
              <Button asChild variant="secondary">
                <Link to="/explore">See the catalogue</Link>
              </Button>
            }
          />
        </section>

        <section aria-labelledby="nearby-heading" className="flex flex-col gap-4">
          <div>
            <h2 id="nearby-heading" className="text-title-lg text-foreground">
              Near you
            </h2>
            <p className="text-body-md text-muted-foreground">
              Attractions within walking distance of your location.
            </p>
          </div>
          <EmptyState
            icon={MapPin}
            title="Location has not been shared"
            description="Nearby results appear after you grant location access. Until the map and location layer ships, this section stays empty rather than showing an approximate city."
          />
        </section>
      </Container>
    </>
  );
}
