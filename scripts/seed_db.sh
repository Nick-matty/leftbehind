#!/usr/bin/env bash
# ============================================================================
# LeftBehind — Development Seed Data
# Populates the local PostgreSQL + PostGIS database with Tanzanian locations.
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Helper to run psql with proper env
run_psql() {
  export LD_LIBRARY_PATH="$ROOT/.pgstack/root/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"
  "$ROOT/.pgstack/root/usr/lib/postgresql/16/bin/psql" -h "$ROOT/.pgstack/run" -p 55432 -U postgres -d leftbehind_test -v ON_ERROR_STOP=1 -q "$@"
}

echo "=== Creating sample user (profile) ==="
run_psql -c "TRUNCATE TABLE profiles, destinations, places, reviews, saved_places, collection_items, collections CASCADE;"
PROFILE_ID=$(run_psql -t -c "
  INSERT INTO profiles (id, full_name, username, avatar_url, bio, home_city, locale, theme, profile_visibility, notify_recommendations, notify_place_updates, notify_review_activity, notify_account, notify_email_digest, onboarded_at, created_at)
  VALUES (
    gen_random_uuid(),
    'Demo User',
    'demo_user',
    'https://ui-avatars.com/api/?name=Demo+User&background=6366f1&color=fff',
    'Demo traveler exploring Tanzania',
    'Dar es Salaam',
    'en',
    'system',
    'public',
    true,
    true,
    true,
    true,
    false,
    now(),
    now()
  )
  RETURNING id;
")
echo "  Profile ID: $PROFILE_ID"

echo "=== Creating Tanzanian destinations ==="

echo "  Creating Dar es Salaam..."
run_psql -c "
  INSERT INTO destinations (slug, name, country_code, region, city, summary, description, latitude, longitude, timezone, hero_image_path, status, featured, popularity, rating_avg, rating_count)
  VALUES (
    'dar-es-salaam',
    'Dar es Salaam',
    'TZ',
    'Dar es Salaam Region',
    'Dar es Salaam',
    'Tanzania''s largest city and economic hub',
    'Dar es Salaam, also known as Dar, is Tanzania''s former capital and largest city. It is a major financial port on the Indian Ocean and the Dar es Salaam Region''s administrative center.',
    -6.7924,
    39.2083,
    'Africa/Dar_es_Salaam',
    'https://images.unsplash.com/photo-1563958316323-59dabba30f8f?w=800&h=400&fit=crop',
    'published',
    true,
    85,
    4.5,
    120
  );
"

echo "  Creating Zanzibar City..."
run_psql -c "
  INSERT INTO destinations (slug, name, country_code, region, city, summary, description, latitude, longitude, timezone, hero_image_path, status, featured, popularity, rating_avg, rating_count)
  VALUES (
    'zanzibar',
    'Zanzibar City',
    'TZ',
    'Zanzibar Urban/West',
    'Zanzibar City',
    'Historic Stone Town and spice island',
    'Zanzibar City, part of the Zanzíbar archipelago, is famous for its Stone Town—a UNESCO World Heritage Site—spice plantations, and white sand beaches.',
    -6.1659,
    39.2026,
    'Africa/Dar_es_Salaam',
    'https://images.unsplash.com/photo-1615412316907-3f2943b3c71b?w=800&h=400&fit=crop',
    'published',
    true,
    92,
    4.8,
    95
  );
"

echo "  Creating Arusha..."
run_psql -c "
  INSERT INTO destinations (slug, name, country_code, region, city, summary, description, latitude, longitude, timezone, hero_image_path, status, featured, popularity, rating_avg, rating_count)
  VALUES (
    'arusha',
    'Arusha',
    'TZ',
    'Arusha Region',
    'Arusha',
    'Gateway to Tanzania''s northern safari circuit',
    'Arusha is a city in north-eastern Tanzania, and the gateway to the northern safari circuit including Serengeti National Park, Ngorongoro Crater and Manyara Lake.',
    -3.3668,
    36.6782,
    'Africa/Dar_es_Salaam',
    'https://images.unsplash.com/photo-1551650175-21b0f7e7c93e?w=800&h=400&fit=crop',
    'published',
    true,
    78,
    4.3,
    88
  );
"

echo "  Creating Dodoma..."
run_psql -c "
  INSERT INTO destinations (slug, name, country_code, region, city, summary, description, latitude, longitude, timezone, hero_image_path, status, featured, popularity, rating_avg, rating_count)
  VALUES (
    'dodoma',
    'Dodoma',
    'TZ',
    'Dodoma Region',
    'Dodoma',
    'Tanzania''s political capital',
    'Dodoma, officially Dodoma City, is the national capital of Tanzania and the country''s third-largest city. It is centrally located on the Tanzania-Zambia highway.',
    -6.1727,
    35.7338,
    'Africa/Dar_es_Salaam',
    'https://images.unsplash.com/photo-1576048244227-5d9d7e88a1c1?w=800&h=400&fit=crop',
    'published',
    false,
    42,
    3.9,
    52
  );
"

echo "  Creating Serengeti..."
run_psql -c "
  INSERT INTO destinations (slug, name, country_code, region, city, summary, description, latitude, longitude, timezone, hero_image_path, status, featured, popularity, rating_avg, rating_count)
  VALUES (
    'serengeti',
    'Serengeti National Park',
    'TZ',
    'Serengeti',
    'Serengeti',
    'World-famous wildlife migration',
    'Serengeti National Park in Tanzania is famous for its annual wildlife migration, where millions of wildebeest and zebras cross the plains following the rains.',
    -2.3333,
    34.8333,
    'Africa/Dar_es_Salaam',
    'https://images.unsplash.com/photo-1556903900 E1bd83?w=800&h=400&fit=crop',
    'published',
    true,
    95,
    4.9,
    234
  );
"

echo "  Creating Ngorongoro..."
run_psql -c "
  INSERT INTO destinations (slug, name, country_code, region, city, summary, description, latitude, longitude, timezone, hero_image_path, status, featured, popularity, rating_avg, rating_count)
  VALUES (
    'ngorongoro',
    'Ngorongoro Crater',
    'TZ',
    'Ngorongoro',
    'Ngorongoro',
    'UNESCO World Heritage Site and volcanic caldera',
    'The Ngorongoro Crater is a large volcanic caldera within the Ngorongoro Conservation Area in Tanzania, known for its high concentration of wildlife.',
    -3.2500,
    35.2167,
    'Africa/Dar_es_Salaam',
    'https://images.unsplash.com/photo-1569728111782-94cfd6a1ee32?w=800&h=400&fit=crop',
    'published',
    true,
    88,
    4.7,
    167
  );
"

echo "  Destinations created"

echo "=== Creating places ==="

echo "  Creating City Hall Hotel (Dar es Salaam)..."
run_psql -c "
  INSERT INTO places (slug, name, kind, destination_id, description, address_line, city, country_code, latitude, longitude, phone, website, price_level, currency, data_source, status, created_by)
  VALUES (
    'city-hall-hotel',
    'City Hall Hotel',
    'hotel',
    (SELECT id FROM destinations WHERE slug = 'dar-es-salaam'),
    'Central hotel in Dar es Salaam with city views',
    'Mlimani City, Samora Avenue',
    'Dar es Salaam',
    'TZ',
    -6.7924,
    39.2083,
    '+255 22 211 1234',
    'https://cityhallhotel.tz',
    3,
    'TZS',
    'manual',
    'published'::moderation_status,
    (SELECT id FROM profiles WHERE username = 'demo_user')
  );
"

echo "  Creating Palm Beach Resort (Zanzibar)..."
run_psql -c "
  INSERT INTO places (slug, name, kind, destination_id, description, address_line, city, country_code, latitude, longitude, phone, website, price_level, currency, data_source, status, created_by)
  VALUES (
    'palm-beach-resort',
    'Palm Beach Resort',
    'hotel',
    (SELECT id FROM destinations WHERE slug = 'zanzibar'),
    'Luxury beachfront resort in Nungwi',
    'Nungwi Beach Road',
    'Zanzibar City',
    'TZ',
    -6.1659,
    39.2026,
    '+255 27 255 6789',
    'https://palmbeachresort.tz',
    4,
    'USD',
    'manual',
    'published'::moderation_status,
    (SELECT id FROM profiles WHERE username = 'demo_user')
  );
"

echo "  Creating Arusha Camping Safaris..."
run_psql -c "
  INSERT INTO places (slug, name, kind, destination_id, description, address_line, city, country_code, latitude, longitude, phone, website, price_level, currency, data_source, status, created_by)
  VALUES (
    'arusha-camping-safaris',
    'Arusha Camping Safaris',
    'attraction',
    (SELECT id FROM destinations WHERE slug = 'arusha'),
    'Guided camping safaris departing from Arusha',
    'Kimara Road',
    'Arusha',
    'TZ',
    -3.3668,
    36.6782,
    '+255 27 242 5678',
    'https://arusha-safaris.tz',
    4,
    'TZS',
    'manual',
    'published'::moderation_status,
    (SELECT id FROM profiles WHERE username = 'demo_user')
  );
"

echo "  Places created"

echo "=== Creating sample reviews ==="
run_psql -c "
  INSERT INTO review (user_id, destination_id, rating, title, body, visit_date, status)
  SELECT
    (SELECT id FROM profiles WHERE username = 'demo_user')::uuid as user_id,
    d.id as destination_id,
    4 + (random() * 1)::int as rating,
    'Excellent experience' as title,
    'Visited ' || d.name || ' and had an amazing time. The scenery was breathtaking and the local staff were very friendly. Would definitely recommend to anyone visiting Tanzania!' as body,
    now() - (random() * 30)::int * '1 day'::interval as visit_date,
    'published' as status
  FROM (SELECT unnest(ARRAY['dar-es-salaam','zanzibar','serengeti','ngorongoro']) as slug) s
  JOIN destinations d ON d.slug = s.slug
  LIMIT 4;
"
echo "  Reviews created"

echo "=== Creating saved places ==="
run_psql -c "
  INSERT INTO saved_places (user_id, destination_id, note, created_at)
  SELECT
    (SELECT id FROM profiles WHERE username = 'demo_user')::uuid as user_id,
    d.id as destination_id,
    'Wish to visit this beautiful destination in Tanzania!' as note,
    now() - (random() * 60)::int * '1 day'::interval as created_at
  FROM (SELECT unnest(ARRAY['zanzibar','serengeti']) as slug) s
  JOIN destinations d ON d.slug = s.slug
  LIMIT 2;
"
echo "  Saved places created"

echo "=== Creating collection ==="
COLLECTION_ID=$(run_psql -t -c "
  INSERT INTO collections (user_id, name, description, is_public)
  VALUES (
    (SELECT id FROM profiles WHERE username = 'demo_user'),
    'Tanzania Trip',
    'My favorite destinations in Tanzania',
    true
  )
  RETURNING id;
")
echo "  Collection ID: $COLLECTION_ID"

echo "=== Creating collection items ==="
run_psql -c "
  INSERT INTO collection_items (collection_id, place_id, order_index)
  SELECT
    '$COLLECTION_ID'::uuid as collection_id,
    p.id as place_id,
    1 as order_index
  FROM places p
  WHERE p.slug = 'palm-beach-resort';
"
echo "  Collection items created"

echo "=== Verifying seed data ==="
echo "Destinations: $(run_psql -t -c 'SELECT count(*) FROM destinations;')"
echo "Places: $(run_psql -t -c 'SELECT count(*) FROM places;')"
echo "Profiles: $(run_psql -t -c 'SELECT count(*) FROM profiles;')"
echo "Reviews: $(run_psql -t -c 'SELECT count(*) FROM review;')"
echo "Saved places: $(run_psql -t -c 'SELECT count(*) FROM saved_places;')"
echo "Collections: $(run_psql -t -c 'SELECT count(*) FROM collections;')"
echo "Collection items: $(run_psql -t -c 'SELECT count(*) FROM collection_items;')"

echo ""
echo "=== Seed data complete ==="