-- Admin confirmations must match both the displayed balance and the number
-- of ledger entries observed for that student. The count detects ABA changes.

create or replace function public.admin_deduct_student_coins_v2(
  p_student_code text,
  p_amount integer,
  p_request_id uuid,
  p_expected_balance integer,
  p_expected_wallet_version bigint
)
returns public.wallet_transaction_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_student public.students%rowtype;
  v_existing public.coin_ledger%rowtype;
  v_student_code text := trim(coalesce(p_student_code, ''));
  v_wallet_version bigint;
  v_balance_after integer;
  v_ledger_id uuid;
begin
  if v_actor_id is null or not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_request_id is null then
    raise exception 'INVALID_REQUEST_ID';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select * into v_student
  from public.students
  where student_id = v_student_code
  for update;
  if not found then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  select * into v_existing
  from public.coin_ledger
  where request_id = p_request_id;
  if found then
    if v_existing.transaction_type <> 'admin_deduction'
      or v_existing.student_id <> v_student.id
      or v_existing.delta <> -p_amount
      or v_existing.balance_before <> p_expected_balance
      or v_existing.actor_user_id is distinct from v_actor_id
      or v_existing.source_id is distinct from v_student_code
      or v_existing.metadata ->> 'expected_wallet_version' is distinct from p_expected_wallet_version::text then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return (v_existing.balance_after, v_existing.id, true);
  end if;

  select count(*) into v_wallet_version
  from public.coin_ledger
  where student_id = v_student.id;

  if p_expected_balance is null
    or p_expected_wallet_version is null
    or v_student.coins <> p_expected_balance
    or v_wallet_version <> p_expected_wallet_version then
    raise exception 'BALANCE_CHANGED';
  end if;
  v_balance_after := v_student.coins - p_amount;
  if v_balance_after < 0 then
    raise exception 'INSUFFICIENT_COINS';
  end if;

  update public.students set coins = v_balance_after where id = v_student.id;
  insert into public.coin_ledger (
    request_id, student_id, transaction_type, delta, balance_before,
    balance_after, actor_user_id, source_id, metadata
  ) values (
    p_request_id, v_student.id, 'admin_deduction', -p_amount, v_student.coins,
    v_balance_after, v_actor_id, v_student_code,
    jsonb_build_object(
      'student_code', v_student_code,
      'expected_balance', p_expected_balance,
      'expected_wallet_version', p_expected_wallet_version
    )
  ) returning id into v_ledger_id;

  return (v_balance_after, v_ledger_id, false);
end;
$$;

-- The legacy signature cannot prove which ledger version was confirmed.
revoke all on function public.admin_deduct_student_coins(text, integer, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.admin_deduct_student_coins_v2(text, integer, uuid, integer, bigint)
  from public, anon, authenticated;
grant execute on function public.admin_deduct_student_coins_v2(text, integer, uuid, integer, bigint)
  to authenticated;

comment on function public.admin_deduct_student_coins_v2(text, integer, uuid, integer, bigint) is
  'Admin-only idempotent deduction requiring the displayed balance and per-student ledger count.';
