-- students_update_own (20260831000000) only allowed id = auth.uid(), so admin
-- writes to class_name (admin-web ClassNameEditor -> updateClassName action)
-- were silently blocked by RLS (0 rows affected, no thrown error) since the
-- admin's auth.uid() never matches the student row's id. Every other policy
-- on this table already follows the "own row or is_admin()" pattern
-- (students_select_own, focus_sessions_select, daily_usage_select,
-- chore_completions_select) — this update policy was missing that OR clause.

drop policy if exists students_update_own on public.students;

create policy students_update_own on public.students
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
