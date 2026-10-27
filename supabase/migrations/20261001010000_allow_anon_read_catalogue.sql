-- Allow anon/guest users to view active catalogue and configuration rows
drop policy if exists "Authenticated users can view active sewing styles" on public.sewing_styles;
drop policy if exists "Anyone can view active sewing styles" on public.sewing_styles;
create policy "Anyone can view active sewing styles"
  on public.sewing_styles
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Authenticated users can view active design price groups" on public.design_price_groups;
drop policy if exists "Anyone can view active design price groups" on public.design_price_groups;
create policy "Anyone can view active design price groups"
  on public.design_price_groups
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Authenticated users can view active design items" on public.design_items;
drop policy if exists "Anyone can view active design items" on public.design_items;
create policy "Anyone can view active design items"
  on public.design_items
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Authenticated users can view active measurement definitions" on public.measurement_definitions;
drop policy if exists "Anyone can view active measurement definitions" on public.measurement_definitions;
create policy "Anyone can view active measurement definitions"
  on public.measurement_definitions
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Authenticated users can view active sewing style measurements" on public.sewing_style_measurements;
drop policy if exists "Anyone can view active sewing style measurements" on public.sewing_style_measurements;
create policy "Anyone can view active sewing style measurements"
  on public.sewing_style_measurements
  for select
  to anon, authenticated
  using (is_active = true);
