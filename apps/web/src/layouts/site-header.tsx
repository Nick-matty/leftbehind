import { Menu, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { primaryNav } from "@/app/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { Container } from "@/layouts/container";

function SearchForm({
  className,
  onSubmitted,
}: {
  className?: string;
  onSubmitted?: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/explore?q=${encodeURIComponent(trimmed)}` : "/explore");
    onSubmitted?.();
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={cn("relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
      />
      <label htmlFor="site-search" className="sr-only">
        Search destinations, hotels, restaurants and attractions
      </label>
      <Input
        id="site-search"
        name="q"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search destinations, hotels, restaurants"
        className="h-control-sm pl-9"
        autoComplete="off"
      />
    </form>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-sticky h-header border-b bg-background",
        "transition-colors duration-fast ease-standard",
        scrolled ? "border-border" : "border-transparent",
      )}
    >
      <Container className="flex h-full items-center gap-6">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          <span aria-hidden className="block size-2.5 rounded-full bg-primary" />
          <span className="font-display text-title-lg font-semibold tracking-tight text-foreground">
            LeftBehind
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden h-full items-stretch gap-1 lg:flex">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center px-3 font-ui text-label transition-colors duration-fast",
                  "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:content-['']",
                  isActive
                    ? "text-foreground after:bg-primary"
                    : "text-muted-foreground hover:text-foreground after:bg-transparent",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SearchForm className="hidden w-72 md:block" />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="border-b border-border p-4 pt-5">
                <SheetTitle className="font-display text-title-lg text-foreground">
                  LeftBehind
                </SheetTitle>
                <SheetDescription className="text-body-sm text-muted-foreground">
                  Find the places worth travelling for.
                </SheetDescription>
              </div>
              <div className="p-4">
                <SearchForm onSubmitted={() => setMenuOpen(false)} />
              </div>
              <nav aria-label="Primary" className="flex flex-col px-2">
                {primaryNav.map(({ label, to, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-touch items-center gap-3 rounded-md px-3 font-ui text-title-md",
                        isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-foreground hover:bg-background-sunken",
                      )
                    }
                  >
                    <Icon aria-hidden className="size-5" />
                    {label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}
