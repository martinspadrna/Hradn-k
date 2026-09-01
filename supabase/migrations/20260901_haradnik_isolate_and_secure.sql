-- Hradník only. Do not modify RaK tables from this migration.
create unique index if not exists hradnik_places_source_external_uq
  on public.hradnik_places (source_key, external_id);
create index if not exists hradnik_places_catalog_order_idx
  on public.hradnik_places (is_visible, is_current, name);

alter table public.hradnik_places enable row level security;
alter table public.hradnik_sources enable row level security;
alter table public.hradnik_place_sources enable row level security;
alter table public.hradnik_place_state enable row level security;

drop policy if exists hradnik_places_public_read on public.hradnik_places;
create policy hradnik_places_public_read on public.hradnik_places
for select to anon, authenticated
using (is_visible = true and is_current = true);

drop policy if exists hradnik_sources_public_read on public.hradnik_sources;
create policy hradnik_sources_public_read on public.hradnik_sources
for select to anon, authenticated using (enabled = true);

drop policy if exists hradnik_place_sources_public_read on public.hradnik_place_sources;
create policy hradnik_place_sources_public_read on public.hradnik_place_sources
for select to anon, authenticated using (true);

drop policy if exists hradnik_place_state_select on public.hradnik_place_state;
create policy hradnik_place_state_select on public.hradnik_place_state
for select to authenticated using (exists (
  select 1 from public.household_members hm
  where hm.household_id = hradnik_place_state.household_id
    and hm.user_id = (select auth.uid()) and hm.status = 'active'
));

drop policy if exists hradnik_place_state_write on public.hradnik_place_state;
create policy hradnik_place_state_write on public.hradnik_place_state
for all to authenticated using (exists (
  select 1 from public.household_members hm
  where hm.household_id = hradnik_place_state.household_id
    and hm.user_id = (select auth.uid()) and hm.status = 'active'
)) with check (exists (
  select 1 from public.household_members hm
  where hm.household_id = hradnik_place_state.household_id
    and hm.user_id = (select auth.uid()) and hm.status = 'active'
));

revoke all on public.hradnik_sync_runs from anon, authenticated;
revoke all on public.hradnik_sync_control from anon, authenticated;
