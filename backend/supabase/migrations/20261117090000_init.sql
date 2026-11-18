-- ============================================================================
-- LeftBehind — 0001 initial schema
-- Target: Supabase (PostgreSQL 15+)
--
-- Design notes (see docs/database.md for the full rationale):
--   * `places` is the single canonical entity for anything you can visit;
--     hotels / restaurants / attractions extend it 1:1 instead of duplicating
--     name, address, coordinates, ratings and reviews.
--   * Editorial `destination_categories` ("Coastal escapes") are separate from
--     `places.kind` ("hotel", "beach"), because one is curation and the other
--     is entity type.
--   * Nothing is seeded with invented business data. Reference data
--     (categories, amenities) lives in backend/supabase/seed; places are
--     ingested from Google Places or entered by staff.
-- ============================================================================

-- Supabase creates this schema for us, but a plain PostgreSQL database does
-- not. Creating it defensively keeps the migration runnable on both, which is
-- what the local test harness in backend/supabase/tests relies on.
create schema if not exists extensions;

set search_path = public, extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------

create type public.app_role as enum (
  'super_admin',
  'administrator',
  'content_manager',
  'moderator',
  'user'
);

create type public.place_kind as enum (
  'hotel',
  'restaurant',
  'attraction',
  'beach',
  'shopping',
  'entertainment',
  'historical',
  'nature'
);

create type public.moderation_status as enum (
  'draft',
  'pending_review',
  'published',
  'rejected',
  'archived'
);

create type public.review_status as enum (
  'published',
  'hidden',
  'removed'
);

create type public.notification_kind as enum (
  'recommendation',
  'place_update',
  'review_interaction',
  'account',
  'system'
);

create type public.collection_visibility as enum ('private', 'public');

create type public.report_status as enum ('open', 'actioned', 'dismissed');

create type public.report_reason as enum (
  'spam',
  'offensive',
  'inaccurate',
  'copyright',
  'other'
);

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, the public identity used by both clients
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  full_name              text not null check (char_length(btrim(full_name)) between 2 and 80),
  username               citext unique check (username ~ '^[a-z0-9_]{3,30}$'),
  avatar_url             text,
  bio                    text check (char_length(bio) <= 500),
  home_city              text,
  locale                 text not null default 'en' check (char_length(locale) between 2 and 12),
  theme                  text not null default 'system' check (theme in ('light', 'dark', 'system')),
  profile_visibility     text not null default 'public' check (profile_visibility in ('public', 'private')),
  notify_recommendations boolean not null default true,
  notify_place_updates   boolean not null default true,
  notify_review_activity boolean not null default true,
  notify_account         boolean not null default true,
  notify_email_digest    boolean not null default false,
  onboarded_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.profiles is
  'Public/private user identity. Rows are created by the on_auth_user_created trigger only.';

-- ---------------------------------------------------------------------------
-- user_roles — additive role grants; a user may hold several roles
-- ---------------------------------------------------------------------------

create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.app_role not null default 'user',
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create index user_roles_role_idx on public.user_roles (role);

-- ---------------------------------------------------------------------------
-- Editorial categories (discovery curation)
-- ---------------------------------------------------------------------------

create table public.destination_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 2 and 60),
  description text check (char_length(description) <= 280),
  icon        text not null default 'Compass',
  sort_order  smallint not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- destinations — cities / regions / islands you can explore
-- ---------------------------------------------------------------------------

create table public.destinations (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name            text not null check (char_length(btrim(name)) between 2 and 120),
  country_code    char(2) not null,
  region          text,
  city            text,
  summary         text not null check (char_length(summary) between 10 and 280),
  description     text,
  latitude        double precision not null check (latitude between -90 and 90),
  longitude       double precision not null check (longitude between -180 and 180),
  timezone        text,
  hero_image_path text,
  status          public.moderation_status not null default 'draft',
  featured        boolean not null default false,
  popularity      integer not null default 0 check (popularity >= 0),
  rating_avg      numeric(2, 1) not null default 0 check (rating_avg between 0 and 5),
  rating_count    integer not null default 0 check (rating_count >= 0),
  created_by      uuid references public.profiles (id) on delete set null,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  location        extensions.geography(Point, 4326) generated always as (
                    extensions.st_setsrid(
                      extensions.st_makepoint(longitude, latitude), 4326
                    )::extensions.geography
                  ) stored,
  search_vector   tsvector generated always as (
                    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
                    setweight(to_tsvector('simple', coalesce(city, '') || ' ' || coalesce(region, '')), 'B') ||
                    setweight(to_tsvector('english', coalesce(summary, '') || ' ' || coalesce(description, '')), 'C')
                  ) stored
);

create index destinations_status_idx on public.destinations (status);
create index destinations_country_idx on public.destinations (country_code);
create index destinations_featured_idx on public.destinations (featured) where status = 'published';
create index destinations_popularity_idx on public.destinations (popularity desc) where status = 'published';
create index destinations_location_gist on public.destinations using gist (location);
create index destinations_search_gin on public.destinations using gin (search_vector);
create index destinations_name_trgm on public.destinations using gin (name extensions.gin_trgm_ops);

-- Many-to-many: a destination can belong to several editorial categories.
create table public.destination_category_links (
  destination_id uuid not null references public.destinations (id) on delete cascade,
  category_id    uuid not null references public.destination_categories (id) on delete cascade,
  primary key (destination_id, category_id)
);

create index destination_category_links_category_idx on public.destination_category_links (category_id);

-- ---------------------------------------------------------------------------
-- Amenities (hotel / place feature catalog)
-- ---------------------------------------------------------------------------

create table public.amenities (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       text not null check (char_length(name) between 2 and 60),
  icon       text not null default 'Check',
  category   text not null default 'general',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- places — canonical visitable entity
-- ---------------------------------------------------------------------------

create table public.places (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name              text not null check (char_length(btrim(name)) between 2 and 160),
  kind              public.place_kind not null,
  destination_id    uuid references public.destinations (id) on delete set null,
  description       text check (char_length(description) <= 4000),
  address_line      text,
  city              text,
  country_code      char(2),
  latitude          double precision not null check (latitude between -90 and 90),
  longitude         double precision not null check (longitude between -180 and 180),
  phone             text,
  website           text check (website is null or website ~* '^https?://'),
  price_level       smallint check (price_level between 1 and 4),
  currency          char(3),
  price_note        text check (char_length(price_note) <= 280),
  price_verified_at timestamptz,
  opening_hours     jsonb,
  status            public.moderation_status not null default 'draft',
  rating_avg        numeric(2, 1) not null default 0 check (rating_avg between 0 and 5),
  rating_count      integer not null default 0 check (rating_count >= 0),
  data_source       text not null default 'manual' check (data_source in ('manual', 'google_places')),
  source_place_id   text,
  last_synced_at    timestamptz,
  created_by        uuid references public.profiles (id) on delete set null,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  location          extensions.geography(Point, 4326) generated always as (
                      extensions.st_setsrid(
                        extensions.st_makepoint(longitude, latitude), 4326
                      )::extensions.geography
                    ) stored,
  search_vector     tsvector generated always as (
                      setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
                      setweight(to_tsvector('simple', coalesce(city, '') || ' ' || coalesce(address_line, '')), 'B') ||
                      setweight(to_tsvector('english', coalesce(description, '')), 'C')
                    ) stored
);

create unique index places_source_unique on public.places (data_source, source_place_id)
  where source_place_id is not null;
create index places_kind_status_idx on public.places (kind, status);
create index places_destination_idx on public.places (destination_id);
create index places_location_gist on public.places using gist (location);
create index places_search_gin on public.places using gin (search_vector);
create index places_name_trgm on public.places using gin (name extensions.gin_trgm_ops);
create index places_published_idx on public.places (published_at desc) where status = 'published';
create index places_rating_idx on public.places (rating_avg desc, rating_count desc) where status = 'published';

create table public.place_amenities (
  place_id   uuid not null references public.places (id) on delete cascade,
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  primary key (place_id, amenity_id)
);

-- 1:1 extension tables. They hold ONLY type-specific attributes.
create table public.hotel_details (
  place_id         uuid primary key references public.places (id) on delete cascade,
  star_rating      smallint check (star_rating between 1 and 5),
  room_count       integer check (room_count > 0),
  check_in_time    time,
  check_out_time   time,
  booking_provider text,
  booking_url      text check (booking_url is null or booking_url ~* '^https?://'),
  updated_at       timestamptz not null default now()
);

create table public.restaurant_details (
  place_id          uuid primary key references public.places (id) on delete cascade,
  cuisines          text[] not null default '{}',
  serves_alcohol    boolean,
  reservations_url  text check (reservations_url is null or reservations_url ~* '^https?://'),
  dress_code        text,
  updated_at        timestamptz not null default now()
);

create table public.attraction_details (
  place_id          uuid primary key references public.places (id) on delete cascade,
  attraction_type   text,
  is_free           boolean,
  entry_fee_amount  numeric(10, 2) check (entry_fee_amount >= 0),
  entry_fee_currency char(3),
  typical_duration_minutes integer check (typical_duration_minutes > 0),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- images — destination and place photography (Storage object references)
-- ---------------------------------------------------------------------------

create table public.images (
  id             uuid primary key default gen_random_uuid(),
  destination_id uuid references public.destinations (id) on delete cascade,
  place_id       uuid references public.places (id) on delete cascade,
  storage_path   text not null unique,
  alt_text       text not null default '',
  width          integer check (width > 0),
  height         integer check (height > 0),
  credit         text,
  sort_order     smallint not null default 0,
  is_cover       boolean not null default false,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  constraint images_one_parent check ((destination_id is null) <> (place_id is null))
);

create index images_destination_idx on public.images (destination_id, sort_order);
create index images_place_idx on public.images (place_id, sort_order);

-- ---------------------------------------------------------------------------
-- Saved places & collections
-- ---------------------------------------------------------------------------

create table public.saved_places (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  place_id       uuid references public.places (id) on delete cascade,
  destination_id uuid references public.destinations (id) on delete cascade,
  note           text check (char_length(note) <= 500),
  created_at     timestamptz not null default now(),
  constraint saved_places_one_target check ((place_id is null) <> (destination_id is null))
);

create unique index saved_places_user_place_idx on public.saved_places (user_id, place_id)
  where place_id is not null;
create unique index saved_places_user_destination_idx on public.saved_places (user_id, destination_id)
  where destination_id is not null;
create index saved_places_user_idx on public.saved_places (user_id, created_at desc);

create table public.collections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 1 and 80),
  description      text check (char_length(description) <= 500),
  visibility       public.collection_visibility not null default 'private',
  cover_image_path text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index collections_user_name_idx on public.collections (user_id, lower(name));
create index collections_user_idx on public.collections (user_id, created_at desc);

create table public.collection_items (
  id             uuid primary key default gen_random_uuid(),
  collection_id  uuid not null references public.collections (id) on delete cascade,
  place_id       uuid references public.places (id) on delete cascade,
  destination_id uuid references public.destinations (id) on delete cascade,
  sort_order     integer not null default 0,
  added_at       timestamptz not null default now(),
  constraint collection_items_one_target check ((place_id is null) <> (destination_id is null))
);

create unique index collection_items_place_idx on public.collection_items (collection_id, place_id)
  where place_id is not null;
create unique index collection_items_destination_idx on public.collection_items (collection_id, destination_id)
  where destination_id is not null;

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

create table public.reviews (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  place_id        uuid references public.places (id) on delete cascade,
  destination_id  uuid references public.destinations (id) on delete cascade,
  rating          smallint not null check (rating between 1 and 5),
  title           text check (char_length(title) <= 120),
  body            text check (char_length(body) <= 4000),
  visit_date      date check (visit_date is null or visit_date <= current_date),
  status          public.review_status not null default 'published',
  moderation_note text,
  moderated_by    uuid references public.profiles (id) on delete set null,
  moderated_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint reviews_one_target check ((place_id is null) <> (destination_id is null))
);

create unique index reviews_user_place_idx on public.reviews (user_id, place_id) where place_id is not null;
create unique index reviews_user_destination_idx on public.reviews (user_id, destination_id) where destination_id is not null;
create index reviews_place_idx on public.reviews (place_id, created_at desc) where status = 'published';
create index reviews_destination_idx on public.reviews (destination_id, created_at desc) where status = 'published';
create index reviews_user_idx on public.reviews (user_id, created_at desc);
create index reviews_status_idx on public.reviews (status) where status <> 'published';

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       public.notification_kind not null,
  title      text not null check (char_length(title) <= 120),
  body       text not null check (char_length(body) <= 500),
  data       jsonb not null default '{}'::jsonb,
  dedupe_key text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create unique index notifications_dedupe_idx on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- recently viewed (drives the Home "Recently viewed" rail)
-- ---------------------------------------------------------------------------

create table public.recent_views (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  place_id       uuid references public.places (id) on delete cascade,
  destination_id uuid references public.destinations (id) on delete cascade,
  viewed_at      timestamptz not null default now(),
  constraint recent_views_one_target check ((place_id is null) <> (destination_id is null))
);

create unique index recent_views_user_place_idx on public.recent_views (user_id, place_id)
  where place_id is not null;
create unique index recent_views_user_destination_idx on public.recent_views (user_id, destination_id)
  where destination_id is not null;
create index recent_views_user_time_idx on public.recent_views (user_id, viewed_at desc);

-- ---------------------------------------------------------------------------
-- moderation reports
-- ---------------------------------------------------------------------------

create table public.content_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entity_type text not null check (entity_type in ('review', 'place', 'destination', 'image')),
  entity_id   uuid not null,
  reason      public.report_reason not null,
  details     text check (char_length(details) <= 1000),
  status      public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (reporter_id, entity_type, entity_id)
);

create index content_reports_status_idx on public.content_reports (status, created_at desc);

-- ---------------------------------------------------------------------------
-- activity_logs — append-only audit trail for privileged actions
-- ---------------------------------------------------------------------------

create table public.activity_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null check (char_length(action) between 3 and 80),
  entity_type text,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  ip          inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index activity_logs_created_idx on public.activity_logs (created_at desc);
create index activity_logs_actor_idx on public.activity_logs (actor_id, created_at desc);
