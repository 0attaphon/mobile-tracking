-- Keep focus streak rewards authoritative and idempotent on the server.
-- A student row lock in claim_student_reward serializes the wallet and streak
-- updates, while this row stores the state needed by catch-up/freeze rules.

create table public.student_focus_reward_state (
  student_id uuid primary key references public.students (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= current_streak),
  last_focus_date date,
  freeze_tokens integer not null default 0 check (freeze_tokens between 0 and 3),
  updated_at timestamptz not null default now()
);

alter table public.student_focus_reward_state enable row level security;
revoke all on table public.student_focus_reward_state from public, anon, authenticated;

-- Reconstruct any streak state already represented by authoritative focus
-- ledger rows. Device-only legacy state is intentionally not guessed.
do $$
declare
  v_student record;
  v_day record;
  v_current integer;
  v_longest integer;
  v_freeze integer;
  v_last date;
begin
  for v_student in
    select distinct student_id
    from public.coin_ledger
    where transaction_type = 'focus_reward' and source_date is not null
  loop
    v_current := 0;
    v_longest := 0;
    v_freeze := 0;
    v_last := null;

    for v_day in
      select distinct source_date
      from public.coin_ledger
      where student_id = v_student.student_id
        and transaction_type = 'focus_reward'
        and source_date is not null
      order by source_date
    loop
      if v_last is null then
        v_current := 1;
      elsif v_day.source_date = v_last + 1 then
        v_current := v_current + 1;
      elsif v_current >= 3 and v_freeze > 0 then
        v_freeze := v_freeze - 1;
        v_current := v_current + 1;
      else
        v_current := 1;
      end if;

      if v_current % 7 = 0 then
        v_freeze := least(3, v_freeze + 1);
      end if;
      v_longest := greatest(v_longest, v_current);
      v_last := v_day.source_date;
    end loop;

    insert into public.student_focus_reward_state (
      student_id, current_streak, longest_streak, last_focus_date, freeze_tokens
    ) values (
      v_student.student_id, v_current, v_longest, v_last, v_freeze
    );
  end loop;
end;
$$;

create or replace function public.claim_student_reward(
  p_request_id uuid,
  p_reward_type text,
  p_source_id text,
  p_source_date date
)
returns public.wallet_transaction_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_student public.students%rowtype;
  v_existing public.coin_ledger%rowtype;
  v_focus public.focus_sessions%rowtype;
  v_chore public.chore_completions%rowtype;
  v_outdoor public.outdoor_completions%rowtype;
  v_state public.student_focus_reward_state%rowtype;
  v_transaction_type text;
  v_source_id uuid;
  v_source_date date;
  v_source_ledger_id uuid;
  v_ledger_source_id text;
  v_base_delta integer;
  v_delta integer;
  v_balance_after integer;
  v_ledger_id uuid;
  v_streak_bonus integer := 0;
  v_catch_up_applied boolean := false;
  v_freeze_used boolean := false;
  v_streak_advanced boolean := false;
begin
  if v_student_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_request_id is null then
    raise exception 'INVALID_REQUEST_ID';
  end if;
  if p_source_id is null
    or trim(p_source_id) = ''
    or trim(p_source_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'INVALID_REWARD_SOURCE';
  end if;
  v_source_id := trim(p_source_id)::uuid;

  v_transaction_type := case p_reward_type
    when 'focus' then 'focus_reward'
    when 'chore' then 'chore_reward'
    when 'outdoor' then 'outdoor_reward'
    else null
  end;
  if v_transaction_type is null then
    raise exception 'INVALID_REWARD_TYPE';
  end if;

  select * into v_student from public.students where id = v_student_id for update;
  if not found then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  -- p_source_date is retained for wire compatibility. The locked source row
  -- remains authoritative for date, ownership, completion, and base reward.
  if p_reward_type = 'focus' then
    select * into v_focus
    from public.focus_sessions
    where id = v_source_id
      and student_id = v_student_id
      and status = 'completed'
    for update;
    if not found then
      raise exception 'REWARD_SOURCE_NOT_FOUND';
    end if;
    v_base_delta := public.reward_coins_for_source('focus', 'focus:' || v_focus.duration_minutes::text);
    v_source_date := (v_focus.ended_at at time zone 'Asia/Bangkok')::date;
    v_source_ledger_id := v_focus.wallet_ledger_id;
    v_ledger_source_id := v_source_id::text;
  elsif p_reward_type = 'chore' then
    select * into v_chore
    from public.chore_completions
    where id = v_source_id
      and student_id = v_student_id
    for update;
    if not found then
      raise exception 'REWARD_SOURCE_NOT_FOUND';
    end if;
    v_base_delta := public.reward_coins_for_source('chore', v_chore.quest_id);
    v_source_date := v_chore.date;
    v_source_ledger_id := v_chore.wallet_ledger_id;
    v_ledger_source_id := v_chore.quest_id;
  else
    select * into v_outdoor
    from public.outdoor_completions
    where id = v_source_id
      and student_id = v_student_id
    for update;
    if not found then
      raise exception 'REWARD_SOURCE_NOT_FOUND';
    end if;
    v_base_delta := public.reward_coins_for_source('outdoor', v_outdoor.quest_id);
    v_source_date := v_outdoor.date;
    v_source_ledger_id := v_outdoor.wallet_ledger_id;
    v_ledger_source_id := v_outdoor.quest_id;
  end if;
  if v_base_delta is null then
    raise exception 'INVALID_REWARD_SOURCE';
  end if;

  select * into v_existing from public.coin_ledger where request_id = p_request_id;
  if found then
    if v_existing.transaction_type <> v_transaction_type
      or v_existing.student_id <> v_student_id
      or v_existing.source_id is distinct from v_ledger_source_id
      or v_existing.source_date is distinct from v_source_date
      or v_existing.actor_user_id is not null
      or (
        p_reward_type = 'focus'
        and coalesce((v_existing.metadata ->> 'base_coins')::integer, v_existing.delta) <> v_base_delta
      )
      or (p_reward_type <> 'focus' and v_existing.delta <> v_base_delta) then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return (v_existing.balance_after, v_existing.id, true);
  end if;

  if v_source_ledger_id is not null then
    raise exception 'REWARD_ALREADY_CLAIMED';
  end if;

  v_delta := v_base_delta;
  if p_reward_type = 'focus' then
    insert into public.student_focus_reward_state (student_id)
    values (v_student_id)
    on conflict (student_id) do nothing;

    select * into v_state
    from public.student_focus_reward_state
    where student_id = v_student_id
    for update;

    if v_state.last_focus_date is null then
      v_state.current_streak := 1;
      v_streak_advanced := true;
    elsif v_source_date = v_state.last_focus_date then
      v_streak_advanced := false;
    elsif v_source_date = v_state.last_focus_date + 1 then
      v_state.current_streak := v_state.current_streak + 1;
      v_streak_advanced := true;
    elsif v_source_date > v_state.last_focus_date + 1 then
      if v_state.current_streak >= 3 and v_state.freeze_tokens > 0 then
        v_state.freeze_tokens := v_state.freeze_tokens - 1;
        v_state.current_streak := v_state.current_streak + 1;
        v_freeze_used := true;
      else
        v_catch_up_applied := v_state.current_streak >= 3;
        v_state.current_streak := 1;
      end if;
      v_streak_advanced := true;
    end if;

    if v_streak_advanced then
      v_streak_bonus := case v_state.current_streak
        when 1 then 10
        when 3 then 30
        when 7 then 100
        when 14 then 200
        when 30 then 500
        else 0
      end;
      if v_state.current_streak % 7 = 0 then
        v_state.freeze_tokens := least(3, v_state.freeze_tokens + 1);
      end if;
      v_state.longest_streak := greatest(v_state.longest_streak, v_state.current_streak);
      v_state.last_focus_date := v_source_date;
      update public.student_focus_reward_state
      set current_streak = v_state.current_streak,
        longest_streak = v_state.longest_streak,
        last_focus_date = v_state.last_focus_date,
        freeze_tokens = v_state.freeze_tokens,
        updated_at = clock_timestamp()
      where student_id = v_student_id;
    end if;

    v_delta := v_base_delta * case when v_catch_up_applied then 2 else 1 end
      + v_streak_bonus;
  end if;

  v_balance_after := v_student.coins + v_delta;
  update public.students set coins = v_balance_after where id = v_student_id;
  insert into public.coin_ledger (
    request_id, student_id, transaction_type, delta, balance_before,
    balance_after, source_id, source_date, metadata
  ) values (
    p_request_id, v_student_id, v_transaction_type, v_delta, v_student.coins,
    v_balance_after, v_ledger_source_id, v_source_date,
    jsonb_build_object(
      'reward_type', p_reward_type,
      'source_id', v_ledger_source_id,
      'source_record_id', v_source_id,
      'base_coins', v_base_delta,
      'streak_bonus', v_streak_bonus,
      'catch_up_applied', v_catch_up_applied,
      'freeze_used', v_freeze_used,
      'streak_advanced', v_streak_advanced
    )
  ) returning id into v_ledger_id;

  if p_reward_type = 'focus' then
    update public.focus_sessions
    set wallet_ledger_id = v_ledger_id, coins_earned = v_delta
    where id = v_source_id;
  elsif p_reward_type = 'chore' then
    update public.chore_completions set wallet_ledger_id = v_ledger_id where id = v_source_id;
  else
    update public.outdoor_completions set wallet_ledger_id = v_ledger_id where id = v_source_id;
  end if;

  return (v_balance_after, v_ledger_id, false);
end;
$$;

revoke all on function public.claim_student_reward(uuid, text, text, date)
  from public, anon, authenticated;
