import { Link } from "react-router-dom";

import { Container } from "@/layouts/container";

const linkClass =
  "inline-flex min-h-touch items-center text-body-sm text-muted-foreground transition-colors duration-fast hover:text-foreground";

export function SiteFooter() {
  return (
    <footer className="mt-section border-t border-border bg-background-sunken">
      <Container className="flex flex-col gap-8 py-10 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <p className="font-display text-title-md text-foreground">LeftBehind</p>
          <p className="mt-2 text-body-sm text-muted-foreground">
            A travel discovery catalogue of destinations, hotels, restaurants and
            attractions — built on published records, not invented ones.
          </p>
        </div>

        <nav aria-label="Footer" className="flex gap-12">
          <div className="flex flex-col">
            <p className="text-overline text-subtle-foreground">Discover</p>
            <Link to="/explore" className={linkClass}>
              Explore
            </Link>
            <Link to="/map" className={linkClass}>
              Map
            </Link>
            <Link to="/saved" className={linkClass}>
              Saved places
            </Link>
          </div>
          <div className="flex flex-col">
            <p className="text-overline text-subtle-foreground">Account</p>
            <Link to="/profile" className={linkClass}>
              Profile
            </Link>
            <Link to="/design" className={linkClass}>
              Design system
            </Link>
          </div>
        </nav>
      </Container>
      <Container className="border-t border-border py-4">
        <p className="text-body-sm text-subtle-foreground">
          © {new Date().getFullYear()} LeftBehind. Place details come from published
          catalogue records.
        </p>
      </Container>
    </footer>
  );
}
