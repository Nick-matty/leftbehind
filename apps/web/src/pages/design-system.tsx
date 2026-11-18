import { Button as AstryxButton } from "@astryxdesign/core/Button";
import { Bookmark, Compass, Search, Star } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldError, FieldHelper, Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { Container } from "@/layouts/container";

const swatches: { name: string; varName: string }[] = [
  { name: "bg", varName: "--background" },
  { name: "bg sunken", varName: "--background-sunken" },
  { name: "surface", varName: "--surface" },
  { name: "surface raised", varName: "--surface-raised" },
  { name: "border", varName: "--border" },
  { name: "border strong", varName: "--border-strong" },
  { name: "text", varName: "--foreground" },
  { name: "text muted", varName: "--muted-foreground" },
  { name: "primary", varName: "--primary" },
  { name: "primary hover", varName: "--primary-hover" },
  { name: "accent", varName: "--accent" },
  { name: "success", varName: "--success" },
  { name: "warning", varName: "--warning" },
  { name: "danger", varName: "--danger" },
  { name: "info", varName: "--info" },
  { name: "star", varName: "--star" },
];

const typeScale = [
  { token: "display.lg", className: "text-display-lg" },
  { token: "display.md", className: "text-display-md" },
  { token: "display.sm", className: "text-display-sm" },
  { token: "title.lg", className: "text-title-lg" },
  { token: "title.md", className: "text-title-md" },
  { token: "body.lg", className: "text-body-lg" },
  { token: "body.md", className: "text-body-md" },
  { token: "body.sm", className: "text-body-sm" },
  { token: "label", className: "text-label" },
  { token: "overline", className: "text-overline" },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 border-t border-border pt-8">
      <div>
        <h2 className="text-title-lg text-foreground">{title}</h2>
        <p className="measure text-body-md text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

/**
 * Living inventory of the design system, at /design.
 * It is the "every token has a consumer" check from the Phase 2 gate: each block
 * renders real primitives, nothing here is a mockup image.
 */
export function DesignSystemPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectValue, setSelectValue] = useState("hotel");

  return (
    <Container className="flex flex-col gap-10 py-section-mobile md:py-section">
      <header className="flex flex-col gap-3">
        <p className="text-overline text-clay-700">Design system</p>
        <h1 className="text-display-sm text-foreground">Phase 2 inventory</h1>
        <p className="measure text-body-lg text-muted-foreground">
          Every primitive below is generated from
          <code className="ml-1 rounded-xs bg-background-sunken px-1.5 py-0.5 font-mono text-body-sm text-foreground">
            packages/design-tokens/tokens.json
          </code>
          . No component defines its own colour, radius, shadow or duration.
        </p>
      </header>

      <Section
        title="Semantic colour"
        description="Swatches read the live CSS custom properties, so they follow the light/dark theme without duplicating hex values."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {swatches.map((swatch) => (
            <div key={swatch.name} className="flex flex-col gap-2">
              <div
                className="h-14 rounded-md border border-border"
                style={{ backgroundColor: `var(${swatch.varName})` }}
              />
              <div className="flex flex-col">
                <span className="font-ui text-label text-foreground">{swatch.name}</span>
                <span className="font-mono text-body-sm text-subtle-foreground">
                  {swatch.varName}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Type scale"
        description="Fraunces for editorial display, Inter for everything interactive. Ten steps, no arbitrary sizes."
      >
        <div className="flex flex-col divide-y divide-border">
          {typeScale.map((step) => (
            <div key={step.token} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="w-32 shrink-0 font-mono text-body-sm text-subtle-foreground">
                {step.token}
              </span>
              <span className={`${step.className} text-foreground`}>
                The quiet corners of a city
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Buttons"
        description="44px web height, 10px radius, one primary action per screen. Destructive actions are outlined until a confirmation dialog."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link button</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Save place">
            <Bookmark aria-hidden />
          </Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="font-mono text-body-sm text-subtle-foreground">
            @astryxdesign/core 0.7.16 · Button
          </p>
          {/* Foundation check from `astryx docs migration/migration-setup`: a
              component that lost its padding means the layer order broke. */}
          <div data-foundation-check className="flex flex-wrap items-center gap-3">
            <AstryxButton label="Astryx primary" variant="primary" />
          </div>
        </div>
      </Section>

      <Section
        title="Form controls"
        description="Labels sit above the field, helpers below it, errors replace helpers and set aria-invalid."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="design-city">Home city</Label>
            <Input id="design-city" placeholder="Lisbon" />
            <FieldHelper>Used to order nearby results.</FieldHelper>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="design-email">Email</Label>
            <Input id="design-email" type="email" aria-invalid defaultValue="not-an-email" />
            <FieldError>Enter a valid email address.</FieldError>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="design-kind">Place kind</Label>
            <Select value={selectValue} onValueChange={setSelectValue}>
              <SelectTrigger id="design-kind">
                <SelectValue placeholder="Choose a kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="attraction">Attraction</SelectItem>
              </SelectContent>
            </Select>
            <FieldHelper>Filters the catalogue by place kind.</FieldHelper>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="design-notes">Notes</Label>
            <Textarea id="design-notes" placeholder="What should other travellers know?" />
          </div>
        </div>
      </Section>

      <Section
        title="Badges, avatars and ratings"
        description="Rating is always numeric as well as visual; colour never carries meaning alone."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Neutral</Badge>
          <Badge variant="brand">Brand</Badge>
          <Badge variant="accent">New</Badge>
          <Badge variant="success">Published</Badge>
          <Badge variant="warning">Draft</Badge>
          <Badge variant="danger">Hidden</Badge>
          <Badge variant="info">Pending</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar>
            <AvatarImage src="" alt="" />
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarFallback>MP</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>SS</AvatarFallback>
          </Avatar>
          <span className="flex items-center gap-1 text-body-md text-foreground">
            <Star aria-hidden className="size-4 fill-current text-star" />
            <span className="font-medium">Star icon</span>
            <span className="text-muted-foreground">· rating value beside it</span>
          </span>
        </div>
      </Section>

      <Section
        title="Tabs, dialogs and sheets"
        description="Focus is trapped, Escape closes, and the trigger always receives focus back."
      >
        <Tabs defaultValue="overview">
          <TabsList aria-label="Place details">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="text-body-md text-muted-foreground">
            Overview panel content.
          </TabsContent>
          <TabsContent value="hours" className="text-body-md text-muted-foreground">
            Hours are shown in the place&apos;s local timezone.
          </TabsContent>
          <TabsContent value="reviews" className="text-body-md text-muted-foreground">
            Reviews are paginated and sorted newest first.
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap items-center gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Discard this review?</DialogTitle>
                <DialogDescription>
                  The draft will be deleted. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                  Keep editing
                </Button>
                <Button variant="destructive" onClick={() => setDialogOpen(false)}>
                  Discard
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary">Open sheet</Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <div className="p-6">
                <SheetTitle className="text-title-lg text-foreground">Filters</SheetTitle>
                <p className="mt-2 text-body-md text-muted-foreground">
                  Sheets are anchored to an edge and never use blur.
                </p>
                <div className="mt-6 flex justify-end">
                  <Button onClick={() => setSheetOpen(false)}>Apply</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: "Saved to your places",
                description: "You can remove it from Saved at any time.",
                variant: "success",
              })
            }
          >
            Show toast
          </Button>
        </div>
      </Section>

      <Section
        title="Loading and empty states"
        description="Skeletons match the dimensions of the content they replace; they stop animating under reduced motion."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-4 w-2/3" />
            <SkeletonText lines={2} />
          </div>
          <div className="flex flex-col justify-center gap-2 rounded-lg border border-dashed border-border-strong p-6">
            <Compass aria-hidden className="size-6 text-subtle-foreground" />
            <p className="text-title-md text-foreground">No places match these filters</p>
            <p className="text-body-md text-muted-foreground">
              Clear a filter to see the rest of the catalogue.
            </p>
            <div className="pt-2">
              <Button variant="secondary" size="sm">
                Clear filters
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Admin table"
        description="40px rows, sticky header, hairline dividers, numbers right-aligned."
      >
        <Table>
          <TableCaption>Primitive coverage for Phase 2.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Primitive</TableHead>
              <TableHead>Layer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Variants</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["Button", "components/ui", "Themed", 5],
              ["Input / Textarea", "components/ui", "Themed", 2],
              ["Select", "components/ui", "Themed", 1],
              ["Dialog / Sheet", "components/ui", "Themed", 3],
              ["Table", "components/ui", "Themed", 1],
            ].map(([name, layer, status, variants]) => (
              <TableRow key={String(name)}>
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell className="font-mono text-body-sm text-muted-foreground">
                  {layer}
                </TableCell>
                <TableCell>
                  <Badge variant="success">{status}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{variants}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="relative mt-2">
          <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
          <Input aria-label="Search primitives" placeholder="Search primitives" className="h-control-sm pl-9" />
        </div>
      </Section>
    </Container>
  );
}
