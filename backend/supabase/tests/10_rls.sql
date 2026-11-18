-- ============================================================================
-- LeftBehind — row level security assertions
--
-- Each block runs in one transaction so `set local role` and the JWT claim are
-- scoped to that block. Assertions are recorded in tests.results; the runner
-- fails the build if any row is not ok.
--
-- Requires 00_shims.sql + migrations + reference seed + 05_fixtures.sql.
-- ============================================================================

\echo '  [10_rls] anonymous visitor'

begin;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select tests.check_eq('anon sees the published destination',
  $q$select count(*)::text from public.destinations where slug = 'demo-vela-point'$q$, '1');
select tests.check_eq('anon cannot see a draft destination',
  $q$select count(*)::text from public.destinations where slug = 'demo-grey-harbour'$q$, '0');
select tests.check_eq('anon sees only published places',
  $q$select count(*)::text from public.places where slug in ('demo-tidepool-cafe', 'demo-lantern-inn')$q$, '2');
select tests.check_eq('anon cannot see a draft place',
  $q$select count(*)::text from public.places where slug = 'demo-old-signal-tower'$q$, '0');
select tests.check_eq('anon sees the cover image of a published place',
  $q$select count(*)::text from public.images where storage_path = 'demo/tidepool-cover.jpg'$q$, '1');
select tests.check_eq('anon cannot see the image of a draft place',
  $q$select count(*)::text from public.images where storage_path = 'demo/signal-tower.jpg'$q$, '0');
select tests.check_eq('anon cannot read the profiles table at all',
  $q$select count(*)::text from public.profiles$q$, '0');
select tests.check_eq('anon can read a public profile through the view',
  $q$select count(*)::text from public.public_profiles where id = '11111111-1111-1111-1111-111111111111'$q$, '1');
select tests.check_eq('anon cannot read a private profile through the view',
  $q$select count(*)::text from public.public_profiles where id = '33333333-3333-3333-3333-333333333333'$q$, '0');
select tests.check_eq('public_profiles exposes no email or notification columns',
  $q$select count(*)::text from information_schema.columns
      where table_schema = 'public' and table_name = 'public_profiles'
        and column_name in ('email', 'notify_email_digest', 'notify_account', 'theme')$q$, '0');
select tests.check_eq('anon cannot read saved places',
  $q$select count(*)::text from public.saved_places$q$, '0');
select tests.check_eq('anon cannot read notifications',
  $q$select count(*)::text from public.notifications$q$, '0');
select tests.check_eq('anon cannot read content reports',
  $q$select count(*)::text from public.content_reports$q$, '0');
select tests.check_eq('anon cannot read the activity log',
  $q$select count(*)::text from public.activity_logs$q$, '0');
select tests.check_eq('anon cannot read user roles',
  $q$select count(*)::text from public.user_roles$q$, '0');
select tests.check_eq('anon can read a published review',
  $q$select count(*)::text from public.reviews where id = '0a000000-0000-4000-8000-000000000001'$q$, '1');
select tests.check_eq('anon cannot read a hidden review',
  $q$select count(*)::text from public.reviews where id = '0a000000-0000-4000-8000-000000000002'$q$, '0');
select tests.check_eq('anon can read a public collection',
  $q$select count(*)::text from public.collections where id = 'e0000000-0000-4000-8000-000000000002'$q$, '1');
select tests.check_eq('anon cannot read a private collection',
  $q$select count(*)::text from public.collections where id = 'e0000000-0000-4000-8000-000000000001'$q$, '0');
select tests.check_eq('anon can read items of a public collection',
  $q$select count(*)::text from public.collection_items where collection_id = 'e0000000-0000-4000-8000-000000000002'$q$, '1');
select tests.check_eq('anon cannot read items of a private collection',
  $q$select count(*)::text from public.collection_items where collection_id = 'e0000000-0000-4000-8000-000000000001'$q$, '0');
select tests.err('anon cannot collect dashboard statistics',
  $q$select public.dashboard_stats()$q$, '42501');

commit;

\echo '  [10_rls] standard member (alice)'

begin;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
set local role authenticated;

select tests.check_eq('member sees their own saved place',
  $q$select count(*)::text from public.saved_places$q$, '1');
select tests.check_eq('member cannot see another user''s saved place',
  $q$select count(*)::text from public.saved_places where user_id = '22222222-2222-2222-2222-222222222222'$q$, '0');
select tests.err('member cannot save a place for another user',
  $q$insert into public.saved_places (user_id, place_id)
     values ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-4000-8000-000000000002')$q$, '42501');
select tests.dml('member cannot update another user''s saved place',
  $q$update public.saved_places set note = 'hijacked'
     where user_id = '22222222-2222-2222-2222-222222222222'$q$, 0);
select tests.dml('member cannot delete another user''s saved place',
  $q$delete from public.saved_places where user_id = '22222222-2222-2222-2222-222222222222'$q$, 0);
select tests.check_eq('member sees only their own role rows',
  $q$select count(*)::text from public.user_roles where user_id = '22222222-2222-2222-2222-222222222222'$q$, '0');
select tests.check_eq('member sees their own base role',
  $q$select count(*)::text from public.user_roles
      where user_id = '11111111-1111-1111-1111-111111111111' and role = 'user'$q$, '1');
select tests.dml('member cannot promote themselves through the table',
  $q$update public.user_roles set role = 'administrator'
     where user_id = '11111111-1111-1111-1111-111111111111'$q$, 0);
select tests.err('member cannot publish a destination',
  $q$insert into public.destinations (slug, name, country_code, summary, latitude, longitude, status)
     values ('demo-forged', 'Forged', 'PT', 'Attempted by a standard member.', 1, 1, 'published')$q$, '42501');
select tests.dml('member cannot delete catalogue rows',
  $q$delete from public.destinations$q$, 0);
select tests.dml('member cannot edit places',
  $q$update public.places set name = 'Renamed' where slug = 'demo-tidepool-cafe'$q$, 0);
select tests.err('member cannot insert their own profile row',
  $q$insert into public.profiles (id, full_name)
     values ('11111111-1111-1111-1111-111111111111', 'Alice Clone')$q$, '42501');
select tests.dml('member cannot edit another user''s profile',
  $q$update public.profiles set bio = 'changed' where id = '22222222-2222-2222-2222-222222222222'$q$, 0);
select tests.err('member cannot store an invalid theme value',
  $q$update public.profiles set theme = 'neon' where id = '11111111-1111-1111-1111-111111111111'$q$, '23514');
select tests.err('member cannot insert a notification',
  $q$insert into public.notifications (user_id, kind, title, body)
     values ('11111111-1111-1111-1111-111111111111', 'system', 'Forged', 'Forged body')$q$, '42501');
select tests.check_eq('member cannot read another user''s notifications',
  $q$select count(*)::text from public.notifications where user_id = '22222222-2222-2222-2222-222222222222'$q$, '0');
select tests.check_eq('member cannot read the activity log',
  $q$select count(*)::text from public.activity_logs$q$, '0');
select tests.check_eq('member sees their own content report',
  $q$select count(*)::text from public.content_reports where reporter_id = '11111111-1111-1111-1111-111111111111'$q$, '1');
select tests.err('member cannot moderate a review',
  $q$select public.admin_moderate_review('0a000000-0000-4000-8000-000000000002', 'removed', 'not allowed')$q$, '42501');
select tests.err('member cannot grant roles',
  $q$select public.admin_set_role('11111111-1111-1111-1111-111111111111', 'moderator', true)$q$, '42501');
select tests.err('member cannot read dashboard statistics',
  $q$select public.dashboard_stats()$q$, '42501');

commit;

\echo '  [10_rls] review author (bob)'

begin;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
set local role authenticated;

select tests.check_eq('author can still see their hidden review',
  $q$select count(*)::text from public.reviews where id = '0a000000-0000-4000-8000-000000000002'$q$, '1');
select tests.err('author cannot publish their own hidden review',
  $q$update public.reviews set status = 'published' where id = '0a000000-0000-4000-8000-000000000002'$q$, '42501');
select tests.err('author cannot write moderation fields',
  $q$update public.reviews set moderation_note = 'cleared' where id = '0a000000-0000-4000-8000-000000000001'$q$, '42501');
select tests.err('author cannot reassign a review to another user',
  $q$update public.reviews set user_id = '11111111-1111-1111-1111-111111111111'
     where id = '0a000000-0000-4000-8000-000000000001'$q$, '42501');
select tests.err('member cannot add items to another user''s private collection',
  $q$insert into public.collection_items (collection_id, place_id)
     values ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002')$q$, '42501');
select tests.check_eq('member can read their own public collection items',
  $q$select count(*)::text from public.collection_items
      where collection_id = 'e0000000-0000-4000-8000-000000000002'$q$, '1');

commit;

\echo '  [10_rls] content manager (carol)'

begin;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
set local role authenticated;

select tests.check_eq('content manager sees draft destinations',
  $q$select count(*)::text from public.destinations where slug = 'demo-grey-harbour'$q$, '1');
select tests.check_eq('content manager sees draft places',
  $q$select count(*)::text from public.places where slug = 'demo-old-signal-tower'$q$, '1');
select tests.dml('content manager can create a destination',
  $q$insert into public.destinations (slug, name, country_code, summary, latitude, longitude, status, created_by)
     values ('demo-carol-draft', 'Carol Draft', 'PT', 'Created by the content manager assertion.', 38.72, -9.42, 'draft',
             '33333333-3333-3333-3333-333333333333')$q$, 1);
select tests.dml('content manager can create a place',
  $q$insert into public.places (slug, name, kind, latitude, longitude, status, created_by)
     values ('demo-carol-place', 'Carol Place', 'attraction', 38.721, -9.421, 'draft',
             '33333333-3333-3333-3333-333333333333')$q$, 1);
select tests.dml('content manager can publish a place',
  $q$update public.places set status = 'published', published_at = now() where slug = 'demo-carol-place'$q$, 1);
select tests.dml('content manager cannot change roles',
  $q$update public.user_roles set role = 'administrator'
     where user_id = '11111111-1111-1111-1111-111111111111'$q$, 0);
select tests.err('content manager cannot grant roles',
  $q$select public.admin_set_role('11111111-1111-1111-1111-111111111111', 'moderator', true)$q$, '42501');
select tests.err('content manager cannot read dashboard statistics',
  $q$select public.dashboard_stats()$q$, '42501');

commit;

\echo '  [10_rls] moderator (mo)'

begin;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
set local role authenticated;

select tests.check_eq('moderator sees hidden reviews by other authors',
  $q$select count(*)::text from public.reviews where id = '0a000000-0000-4000-8000-000000000002'$q$, '1');
select tests.check_eq('moderator sees open content reports',
  $q$select count(*)::text from public.content_reports where status = 'open'$q$, '1');
select tests.err('moderator cannot publish catalogue content',
  $q$insert into public.destinations (slug, name, country_code, summary, latitude, longitude, status)
     values ('demo-mod-forged', 'Forged', 'PT', 'Attempted by a moderator.', 1, 1, 'published')$q$, '42501');
select tests.dml('moderator cannot change roles',
  $q$update public.user_roles set role = 'administrator'
     where user_id = '11111111-1111-1111-1111-111111111111'$q$, 0);
select tests.err('moderator cannot read dashboard statistics',
  $q$select public.dashboard_stats()$q$, '42501');

commit;

\echo '  [10_rls] super administrator (sam)'

begin;
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);
set local role authenticated;

select tests.check_eq('administrator can see every profile',
  $q$select count(*)::text from public.profiles$q$, '5');
select tests.check_eq('administrator gets dashboard statistics',
  $q$select (public.dashboard_stats() ->> 'users_total')::int >= 5$q$, 'true');
select tests.check_eq('administrator sees the activity log relation',
  $q$select count(*)::text from public.activity_logs$q$, '0');

commit;
