-- ============================================================================
-- LeftBehind — FICTIONAL development seed  (NEVER APPLY TO PRODUCTION)
--
-- Everything below is invented so a developer can open the app and see rows
-- before real content exists. No name, address, coordinate, price or rating
-- describes a real business, and none of it may be copied into a production
-- catalogue.
--
-- The file refuses to run unless the caller opts in explicitly, so a careless
-- `psql -f` cannot pollute a real database:
--
--   psql -c "set leftbehind.allow_demo_seed = 'on'" -f seed/dev_demo.sql
--
-- scripts/local_db.sh demo does this for you against the throwaway cluster.
-- ============================================================================

do $$
begin
  if coalesce(current_setting('leftbehind.allow_demo_seed', true), '') <> 'on' then
    raise exception
      'dev_demo.sql is fictional development data; run with leftbehind.allow_demo_seed = on'
      using hint = 'psql -c "set leftbehind.allow_demo_seed = ''on''" -f seed/dev_demo.sql';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Destinations
-- ---------------------------------------------------------------------------
insert into public.destinations (
  slug, name, country_code, region, city, summary, description,
  latitude, longitude, timezone, status, featured, popularity, published_at
) values
  ('demo-vela-point', 'Vela Point (demo)', 'PT', 'Demo Coast', 'Vela Point',
   'Fictional seaside town used for local development.',
   'A made-up town. Cliffs, a small harbour, and a cafe that does not exist.',
   38.7000, -9.4000, 'Europe/Lisbon', 'published', true, 120, now()),
  ('demo-grey-harbour', 'Grey Harbour (demo)', 'PT', 'Demo Coast', 'Grey Harbour',
   'Fictional harbour town used for local development.',
   'Another invented place, currently unpublished so draft states can be tested.',
   38.8000, -9.5000, 'Europe/Lisbon', 'draft', false, 0, null),
  ('demo-pine-hollow', 'Pine Hollow (demo)', 'PT', 'Demo Hills', 'Pine Hollow',
   'Fictional mountain village used for local development.',
   'Invented trails and a lodge that exists only in this file.',
   39.1000, -9.8000, 'Europe/Lisbon', 'published', false, 40, now())
on conflict (slug) do nothing;

insert into public.destination_category_links (destination_id, category_id)
select d.id, c.id
from public.destinations d
join public.destination_categories c
  on c.slug in ('coastal-escapes', 'city-breaks')
where d.slug = 'demo-vela-point'
on conflict do nothing;

insert into public.destination_category_links (destination_id, category_id)
select d.id, c.id
from public.destinations d
join public.destination_categories c on c.slug = 'mountain-retreats'
where d.slug = 'demo-pine-hollow'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Places
-- ---------------------------------------------------------------------------
insert into public.places (
  slug, name, kind, destination_id, description, address_line, city, country_code,
  latitude, longitude, phone, website, price_level, currency, price_note,
  opening_hours, status, data_source, published_at
) values
  ('demo-tidepool-cafe', 'Tidepool Cafe (demo)', 'restaurant',
   (select id from public.destinations where slug = 'demo-vela-point'),
   'Fictional cafe on an invented quay.',
   '1 Demo Quay', 'Vela Point', 'PT', 38.7005, -9.4005, '+000000000',
   'https://example.test/tidepool', 2, 'EUR', 'Fictional prices.',
   '{"mon-fri":"08:00-16:00","sat":"09:00-15:00"}'::jsonb, 'published', 'manual', now()),
  ('demo-lantern-inn', 'Lantern Inn (demo)', 'hotel',
   (select id from public.destinations where slug = 'demo-vela-point'),
   'Fictional twelve-room hotel.',
   '2 Demo Lane', 'Vela Point', 'PT', 38.7040, -9.4030, '+000000001',
   'https://example.test/lantern', 3, 'EUR', 'Fictional nightly rate.',
   null, 'published', 'manual', now()),
  ('demo-old-signal-tower', 'Old Signal Tower (demo)', 'historical',
   (select id from public.destinations where slug = 'demo-vela-point'),
   'Fictional ruin kept in draft so unpublished states are reachable.',
   '3 Demo Hill', 'Vela Point', 'PT', 38.7060, -9.4060, null, null,
   null, null, null, null, 'draft', 'manual', null),
  ('demo-pine-lodge', 'Pine Lodge (demo)', 'hotel',
   (select id from public.destinations where slug = 'demo-pine-hollow'),
   'Fictional lodge with invented trails nearby.',
   '4 Demo Track', 'Pine Hollow', 'PT', 39.1005, -9.8005, null,
   'https://example.test/pine-lodge', 2, 'EUR', 'Fictional nightly rate.',
   null, 'published', 'manual', now()),
  ('demo-harbour-kitchen', 'Harbour Kitchen (demo)', 'restaurant',
   (select id from public.destinations where slug = 'demo-grey-harbour'),
   'Fictional restaurant inside an unpublished destination.',
   '5 Demo Pier', 'Grey Harbour', 'PT', 38.8005, -9.5005, null, null,
   1, 'EUR', 'Fictional prices.', null, 'published', 'manual', now())
on conflict (slug) do nothing;

insert into public.hotel_details (place_id, star_rating, room_count, check_in_time, check_out_time, booking_provider)
select p.id, 4, 12, '15:00', '11:00', 'demo-provider'
from public.places p where p.slug = 'demo-lantern-inn'
on conflict (place_id) do nothing;

insert into public.hotel_details (place_id, star_rating, room_count, check_in_time, check_out_time)
select p.id, 3, 8, '16:00', '10:00'
from public.places p where p.slug = 'demo-pine-lodge'
on conflict (place_id) do nothing;

insert into public.restaurant_details (place_id, cuisines, serves_alcohol, dress_code)
select p.id, array['seafood', 'cafe'], true, 'none'
from public.places p where p.slug = 'demo-tidepool-cafe'
on conflict (place_id) do nothing;

insert into public.restaurant_details (place_id, cuisines, serves_alcohol)
select p.id, array['portuguese'], true
from public.places p where p.slug = 'demo-harbour-kitchen'
on conflict (place_id) do nothing;

insert into public.attraction_details (place_id, attraction_type, is_free, entry_fee_amount, entry_fee_currency, typical_duration_minutes)
select p.id, 'ruin', true, 0, 'EUR', 45
from public.places p where p.slug = 'demo-old-signal-tower'
on conflict (place_id) do nothing;

insert into public.place_amenities (place_id, amenity_id)
select p.id, a.id
from public.places p
join public.amenities a on a.slug in ('wifi', 'breakfast', 'parking')
where p.slug in ('demo-lantern-inn', 'demo-pine-lodge')
on conflict do nothing;

insert into public.place_amenities (place_id, amenity_id)
select p.id, a.id
from public.places p
join public.amenities a on a.slug in ('wifi', 'wheelchair-accessible')
where p.slug = 'demo-tidepool-cafe'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Images. `storage_path` points at a real Storage object that does not exist
-- yet, which is honest: uploads go through the admin dashboard. The client
-- must render its placeholder when the object is missing.
-- ---------------------------------------------------------------------------
insert into public.images (place_id, storage_path, alt_text, width, height, credit, is_cover, sort_order)
select p.id, 'demo/tidepool-cover.jpg', 'Fictional cafe terrace', 1600, 900, 'Demo seed', true, 0
from public.places p where p.slug = 'demo-tidepool-cafe'
on conflict (storage_path) do nothing;

insert into public.images (place_id, storage_path, alt_text, width, height, credit, is_cover, sort_order)
select p.id, 'demo/lantern-inn.jpg', 'Fictional hotel frontage', 1600, 900, 'Demo seed', true, 0
from public.places p where p.slug = 'demo-lantern-inn'
on conflict (storage_path) do nothing;

insert into public.images (destination_id, storage_path, alt_text, width, height, credit, is_cover, sort_order)
select d.id, 'demo/vela-point-hero.jpg', 'Fictional coastline', 2000, 1125, 'Demo seed', true, 0
from public.destinations d where d.slug = 'demo-vela-point'
on conflict (storage_path) do nothing;
