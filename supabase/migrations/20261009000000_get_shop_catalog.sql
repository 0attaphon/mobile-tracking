-- Clients cannot read shop_catalog_* directly (select is revoked), so the app
-- used to display hard-coded prices that drifted from what purchase_shop_item
-- charges. This read-only RPC exposes the active catalog so the app can show
-- server prices and submit the active catalog version.

create or replace function public.get_shop_catalog()
returns table (version integer, item_id text, price integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  return query
  select item.version, item.item_id, item.price
  from public.shop_catalog_items item
  join public.shop_catalog_versions catalog on catalog.version = item.version
  where catalog.active
    and item.active;
end;
$$;

revoke all on function public.get_shop_catalog() from public, anon, authenticated;
grant execute on function public.get_shop_catalog() to authenticated;
