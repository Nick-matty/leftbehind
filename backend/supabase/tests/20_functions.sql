-- ============================================================================
-- LeftBehind — behaviour assertions: triggers, RPCs, moderation, aggregation
--
-- These run after 10_rls.sql and deliberately write data; the runner recreates
-- the database from scratch on every run.
-- ============================================================================

\echo '  [20_functions] profile provisioning and timestamps'

select tests.check_eq('every auth user received a profile',
  $q$select count(*)::text from public.profiles$q$, '5');
select tests.check_eq('every auth user received the base role',
  $q$select count(*)::text from public.user_roles where role = 'user'$q$, '5');
select tests.check_eq('profile name comes from signup metadata',
  $q$select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'$q$, 'Alice Author');
update public.destinations set name = name where slug = 'demo-vela-point';
select tests.check_eq('updated_at trigger advances on write',
  $q$select (updated_at > created_at)::text from public.destinations
      where slug = 'demo-vela-point'$q$, 'true');

-- ---------------------------------------------------------------------------
-- Reviews as a member
-- ---------------------------------------------------------------------------
\echo '  [20_functions] reviews, ratings and abuse limits'

begin;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
set local role authenticated;

select tests.dml('member can review a published place',
  $q$insert into public.reviews (user_id, place_id, rating, title, body)
     values ('11111111-1111-1111-1111-111111111111', 'b0000000-0000-4000-8000-000000000001',
             5, 'Fictional five', 'Written by a fictional test account.')$q$, 1);
select tests.err('a second review for the same place is rejected',
  $q$insert into public.reviews (user_id, place_id, rating)
     values ('11111111-1111-1111-1111-111111111111', 'b0000000-0000-4000-8000-000000000001', 3)$q$, '23505');
select tests.err('member cannot review a draft place',
  $q$insert into public.reviews (user_id, place_id, rating)
     values ('11111111-1111-1111-1111-111111111111', 'b0000000-0000-4000-8000-000000000003', 3)$q$, '42501');
select tests.err('member cannot author a review as somebody else',
  $q$insert into public.reviews (user_id, place_id, rating)
     values ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-4000-8000-000000000002', 3)$q$, '42501');

commit;

select tests.check_eq('rating average is recalculated from published reviews',
  $q$select rating_avg::text from public.places where slug = 'demo-tidepool-cafe'$q$, '4.5');
select tests.check_eq('rating count is recalculated from published reviews',
  $q$select rating_count::text from public.places where slug = 'demo-tidepool-cafe'$q$, '2');
select tests.check_eq('hidden reviews are excluded from the average',
  $q$select rating_count::text from public.places where slug = 'demo-lantern-inn'$q$, '0');

-- ---------------------------------------------------------------------------
-- Recently viewed
-- ---------------------------------------------------------------------------
\echo '  [20_functions] recently viewed'

begin;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
set local role authenticated;

select tests.dml('recording a view succeeds',
  $q$select public.record_place_view(p_place_id => 'b0000000-0000-4000-8000-000000000002')$q$, 1);
select tests.dml('recording the same view again updates one row',
  $q$select public.record_place_view(p_place_id => 'b0000000-0000-4000-8000-000000000002')$q$, 1);
select tests.check_eq('a repeated view does not duplicate the row',
  $q$select count(*)::text from public.recent_views
      where user_id = '11111111-1111-1111-1111-111111111111'$q$, '1');
select tests.err('recording a view with both targets is rejected',
  $q$select public.record_place_view(
       p_place_id => 'b0000000-0000-4000-8000-000000000002',
       p_destination_id => 'a0000000-0000-4000-8000-000000000001')$q$, '22023');

commit;

begin;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select tests.err('anonymous callers cannot record a view',
  $q$select public.record_place_view(p_place_id => 'b0000000-0000-4000-8000-000000000002')$q$, '42501');

commit;

-- ---------------------------------------------------------------------------
-- Search and proximity RPCs (run as an anonymous visitor)
-- ---------------------------------------------------------------------------
\echo '  [20_functions] search and proximity'

begin;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select tests.check_eq('nearby_places finds a published place within the radius',
  $q$select count(*)::text from public.nearby_places(38.7000, -9.4000, 1000)
      where slug = 'demo-tidepool-cafe'$q$, '1');
select tests.check_eq('nearby_places excludes draft places',
  $q$select count(*)::text from public.nearby_places(38.7000, -9.4000, 5000)
      where slug = 'demo-old-signal-tower'$q$, '0');
select tests.check_eq('nearby_places reports a plausible distance',
  $q$select (distance_m between 0 and 200)::text from public.nearby_places(38.7000, -9.4000, 1000)
      where slug = 'demo-tidepool-cafe'$q$, 'true');
select tests.check_eq('nearby_places honours the radius',
  $q$select count(*)::text from public.nearby_places(38.7000, -9.4000, 1)
      where slug = 'demo-lantern-inn'$q$, '0');
select tests.check_eq('nearby_places filters by kind',
  $q$select count(*)::text from public.nearby_places(38.7000, -9.4000, 1000, array['hotel']::public.place_kind[])$q$, '1');
select tests.check_eq('search_places matches a name',
  $q$select count(*)::text from public.search_places('Tidepool') where slug = 'demo-tidepool-cafe'$q$, '1');
select tests.check_eq('search_places does not leak draft places',
  $q$select count(*)::text from public.search_places('Signal')$q$, '0');
select tests.check_eq('search_places filters by kind',
  $q$select count(*)::text from public.search_places(null, 'hotel')$q$, '1');
select tests.check_eq('search_destinations matches a name',
  $q$select count(*)::text from public.search_destinations('Vela') where slug = 'demo-vela-point'$q$, '1');
select tests.check_eq('search_destinations does not leak draft destinations',
  $q$select count(*)::text from public.search_destinations('Grey')$q$, '0');
select tests.check_eq('search_destinations filters by category',
  $q$select count(*)::text from public.search_destinations(null, 'coastal-escapes')$q$, '1');

commit;

-- ---------------------------------------------------------------------------
-- Moderation with audit trail
-- ---------------------------------------------------------------------------
\echo '  [20_functions] moderation and audit'

begin;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
set local role authenticated;

select tests.dml('moderator can hide a published review',
  $q$select public.admin_moderate_review('0a000000-0000-4000-8000-000000000001', 'hidden', 'Assertion: hide')$q$, 1);

commit;

select tests.check_eq('moderation is written to the activity log',
  $q$select count(*)::text from public.activity_logs
      where action = 'review.moderate' and entity_id = '0a000000-0000-4000-8000-000000000001'$q$, '1');
select tests.check_eq('the review author is notified of moderation',
  $q$select count(*)::text from public.notifications
      where user_id = '22222222-2222-2222-2222-222222222222'
        and dedupe_key like 'review-moderation:%'$q$, '1');
select tests.check_eq('hiding a review recalculates the place rating',
  $q$select rating_avg::text || '/' || rating_count::text from public.places
      where slug = 'demo-tidepool-cafe'$q$, '5.0/1');

begin;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
set local role authenticated;

select tests.err('moderating an unknown review reports a missing row',
  $q$select public.admin_moderate_review('0a000000-0000-4000-8000-0000000000ff', 'hidden', null)$q$, 'P0002');

commit;

-- ---------------------------------------------------------------------------
-- Role administration
-- ---------------------------------------------------------------------------
\echo '  [20_functions] role administration'

begin;
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);
set local role authenticated;

select tests.dml('super administrator can grant a role',
  $q$select public.admin_set_role('11111111-1111-1111-1111-111111111111', 'moderator', true)$q$, 1);
select tests.err('the base user role cannot be granted or revoked',
  $q$select public.admin_set_role('11111111-1111-1111-1111-111111111111', 'user', true)$q$, '22023');
select tests.dml('super administrator can revoke a role',
  $q$select public.admin_set_role('11111111-1111-1111-1111-111111111111', 'moderator', false)$q$, 1);

commit;

select tests.check_eq('role grants are audited',
  $q$select count(*)::text from public.activity_logs
      where action in ('role.grant', 'role.revoke')
        and entity_id = '11111111-1111-1111-1111-111111111111'$q$, '2');
select tests.check_eq('a revoked role is removed',
  $q$select count(*)::text from public.user_roles
      where user_id = '11111111-1111-1111-1111-111111111111' and role = 'moderator'$q$, '0');

-- ---------------------------------------------------------------------------
-- Review flood limit: 20 per rolling 24 hours
-- ---------------------------------------------------------------------------
\echo '  [20_functions] review flood limit'

-- Bob already has 2 reviews from the fixtures; add 18 more to reach the cap.
insert into public.reviews (user_id, place_id, rating, body)
select '22222222-2222-2222-2222-222222222222', p.id, 3, 'Bulk fixture review.'
from public.places p
where p.slug like 'demo-extra-place-%'
order by p.slug
limit 18;

select tests.check_eq('the flood fixture reached the limit',
  $q$select count(*)::text from public.reviews
      where user_id = '22222222-2222-2222-2222-222222222222'$q$, '20');

begin;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
set local role authenticated;

select tests.err('the 21st review in 24 hours is rate limited',
  $q$insert into public.reviews (user_id, place_id, rating)
     values ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-4000-8000-000000000001', 4)$q$, '42901');

commit;

-- ---------------------------------------------------------------------------
-- Collections
-- ---------------------------------------------------------------------------
\echo '  [20_functions] collections'

begin;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
set local role authenticated;

select tests.dml('an owner can add an item to their own collection',
  $q$insert into public.collection_items (collection_id, place_id)
     values ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002')$q$, 1);
select tests.err('the same item cannot be added twice',
  $q$insert into public.collection_items (collection_id, place_id)
     values ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002')$q$, '23505');

commit;
