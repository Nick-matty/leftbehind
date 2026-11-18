-- ============================================================================
-- LeftBehind — 0002 authorization
--
-- Authorization model
--   * RLS is enabled on every table in `public`. There is no "trusted client".
--   * Role checks go through SECURITY DEFINER helpers so policies never
--     recurse into `user_roles` policies.
--   * Public read = published content only. Everything user-scoped is keyed on
--     auth.uid(). Writes to audit/moderation/notification tables are reserved
--     for moderators or the service role.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------

create or replace function public.has_any_role(p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role = any (p_roles)
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select public.has_any_role(array['super_admin']::public.app_role[]); $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select public.has_any_role(array['super_admin', 'administrator']::public.app_role[]); $$;

create or replace function public.can_manage_content()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select public.has_any_role(array['super_admin', 'administrator', 'content_manager']::public.app_role[]); $$;

create or replace function public.can_moderate()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select public.has_any_role(array['super_admin', 'administrator', 'moderator']::public.app_role[]); $$;

revoke all on function public.has_any_role(public.app_role[]) from public;
revoke all on function public.is_super_admin() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.can_manage_content() from public;
revoke all on function public.can_moderate() from public;

-- Also granted to `anon`: anonymous read policies evaluate these helpers, and
-- without EXECUTE the whole SELECT would fail with a permission error.
-- They return false for signed-out callers.
grant execute on function public.has_any_role(public.app_role[]) to anon, authenticated;
grant execute on function public.is_super_admin() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.can_manage_content() to anon, authenticated;
grant execute on function public.can_moderate() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

alter table public.profiles                   enable row level security;
alter table public.user_roles                 enable row level security;
alter table public.destination_categories     enable row level security;
alter table public.destination_category_links enable row level security;
alter table public.destinations               enable row level security;
alter table public.amenities                  enable row level security;
alter table public.places                     enable row level security;
alter table public.place_amenities            enable row level security;
alter table public.hotel_details              enable row level security;
alter table public.restaurant_details         enable row level security;
alter table public.attraction_details         enable row level security;
alter table public.images                     enable row level security;
alter table public.saved_places               enable row level security;
alter table public.collections                enable row level security;
alter table public.collection_items           enable row level security;
alter table public.reviews                    enable row level security;
alter table public.notifications              enable row level security;
alter table public.recent_views               enable row level security;
alter table public.content_reports            enable row level security;
alter table public.activity_logs              enable row level security;

-- ---------------------------------------------------------------------------
-- Table privileges
--
-- Supabase's project template grants these to anon/authenticated by default,
-- but relying on that default makes the schema's behaviour depend on the
-- platform's bootstrap rather than on this repository. Grants are therefore
-- declared explicitly: they only widen what RLS still has to authorise, and
-- every table above is protected by policies (or intentionally has none).
-- ---------------------------------------------------------------------------

-- `nearby_places` is SECURITY INVOKER and calls extensions.st_dwithin /
-- st_distance, so callers need USAGE on the schema those live in. Without it
-- an anonymous map request fails with 42501 even though RLS would allow it.
grant usage on schema extensions to anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
--   Base table is private (own row or staff). Public data is exposed through
--   the `public_profiles` view below, which never returns preferences.
-- ---------------------------------------------------------------------------

create policy "profiles_select_own_or_staff"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Owners run as postgres, so the view bypasses RLS and exposes a vetted column
-- list instead. Do not add email or preference columns here.
create view public.public_profiles
with (security_invoker = false) as
  select id, full_name, username, avatar_url, bio, home_city, created_at
  from public.profiles
  where profile_visibility = 'public';

comment on view public.public_profiles is
  'Safety-critical: owner-rights view that hides notification/privacy preferences. Keep the column list minimal.';

grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------

create policy "user_roles_select_own_or_staff"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "user_roles_write_super_admin"
  on public.user_roles for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Editorial content: read when published, write when staff
-- ---------------------------------------------------------------------------

create policy "destination_categories_select"
  on public.destination_categories for select to anon, authenticated
  using (is_active or public.can_manage_content());

create policy "destination_categories_write"
  on public.destination_categories for all to authenticated
  using (public.can_manage_content())
  with check (public.can_manage_content());

create policy "destinations_select_published"
  on public.destinations for select to anon, authenticated
  using (status = 'published' or public.can_manage_content());

create policy "destinations_insert"
  on public.destinations for insert to authenticated
  with check (public.can_manage_content());

create policy "destinations_update"
  on public.destinations for update to authenticated
  using (public.can_manage_content())
  with check (public.can_manage_content());

create policy "destinations_delete"
  on public.destinations for delete to authenticated
  using (public.can_manage_content());

create policy "destination_category_links_select"
  on public.destination_category_links for select to anon, authenticated
  using (
    public.can_manage_content()
    or exists (
      select 1 from public.destinations d
      where d.id = destination_id and d.status = 'published'
    )
  );

create policy "destination_category_links_write"
  on public.destination_category_links for all to authenticated
  using (public.can_manage_content())
  with check (public.can_manage_content());

create policy "amenities_select"
  on public.amenities for select to anon, authenticated
  using (true);

create policy "amenities_write"
  on public.amenities for all to authenticated
  using (public.can_manage_content())
  with check (public.can_manage_content());

create policy "places_select_published"
  on public.places for select to anon, authenticated
  using (status = 'published' or public.can_manage_content());

create policy "places_insert"
  on public.places for insert to authenticated
  with check (public.can_manage_content());

create policy "places_update"
  on public.places for update to authenticated
  using (public.can_manage_content())
  with check (public.can_manage_content());

create policy "places_delete"
  on public.places for delete to authenticated
  using (public.can_manage_content());

create policy "place_amenities_select"
  on public.place_amenities for select to anon, authenticated
  using (
    public.can_manage_content()
    or exists (
      select 1 from public.places p
      where p.id = place_id and p.status = 'published'
    )
  );

create policy "place_amenities_write"
  on public.place_amenities for all to authenticated
  using (public.can_manage_content())
  with check (public.can_manage_content());

create policy "hotel_details_select"
  on public.hotel_details for select to anon, authenticated
  using (
    public.can_manage_content()
    or exists (
      select 1 from public.places p
      where p.id = place_id and p.status = 'published'
    )
  );

create policy "hotel_details_write"
  on public.hotel_details for all to authenticated
  using (public.can_manage_content())
  with check (public.can_manage_content());

create policy "restaurant_details_select"
  on public.restaurant_details for select to anon, authenticated
  using (
    public.can_manage_content()
    or exists (
      select 1 from public.places p
      where p.id = place_id and p.status = 'published'
    )
  );

create policy "restaurant_details_write"
  on public.restaurant_details for all to authenticated
  using (public.can_manage_content())
  with check (public.can_manage_content());

create policy "attraction_details_select"
  on public.attraction_details for select to anon, authenticated
  using (
    public.can_manage_content()
    or exists (
      select 1 from public.places p
      where p.id = place_id and p.status = 'published'
    )
  );

create policy "attraction_details_write"
  on public.attraction_details for all to authenticated
  using (public.can_manage_content())
  with check (public.can_manage_content());

create policy "images_select"
  on public.images for select to anon, authenticated
  using (
    public.can_manage_content()
    or (destination_id is not null and exists (
      select 1 from public.destinations d
      where d.id = destination_id and d.status = 'published'
    ))
    or (place_id is not null and exists (
      select 1 from public.places p
      where p.id = place_id and p.status = 'published'
    ))
  );

create policy "images_write"
  on public.images for all to authenticated
  using (public.can_manage_content())
  with check (public.can_manage_content());

-- ---------------------------------------------------------------------------
-- User-owned data
-- ---------------------------------------------------------------------------

create policy "saved_places_select_own"
  on public.saved_places for select to authenticated
  using (user_id = (select auth.uid()));

create policy "saved_places_insert_own"
  on public.saved_places for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "saved_places_update_own"
  on public.saved_places for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "saved_places_delete_own"
  on public.saved_places for delete to authenticated
  using (user_id = (select auth.uid()));

-- Also readable by `anon`: a public collection is a share link, and the link
-- must work for a signed-out visitor. auth.uid() is null for them, so only
-- `visibility = 'public'` can be true.
create policy "collections_select_own_or_public"
  on public.collections for select to anon, authenticated
  using (user_id = (select auth.uid()) or visibility = 'public');

create policy "collections_insert_own"
  on public.collections for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "collections_update_own"
  on public.collections for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "collections_delete_own"
  on public.collections for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "collection_items_select"
  on public.collection_items for select to anon, authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id
        and (c.user_id = (select auth.uid()) or c.visibility = 'public')
    )
  );

create policy "collection_items_write"
  on public.collection_items for all to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  );

create policy "recent_views_select_own"
  on public.recent_views for select to authenticated
  using (user_id = (select auth.uid()));

create policy "recent_views_write_own"
  on public.recent_views for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- reviews: everyone reads published reviews, authors manage their own,
-- moderators may change status. The guard trigger (0003) blocks privilege
-- escalation through the author-update path.
-- ---------------------------------------------------------------------------

create policy "reviews_select_published_or_own"
  on public.reviews for select to anon, authenticated
  using (
    status = 'published'
    or user_id = (select auth.uid())
    or public.can_moderate()
  );

create policy "reviews_insert_own"
  on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "reviews_update_own"
  on public.reviews for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "reviews_update_moderator"
  on public.reviews for update to authenticated
  using (public.can_moderate())
  with check (public.can_moderate());

create policy "reviews_delete_own"
  on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "reviews_delete_moderator"
  on public.reviews for delete to authenticated
  using (public.can_moderate());

-- ---------------------------------------------------------------------------
-- notifications: read/acknowledge only; creating them is a server concern
-- ---------------------------------------------------------------------------

create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- reports & audit
-- ---------------------------------------------------------------------------

create policy "content_reports_insert_own"
  on public.content_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

create policy "content_reports_select_own_or_moderator"
  on public.content_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.can_moderate());

create policy "content_reports_update_moderator"
  on public.content_reports for update to authenticated
  using (public.can_moderate())
  with check (public.can_moderate());

create policy "activity_logs_select_admin"
  on public.activity_logs for select to authenticated
  using (public.is_admin());

-- Audit rows are written by SECURITY DEFINER functions only. No client
-- insert/update/delete policy exists, and the service role bypasses RLS.
