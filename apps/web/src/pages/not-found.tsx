import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Container } from "@/layouts/container";

export function NotFoundPage() {
  return (
    <Container className="py-section-mobile md:py-section">
      <h1 className="mb-6 text-display-sm text-foreground">Page not found</h1>
      <EmptyState
        icon={Compass}
        title="This page does not exist"
        description="The link may be out of date. Head back to the home page or search the catalogue."
        action={
          <Button asChild variant="secondary">
            <Link to="/">Go home</Link>
          </Button>
        }
        className="max-w-2xl"
      />
    </Container>
  );
}
