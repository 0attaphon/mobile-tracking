-- Per-classroom weekly focus leaderboard.
-- class_name groups students into a room (set by admin/teacher).
-- nickname is a student-chosen display name shown to classmates instead of
-- their real student_id (PDPA: never expose a classmate's real student_id).

alter table public.students add column if not exists class_name text;
alter table public.students add column if not exists nickname text;

-- Returns the caller's classmates ranked by total completed focus minutes
-- for the current week (Mon-Sun, matches Postgres date_trunc('week', ...)).
-- Only the caller's own row ever carries their real student_id; every other
-- row has student_id nulled out and falls back to a display nickname.
create or replace function public.get_class_leaderboard()
returns table (
  student_id text,
  nickname text,
  focus_minutes integer,
  rnk bigint,
  is_me boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_class_name text;
  v_week_start timestamptz;
  v_week_end timestamptz;
begin
  select s.class_name into v_class_name
  from public.students s
  where s.id = v_uid;

  -- Not signed in, or not yet assigned to a room: no leaderboard to show.
  if v_class_name is null then
    return;
  end if;

  v_week_start := date_trunc('week', now());
  v_week_end := v_week_start + interval '7 days';

  return query
    select
      case when s.id = v_uid then s.student_id else null end as student_id,
      coalesce(s.nickname, 'เพื่อนร่วมห้อง') as nickname,
      coalesce(sum(fs.duration_minutes), 0)::integer as focus_minutes,
      rank() over (
        order by coalesce(sum(fs.duration_minutes), 0) desc
      ) as rnk,
      (s.id = v_uid) as is_me
    from public.students s
    left join public.focus_sessions fs
      on fs.student_id = s.id
      and fs.status = 'completed'
      and fs.ended_at >= v_week_start
      and fs.ended_at < v_week_end
    where s.class_name = v_class_name
    group by s.id
    order by rnk asc;
end;
$$;

revoke all on function public.get_class_leaderboard() from public;
grant execute on function public.get_class_leaderboard() to authenticated;
