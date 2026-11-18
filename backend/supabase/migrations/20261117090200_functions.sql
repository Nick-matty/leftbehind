-- ============================================================================
-- LeftBehind — 0003 behaviour: triggers, RPC surface, storage policies
--
-- Every server-side rule that must not be bypassable from a client lives here:
-- profile provisioning, rating aggregation, review abuse limits, moderation
-- with audit logging, geo search and dashboard aggregates.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger destinations_set_updated_at before update on public.destinations
  for each row execute function public.set_updated_at();
create trigger places_set_updated_at before update on public.places
  for each row execute function public.set_updated_at();
create trigger destination_categories_set_updated_at before update on public.destination_categories
  for each row execute function public.set_updated_at();
create trigger collections_set_updated_at before update on public.collections
  for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();
create trigger hotel_details_set_updated_at before update on public.hotel_details
  for each row execute function public.set_updated_at();
create trigger restaurant_details_set_updated_at before update on public.restaurant_details
  for each row execute function public.set_updated_at();
create trigger attraction_details_set_updated_at before update on public.attraction_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profile provisioning: one trigger, so clients cannot invent rows
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Traveler'
  );

  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    left(v_name, 80),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'en')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Review integrity: no privilege escalation, no self-promotion, no flooding
-- ---------------------------------------------------------------------------

create or replace function public.reviews_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := (select auth.uid());
  v_is_moderator boolean := public.can_moderate();
  v_recent integer;
  v_target_status public.moderation_status;
begin
  if tg_op = 'INSERT' then
    -- A review always belongs to whoever is signed in, moderators included.
    if v_actor is not null and new.user_id <> v_actor then
      raise exception 'review author must be the authenticated user' using errcode = '42501';
    end if;

    -- Non-moderators always create live reviews; moderators may pre-hide.
    if not v_is_moderator then
      new.status := 'published';
      new.moderation_note := null;
      new.moderated_by := null;
      new.moderated_at := null;
    end if;

    -- Basic flood protection: at most 20 reviews per rolling 24h.
    select count(*) into v_recent
    from public.reviews r
    where r.user_id = new.user_id
      and r.created_at > now() - interval '24 hours';

    if v_recent >= 20 then
      raise exception 'review rate limit reached, try again later' using errcode = '42901';
    end if;
  else
    -- Authors cannot move a review into another account or edit moderation
    -- fields. Moderators may do both, which is what makes
    -- admin_moderate_review() possible: it updates another user's row.
    if not v_is_moderator then
      if v_actor is not null and new.user_id <> v_actor then
        raise exception 'review author must be the authenticated user' using errcode = '42501';
      end if;

      if new.status is distinct from old.status
         or new.moderation_note is distinct from old.moderation_note
         or new.moderated_by is distinct from old.moderated_by
         or new.moderated_at is distinct from old.moderated_at then
        raise exception 'only moderators may change review moderation state' using errcode = '42501';
      end if;
      new.user_id := old.user_id;
      new.created_at := old.created_at;
    end if;
  end if;

  if new.place_id is not null then
    select p.status into v_target_status from public.places p where p.id = new.place_id;
    if v_target_status is null or v_target_status <> 'published' then
      raise exception 'cannot review an unpublished place' using errcode = '42501';
    end if;
  elsif new.destination_id is not null then
    select d.status into v_target_status from public.destinations d where d.id = new.destination_id;
    if v_target_status is null or v_target_status <> 'published' then
      raise exception 'cannot review an unpublished destination' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger reviews_guard_before_write
  before insert or update on public.reviews
  for each row execute function public.reviews_guard();

-- ---------------------------------------------------------------------------
-- Rating aggregation — derived data, never written by clients
-- ---------------------------------------------------------------------------

create or replace function public.recalc_rating(p_place_id uuid, p_destination_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_place_id is not null then
    update public.places p
    set rating_avg = coalesce(sub.avg_rating, 0),
        rating_count = coalesce(sub.total, 0)
    from (
      select round(avg(r.rating)::numeric, 1) as avg_rating, count(*) as total
      from public.reviews r
      where r.place_id = p_place_id and r.status = 'published'
    ) sub
    where p.id = p_place_id;
  end if;

  if p_destination_id is not null then
    update public.destinations d
    set rating_avg = coalesce(sub.avg_rating, 0),
        rating_count = coalesce(sub.total, 0)
    from (
      select round(avg(r.rating)::numeric, 1) as avg_rating, count(*) as total
      from public.reviews r
      where r.destination_id = p_destination_id and r.status = 'published'
    ) sub
    where d.id = p_destination_id;
  end if;
end;
$$;

create or replace function public.reviews_sync_rating()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_rating(old.place_id, old.destination_id);
    return old;
  end if;

  perform public.recalc_rating(new.place_id, new.destination_id);

  -- A review that moved between targets must refresh the old one too.
  if tg_op = 'UPDATE' then
    if old.place_id is distinct from new.place_id then
      perform public.recalc_rating(old.place_id, null);
    end if;
    if old.destination_id is distinct from new.destination_id then
      perform public.recalc_rating(null, old.destination_id);
    end if;
  end if;

  return new;
end;
$$;

create trigger reviews_sync_rating_after_write
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_sync_rating();

-- ---------------------------------------------------------------------------
-- Notify the author when a moderator hides or removes their review
-- ---------------------------------------------------------------------------

create or replace function public.notify_review_moderation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status and new.status <> 'published' then
    insert into public.notifications (user_id, kind, title, body, data, dedupe_key)
    values (
      new.user_id,
      'review_interaction',
      'Your review was moderated',
      case
        when new.status = 'hidden' then 'Your review is hidden while a moderator reviews it.'
        else 'Your review was removed for violating the community guidelines.'
      end,
      jsonb_build_object('review_id', new.id, 'status', new.status),
      'review-moderation:' || new.id::text || ':' || new.status::text
    )
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;
  return new;
end;
$$;

create trigger reviews_notify_moderation
  after update of status on public.reviews
  for each row execute function public.notify_review_moderation();

-- ---------------------------------------------------------------------------
-- RPC: nearby places (Map module, "near me" rails)
-- ---------------------------------------------------------------------------

create or replace function public.nearby_places(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_m integer default 5000,
  p_kinds public.place_kind[] default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  name text,
  kind public.place_kind,
  city text,
  latitude double precision,
  longitude double precision,
  rating_avg numeric,
  rating_count integer,
  price_level smallint,
  cover_image_path text,
  distance_m double precision
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with origin as (
    select extensions.st_setsrid(
             extensions.st_makepoint(p_longitude, p_latitude), 4326
           )::extensions.geography as geog
  )
  select
    p.id,
    p.slug,
    p.name,
    p.kind,
    p.city,
    p.latitude,
    p.longitude,
    p.rating_avg,
    p.rating_count,
    p.price_level,
    cover.storage_path as cover_image_path,
    extensions.st_distance(p.location, origin.geog) as distance_m
  from public.places p
  cross join origin
  left join lateral (
    select i.storage_path
    from public.images i
    where i.place_id = p.id
    order by i.is_cover desc, i.sort_order asc
    limit 1
  ) cover on true
  where p.status = 'published'
    and p.location is not null
    and extensions.st_dwithin(p.location, origin.geog, greatest(p_radius_m, 1))
    and (p_kinds is null or p.kind = any (p_kinds))
  order by distance_m asc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

-- ---------------------------------------------------------------------------
-- RPC: place & destination search (Explore module)
-- ---------------------------------------------------------------------------

create or replace function public.search_places(
  p_query text,
  p_kind public.place_kind default null,
  p_destination_id uuid default null,
  p_min_rating numeric default null,
  p_sort text default 'relevance',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  name text,
  kind public.place_kind,
  city text,
  address_line text,
  latitude double precision,
  longitude double precision,
  rating_avg numeric,
  rating_count integer,
  price_level smallint,
  cover_image_path text
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with q as (
    select
      nullif(btrim(coalesce(p_query, '')), '') as raw,
      case
        when nullif(btrim(coalesce(p_query, '')), '') is null then null
        else websearch_to_tsquery('simple', btrim(p_query))
      end as tsq
  )
  select
    p.id,
    p.slug,
    p.name,
    p.kind,
    p.city,
    p.address_line,
    p.latitude,
    p.longitude,
    p.rating_avg,
    p.rating_count,
    p.price_level,
    cover.storage_path as cover_image_path
  from public.places p
  cross join q
  left join lateral (
    select i.storage_path
    from public.images i
    where i.place_id = p.id
    order by i.is_cover desc, i.sort_order asc
    limit 1
  ) cover on true
  where p.status = 'published'
    and (p_kind is null or p.kind = p_kind)
    and (p_destination_id is null or p.destination_id = p_destination_id)
    and (p_min_rating is null or p.rating_avg >= p_min_rating)
    and (
      q.raw is null
      or p.search_vector @@ q.tsq
      or p.name ilike '%' || q.raw || '%'
      or p.city ilike '%' || q.raw || '%'
    )
  order by
    case when p_sort = 'rating' then p.rating_avg end desc nulls last,
    case when p_sort = 'name' then p.name end asc,
    case when p_sort = 'newest' then p.published_at end desc nulls last,
    case when q.tsq is not null then ts_rank(p.search_vector, q.tsq) end desc nulls last,
    p.rating_count desc,
    p.name asc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

create or replace function public.search_destinations(
  p_query text,
  p_category_slug text default null,
  p_country_code char(2) default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  name text,
  country_code char(2),
  city text,
  summary text,
  latitude double precision,
  longitude double precision,
  rating_avg numeric,
  rating_count integer,
  hero_image_path text,
  popularity integer
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  with q as (
    select
      nullif(btrim(coalesce(p_query, '')), '') as raw,
      case
        when nullif(btrim(coalesce(p_query, '')), '') is null then null
        else websearch_to_tsquery('simple', btrim(p_query))
      end as tsq
  )
  select
    d.id, d.slug, d.name, d.country_code, d.city, d.summary,
    d.latitude, d.longitude, d.rating_avg, d.rating_count,
    d.hero_image_path, d.popularity
  from public.destinations d
  cross join q
  where d.status = 'published'
    and (p_country_code is null or d.country_code = p_country_code)
    and (
      p_category_slug is null
      or exists (
        select 1
        from public.destination_category_links l
        join public.destination_categories c on c.id = l.category_id
        where l.destination_id = d.id and c.slug = p_category_slug
      )
    )
    and (
      q.raw is null
      or d.search_vector @@ q.tsq
      or d.name ilike '%' || q.raw || '%'
      or d.city ilike '%' || q.raw || '%'
    )
  order by
    case when q.tsq is not null then ts_rank(d.search_vector, q.tsq) end desc nulls last,
    d.featured desc,
    d.popularity desc,
    d.name asc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

-- ---------------------------------------------------------------------------
-- RPC: recently viewed (Home module). Upsert keeps one row per target.
-- ---------------------------------------------------------------------------

create or replace function public.record_place_view(
  p_place_id uuid default null,
  p_destination_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if (p_place_id is null) = (p_destination_id is null) then
    raise exception 'exactly one of p_place_id / p_destination_id is required' using errcode = '22023';
  end if;

  if p_place_id is not null then
    insert into public.recent_views (user_id, place_id)
    values (v_uid, p_place_id)
    on conflict (user_id, place_id) where place_id is not null
    do update set viewed_at = now();
  else
    insert into public.recent_views (user_id, destination_id)
    values (v_uid, p_destination_id)
    on conflict (user_id, destination_id) where destination_id is not null
    do update set viewed_at = now();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: admin dashboard aggregates (authorized server-side, always)
-- ---------------------------------------------------------------------------

create or replace function public.dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'administrator role required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'destinations', jsonb_build_object(
      'published', (select count(*) from public.destinations where status = 'published'),
      'draft', (select count(*) from public.destinations where status <> 'published')
    ),
    'places', jsonb_build_object(
      'published', (select count(*) from public.places where status = 'published'),
      'draft', (select count(*) from public.places where status <> 'published'),
      'by_kind', coalesce((
        select jsonb_object_agg(kind, total)
        from (
          select kind::text as kind, count(*) as total
          from public.places
          group by kind
        ) s
      ), '{}'::jsonb)
    ),
    'reviews', jsonb_build_object(
      'total', (select count(*) from public.reviews),
      'last_7d', (select count(*) from public.reviews where created_at > now() - interval '7 days'),
      'average_rating', coalesce((select round(avg(rating)::numeric, 2) from public.reviews where status = 'published'), 0)
    ),
    'moderation', jsonb_build_object(
      'open_reports', (select count(*) from public.content_reports where status = 'open'),
      'hidden_reviews', (select count(*) from public.reviews where status <> 'published')
    ),
    'saves_total', (select count(*) from public.saved_places),
    'generated_at', now()
  ) into result;

  return result;
end;
$$;

revoke all on function public.dashboard_stats() from public;
grant execute on function public.dashboard_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: role administration with an immutable audit trail
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_role(p_user_id uuid, p_role public.app_role, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if not public.is_super_admin() then
    raise exception 'super administrator role required' using errcode = '42501';
  end if;

  if p_role = 'user' then
    raise exception 'the base user role cannot be granted or revoked' using errcode = '22023';
  end if;

  if p_enabled then
    insert into public.user_roles (user_id, role, granted_by)
    values (p_user_id, p_role, v_actor)
    on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles where user_id = p_user_id and role = p_role;
  end if;

  insert into public.activity_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    case when p_enabled then 'role.grant' else 'role.revoke' end,
    'profile',
    p_user_id,
    jsonb_build_object('role', p_role)
  );
end;
$$;

revoke all on function public.admin_set_role(uuid, public.app_role, boolean) from public;
grant execute on function public.admin_set_role(uuid, public.app_role, boolean) to authenticated;

create or replace function public.admin_moderate_review(
  p_review_id uuid,
  p_status public.review_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if not public.can_moderate() then
    raise exception 'moderator role required' using errcode = '42501';
  end if;

  update public.reviews
  set status = p_status,
      moderation_note = left(p_note, 500),
      moderated_by = v_actor,
      moderated_at = now()
  where id = p_review_id;

  if not found then
    raise exception 'review not found' using errcode = 'P0002';
  end if;

  insert into public.activity_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    'review.moderate',
    'review',
    p_review_id,
    jsonb_build_object('status', p_status, 'note', p_note)
  );
end;
$$;

revoke all on function public.admin_moderate_review(uuid, public.review_status, text) from public;
grant execute on function public.admin_moderate_review(uuid, public.review_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public media, private-by-owner avatars
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "media_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'media');

create policy "media_staff_write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.can_manage_content());

create policy "media_staff_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.can_manage_content())
  with check (bucket_id = 'media' and public.can_manage_content());

create policy "media_staff_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.can_manage_content());

create policy "avatars_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

-- Avatar objects live under <user_id>/<filename>; the folder is the owner.
create policy "avatars_owner_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_owner_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
