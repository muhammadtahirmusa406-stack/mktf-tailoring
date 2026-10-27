alter table public.design_price_groups
  add column if not exists cover_design_item_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'design_price_groups_cover_design_item_id_fkey'
      and conrelid = 'public.design_price_groups'::regclass
  ) then
    alter table public.design_price_groups
      add constraint design_price_groups_cover_design_item_id_fkey
      foreign key (cover_design_item_id)
      references public.design_items(id)
      on delete set null;
  end if;
end;
$$;
