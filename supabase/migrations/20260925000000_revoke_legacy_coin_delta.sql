-- The legacy delta RPC must remain present only for transition diagnostics.
-- No API role may execute it after the authoritative wallet is installed.
revoke all on function public.increment_student_coins(integer)
  from public, anon, authenticated;

comment on function public.increment_student_coins(integer) is
  'Legacy delta RPC retained only for migration diagnostics; API execution is revoked.';
