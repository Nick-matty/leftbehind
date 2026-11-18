-- ============================================================================
-- LeftBehind — reference seed data
--
-- Seed files contain ONLY curated taxonomy (categories, amenities). No
-- businesses, prices, ratings or photos are invented here: places and
-- destinations are ingested from Google Places or added by staff through the
-- admin dashboard. Demo rows for local development live in seed/dev_demo.sql
-- and are clearly marked as fictional.
-- ============================================================================

insert into public.destination_categories (slug, name, description, icon, sort_order)
values
  ('coastal-escapes', 'Coastal escapes', 'Seaside towns, cliffs and long beaches.', 'Waves', 10),
  ('city-breaks',     'City breaks',     'Walkable cities for a long weekend.',        'Building2', 20),
  ('food-and-culture','Food & culture',  'Markets, kitchens and neighbourhood life.',  'UtensilsCrossed', 30),
  ('mountain-retreats','Mountain retreats','Trails, alpine lakes and quiet lodges.',   'Mountain', 40),
  ('historical-sites','Historical sites', 'Old towns, ruins and museums.',             'Landmark', 50),
  ('island-getaways', 'Island getaways', 'Ferry hops and slow island days.',          'Palmtree', 60),
  ('road-trips',      'Road trips',      'Routes worth driving for their own sake.',   'Car', 70),
  ('wellness',        'Wellness',        'Hot springs, spas and slow travel.',         'Leaf', 80)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      icon = excluded.icon,
      sort_order = excluded.sort_order;

insert into public.amenities (slug, name, icon, category)
values
  ('wifi',                 'Wi-Fi',                'Wifi', 'general'),
  ('parking',              'Parking',              'CircleParking', 'general'),
  ('breakfast',            'Breakfast',            'Coffee', 'dining'),
  ('pool',                 'Pool',                 'Waves', 'wellness'),
  ('spa',                  'Spa',                  'Flower2', 'wellness'),
  ('gym',                  'Fitness centre',       'Dumbbell', 'wellness'),
  ('air-conditioning',     'Air conditioning',     'Snowflake', 'general'),
  ('pet-friendly',         'Pet friendly',         'Dog', 'general'),
  ('family-friendly',      'Family friendly',      'Baby', 'general'),
  ('wheelchair-accessible','Wheelchair accessible','Accessibility', 'accessibility'),
  ('restaurant',           'Restaurant',           'UtensilsCrossed', 'dining'),
  ('bar',                  'Bar',                  'Wine', 'dining'),
  ('laundry',              'Laundry',              'WashingMachine', 'general'),
  ('airport-shuttle',      'Airport shuttle',      'Bus', 'transport'),
  ('ev-charging',           'EV charging',          'PlugZap', 'transport')
on conflict (slug) do update
  set name = excluded.name,
      icon = excluded.icon,
      category = excluded.category;
