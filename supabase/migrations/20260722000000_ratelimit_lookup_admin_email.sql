-- Rate-limit public.lookup_admin_email to stop anon username enumeration
-- (unlimited anon calls previously let anyone brute-force usernames and get
-- back a boolean existence signal via the returned email).

create table if not exists public.admin_email_lookup_attempts (
  username text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists admin_email_lookup_attempts_idx
  on public.admin_email_lookup_attempts (username, attempted_at);

create or replace function public.lookup_admin_email(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_username text := trim(lower(p_username));
  v_recent_attempts int;
begin
  select count(*) into v_recent_attempts
  from public.admin_email_lookup_attempts
  where username = v_username
    and attempted_at > now() - interval '15 minutes';

  if v_recent_attempts >= 5 then
    return null;
  end if;

  insert into public.admin_email_lookup_attempts (username) values (v_username);

  delete from public.admin_email_lookup_attempts
  where attempted_at < now() - interval '1 day';

  select email into v_email
  from public.admin_users
  where username = v_username
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.lookup_admin_email(text) from public;
grant execute on function public.lookup_admin_email(text) to anon, authenticated;
