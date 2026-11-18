-- ============================================================================
-- LeftBehind — deterministic, entirely fictional test fixtures
--
-- Every name, coordinate and review below is invented for these tests. Nothing
-- here describes a real business. Slugs are prefixed `demo-` so an accidental
-- copy into another database is obvious.
--
-- Fixed UUIDs are used so the assertion files can refer to rows by name.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Accounts (the on_auth_user_created trigger creates profiles + base role)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.test', now(), '{"full_name":"Alice Author"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.test',   now(), '{"full_name":"Bob Reader"}'),
  ('33333333-3333-3333-3333-333333333333', 'carol@example.test', now(), '{"full_name":"Carol Editor"}'),
  ('44444444-4444-4444-4444-444444444444', 'mod@example.test',   now(), '{"full_name":"Mo Moderator"}'),
  ('55555555-5555-5555-5555-555555555555', 'admin@example.test', now(), '{"full_name":"Sam Admin"}')
on conflict (id) do nothing;

-- Staff grants are made directly here; admin_set_role() is exercised separately.
insert into public.user_roles (user_id, role) values
  ('33333333-3333-3333-3333-333333333333', 'content_manager'),
  ('44444444-4444-4444-4444-444444444444', 'moderator'),
  ('55555555-5555-5555-5555-555555555555', 'super_admin')
on conflict (user_id, role) do nothing;

insert into public.profiles (id, full_name, username) values
  ('11111111-1111-1111-1111-111111111111', 'Alice Author', 'alice')
on conflict (id) do update set username = excluded.username;

update public.profiles set profile_visibility = 'private' where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set profile_visibility = 'public'  where id = '11111111-1111-1111-1111-111111111111';

-- ---------------------------------------------------------------------------
-- Destinations: one published, one draft
-- ---------------------------------------------------------------------------
insert into public.destinations (
  id, slug, name, country_code, region, city, summary, latitude, longitude,
  status, featured, popularity, published_at
) values
  ('a0000000-0000-4000-8000-000000000001', 'demo-vela-point', 'Vela Point', 'PT', 'Algarve', 'Vela Point',
   'A fictional coastal town used only by automated tests.', 38.7000, -9.4000, 'published', true, 10, now()),
  ('a0000000-0000-4000-8000-000000000002', 'demo-grey-harbour', 'Grey Harbour', 'PT', 'Algarve', 'Grey Harbour',
   'A fictional draft destination used only by automated tests.', 38.8000, -9.5000, 'draft', false, 0, null)
on conflict (id) do nothing;

insert into public.destination_category_links (destination_id, category_id)
select 'a0000000-0000-4000-8000-000000000001', c.id
from public.destination_categories c
where c.slug = 'coastal-escapes'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Places: two published (restaurant + hotel), one draft, 21 review targets
-- ---------------------------------------------------------------------------
insert into public.places (
  id, slug, name, kind, destination_id, description, address_line, city,
  country_code, latitude, longitude, price_level, currency, status, published_at
) values
  ('b0000000-0000-4000-8000-000000000001', 'demo-tidepool-cafe', 'Tidepool Cafe', 'restaurant',
   'a0000000-0000-4000-8000-000000000001', 'A fictional seaside cafe used only by tests.',
   '1 Test Quay', 'Vela Point', 'PT', 38.7005, -9.4005, 2, 'EUR', 'published', now()),
  ('b0000000-0000-4000-8000-000000000002', 'demo-lantern-inn', 'Lantern Inn', 'hotel',
   'a0000000-0000-4000-8000-000000000001', 'A fictional small hotel used only by tests.',
   '2 Test Lane', 'Vela Point', 'PT', 38.7040, -9.4030, 3, 'EUR', 'published', now()),
  ('b0000000-0000-4000-8000-000000000003', 'demo-old-signal-tower', 'Old Signal Tower', 'historical',
   'a0000000-0000-4000-8000-000000000001', 'A fictional draft place used only by tests.',
   '3 Test Hill', 'Vela Point', 'PT', 38.7060, -9.4060, null, null, 'draft', null)
on conflict (id) do nothing;

insert into public.places (slug, name, kind, destination_id, latitude, longitude, status, published_at)
select
  'demo-extra-place-' || lpad(i::text, 2, '0'),
  'Demo Extra Place ' || i,
  'attraction',
  'a0000000-0000-4000-8000-000000000001',
  38.7100 + (i * 0.0001),
  -9.4100,
  'published',
  now()
from generate_series(1, 21) as i
on conflict (slug) do nothing;

insert into public.hotel_details (place_id, star_rating, room_count, check_in_time)
values ('b0000000-0000-4000-8000-000000000002', 4, 12, '15:00')
on conflict (place_id) do nothing;

insert into public.restaurant_details (place_id, cuisines, serves_alcohol)
values ('b0000000-0000-4000-8000-000000000001', array['seafood', 'cafe'], true)
on conflict (place_id) do nothing;

insert into public.images (place_id, storage_path, alt_text, is_cover) values
  ('b0000000-0000-4000-8000-000000000001', 'demo/tidepool-cover.jpg', 'Fictional cafe terrace', true),
  ('b0000000-0000-4000-8000-000000000003', 'demo/signal-tower.jpg', 'Fictional signal tower', true)
on conflict (storage_path) do nothing;

-- ---------------------------------------------------------------------------
-- Saves and collections
-- ---------------------------------------------------------------------------
insert into public.saved_places (id, user_id, place_id) values
  ('d0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'b0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000002', '22222222-2222-2222-2222-222222222222', 'b0000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into public.collections (id, user_id, name, visibility) values
  ('e0000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'Demo private plan', 'private'),
  ('e0000000-0000-4000-8000-000000000002', '22222222-2222-2222-2222-222222222222', 'Demo public list', 'public')
on conflict (id) do nothing;

insert into public.collection_items (id, collection_id, place_id) values
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Reviews: one published (Bob), one hidden (Bob)
--
-- The hidden row is inserted with the guard trigger disabled because normally
-- only moderation moves a review out of `published`, and the guard would force
-- a non-moderator insert back to published.
-- ---------------------------------------------------------------------------
insert into public.reviews (id, user_id, place_id, rating, title, body) values
  ('0a000000-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222',
   'b0000000-0000-4000-8000-000000000001', 4, 'Fictional but pleasant', 'Written by a fictional test account.')
on conflict (id) do nothing;

alter table public.reviews disable trigger reviews_guard_before_write;
insert into public.reviews (id, user_id, place_id, rating, title, body, status, moderation_note) values
  ('0a000000-0000-4000-8000-000000000002', '22222222-2222-2222-2222-222222222222',
   'b0000000-0000-4000-8000-000000000002', 2, 'Hidden for testing', 'Hidden by a fixture, not by a moderator.', 'hidden', 'Fixture row')
on conflict (id) do nothing;
alter table public.reviews enable trigger reviews_guard_before_write;

-- ---------------------------------------------------------------------------
-- Reports and notifications
-- ---------------------------------------------------------------------------
insert into public.content_reports (id, reporter_id, entity_type, entity_id, reason, details) values
  ('0b000000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111',
   'review', '0a000000-0000-4000-8000-000000000001', 'inaccurate', 'Fictional report for tests.')
on conflict (id) do nothing;

insert into public.notifications (id, user_id, kind, title, body, dedupe_key) values
  ('0c000000-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222',
   'system', 'Welcome', 'A fictional notification for tests.', 'fixture-welcome')
on conflict (id) do nothing;
