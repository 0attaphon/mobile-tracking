-- public.students had select_own/insert_own policies but no update policy,
-- so nickname/class_name writes from the app (supabase.from('students').update(...))
-- were silently blocked by RLS (0 rows affected, no thrown error).

create policy students_update_own on public.students
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
