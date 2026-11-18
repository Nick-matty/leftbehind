import { Construction } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/layouts/container";

/**
 * Honest placeholder: the route exists so navigation is never broken, and says
 * exactly which phase builds it instead of faking a screen.
 */
export function PlannedPage({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: number;
}) {
  return (
    <Container className="flex flex-col gap-6 py-section-mobile md:py-section">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-display-sm text-foreground">{title}</h1>
        <Badge variant="accent">Phase {phase}</Badge>
      </div>
      <EmptyState
        icon={Construction}
        title={`${title} is not built yet`}
        description={description}
        className="max-w-2xl"
      />
    </Container>
  );
}
