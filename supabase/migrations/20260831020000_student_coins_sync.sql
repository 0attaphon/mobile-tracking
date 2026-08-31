-- Persist student coin balance server-side so a reinstall doesn't reset coins
-- to 0 locally (petStore.coins only lived in AsyncStorage before this).

alter table public.students
  add column coins integer not null default 0;

alter table public.students
  add constraint students_coins_non_negative check (coins >= 0);

-- Reinstall restore (register_student_device_restore.sql) must carry the coin
-- balance over to the new auth uid row, same as it already does for
-- focus_sessions/daily_usage/chore_completions via student_id rewrite.
create or replace function public.register_student(
  p_student_id text,
  p_device_id text
)
returns public.students
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.students;
  v_existing public.students;
  v_normalized text;
  v_device text;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  v_normalized := trim(p_student_id);
  if v_normalized = '' then
    raise exception 'INVALID_STUDENT_ID';
  end if;

  v_device := trim(p_device_id);
  if v_device = '' then
    raise exception 'INVALID_DEVICE_ID';
  end if;

  -- Same student + same device (e.g. reinstall): re-link to current auth session
  select * into v_existing
  from public.students
  where student_id = v_normalized
    and device_id = v_device;

  if found then
    if v_existing.id = v_uid then
      return v_existing;
    end if;

    -- Free unique constraints on student_id / device_id before inserting new row
    update public.students
    set
      student_id = v_normalized || ':restore:' || v_existing.id::text,
      device_id = v_device || ':restore:' || v_existing.id::text
    where id = v_existing.id;

    -- New students row must exist before child FK updates (focus_sessions, etc.)
    insert into public.students (id, student_id, device_id, coins)
    values (v_uid, v_normalized, v_device, v_existing.coins)
    returning * into v_row;

    update public.focus_sessions set student_id = v_uid where student_id = v_existing.id;
    update public.daily_usage set student_id = v_uid where student_id = v_existing.id;
    update public.chore_completions set student_id = v_uid where student_id = v_existing.id;

    delete from public.students where id = v_existing.id;

    return v_row;
  end if;

  if exists (select 1 from public.students where student_id = v_normalized) then
    raise exception 'STUDENT_ALREADY_REGISTERED';
  end if;

  if exists (select 1 from public.students where device_id = v_device) then
    raise exception 'DEVICE_ALREADY_REGISTERED';
  end if;

  if exists (select 1 from public.students where id = v_uid) then
    raise exception 'ALREADY_REGISTERED';
  end if;

  insert into public.students (id, student_id, device_id)
  values (v_uid, v_normalized, v_device)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.register_student(text, text) from public;
grant execute on function public.register_student(text, text) to authenticated;

-- Atomic coin balance update — the app pushes deltas (earn/spend), never an
-- absolute value, so two quick concurrent changes (e.g. finish a session then
-- buy a shop item) can't clobber each other over the network.
create or replace function public.increment_student_coins(p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new_coins integer;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  update public.students
  set coins = greatest(0, coins + p_delta)
  where id = v_uid
  returning coins into v_new_coins;

  if v_new_coins is null then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  return v_new_coins;
end;
$$;

revoke all on function public.increment_student_coins(integer) from public;
grant execute on function public.increment_student_coins(integer) to authenticated;
