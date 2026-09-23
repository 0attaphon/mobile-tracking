-- Authoritative, append-only wallet ledger. Every confirmed coin change passes
-- through the RPCs below so a balance, audit entry, and inventory update agree.

create type public.wallet_transaction_result as (
  balance integer,
  ledger_id uuid,
  replayed boolean
);

create table public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  student_id uuid not null references public.students (id) on delete cascade,
  transaction_type text not null check (transaction_type in (
    'focus_reward',
    'chore_reward',
    'outdoor_reward',
    'shop_purchase',
    'admin_deduction',
    'legacy_import'
  )),
  delta integer not null,
  balance_before integer not null,
  balance_after integer not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  source_id text,
  source_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint coin_ledger_balance_non_negative check (balance_after >= 0),
  constraint coin_ledger_balance_math check (balance_after = balance_before + delta)
);

create index coin_ledger_student_created_at_idx
  on public.coin_ledger (student_id, created_at desc);

-- A reward source may only be claimed once for a student on a source date,
-- regardless of which request UUID reaches the server first.
create unique index coin_ledger_reward_source_once_idx
  on public.coin_ledger (student_id, transaction_type, source_id, source_date)
  where transaction_type in ('focus_reward', 'chore_reward', 'outdoor_reward');

create table public.student_inventory (
  student_id uuid not null references public.students (id) on delete cascade,
  item_id text not null,
  acquired_at timestamptz not null default now(),
  source_ledger_id uuid not null references public.coin_ledger (id) on delete restrict,
  primary key (student_id, item_id)
);

create index student_inventory_source_ledger_idx
  on public.student_inventory (source_ledger_id);

-- Completed activities are the server-side evidence consumed by a reward
-- claim. The claim RPC locks the row and records its ledger ID so a client
-- cannot invent a source ID or claim the same completion through a new UUID.
alter table public.focus_sessions
  add column wallet_ledger_id uuid references public.coin_ledger (id) on delete restrict;

-- A running session has no completion timestamp. Existing completed rows retain theirs.
alter table public.focus_sessions
  alter column ended_at drop not null,
  alter column ended_at drop default;

alter table public.focus_sessions
  drop constraint focus_sessions_status_check,
  add constraint focus_sessions_status_check
    check (status in ('in_progress', 'completed', 'failed', 'cancelled'));

alter table public.chore_completions
  add column wallet_ledger_id uuid references public.coin_ledger (id) on delete restrict;

create table public.outdoor_completions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  quest_id text not null,
  date date not null,
  completed_at timestamptz not null default now(),
  wallet_ledger_id uuid references public.coin_ledger (id) on delete restrict
);

create index outdoor_completions_student_date_idx
  on public.outdoor_completions (student_id, date);

create type public.reward_challenge_result as (
  nonce uuid,
  expires_at timestamptz,
  replayed boolean
);

-- Canonical daily selections are server-owned. Mobile must load these before
-- showing/verifying quests; client-supplied lists cannot choose reward sources.
create table public.daily_quest_assignments (
  student_id uuid not null references public.students (id) on delete cascade,
  reward_type text not null check (reward_type in ('chore', 'outdoor')),
  quest_id text not null,
  source_date date not null,
  position integer not null check (position between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (student_id, reward_type, quest_id, source_date),
  unique (student_id, reward_type, source_date, position),
  check (reward_type <> 'outdoor' or position <= 4)
);

-- The app records this only after its local camera/image verifier succeeds.
-- The server cannot validate images because they are deliberately never
-- uploaded, but it can make the verified attempt single-use and date-bound.
create table public.client_verification_attempts (
  id uuid primary key,
  student_id uuid not null references public.students (id) on delete cascade,
  reward_type text not null check (reward_type in ('chore', 'outdoor')),
  quest_id text not null,
  source_date date not null,
  recorded_at timestamptz not null default now(),
  unique (student_id, reward_type, quest_id, source_date),
  foreign key (student_id, reward_type, quest_id, source_date)
    references public.daily_quest_assignments (student_id, reward_type, quest_id, source_date)
    on update cascade on delete restrict
);

-- A challenge is issued immediately before a locally verified activity is
-- recorded. Its nonce is opaque to source-writing RPCs and expires quickly.
create table public.reward_challenges (
  nonce uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  reward_type text not null check (reward_type in ('focus', 'chore', 'outdoor')),
  source_id text not null,
  source_date date not null,
  expected_duration integer,
  verification_attempt_id uuid references public.client_verification_attempts (id) on delete restrict,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  ledger_id uuid unique references public.coin_ledger (id) on delete restrict,
  constraint reward_challenges_focus_duration check (
    (reward_type = 'focus' and expected_duration is not null)
    or (reward_type <> 'focus' and expected_duration is null)
  ),
  constraint reward_challenges_verification_binding check (
    (reward_type = 'focus' and verification_attempt_id is null)
    or (reward_type <> 'focus' and verification_attempt_id is not null)
  )
);

create index reward_challenges_student_active_idx
  on public.reward_challenges (student_id, expires_at)
  where consumed_at is null;

create table public.shop_catalog_versions (
  version integer primary key,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index shop_catalog_versions_one_active_idx
  on public.shop_catalog_versions ((active)) where active;

create table public.shop_catalog_items (
  version integer not null references public.shop_catalog_versions (version) on delete cascade,
  item_id text not null,
  price integer not null check (price > 0),
  active boolean not null default true,
  primary key (version, item_id)
);

insert into public.shop_catalog_versions (version, active) values (1, true);

insert into public.shop_catalog_items (version, item_id, price) values
  (1, 'hat_school', 60),
  (1, 'glasses_sun', 90),
  (1, 'hat_straw', 60),
  (1, 'hat_tophat', 150),
  (1, 'hat_beret_brown', 70),
  (1, 'hat_bucket', 65),
  (1, 'hat_beanie_purple', 80),
  (1, 'hat_beret_apple', 135),
  (1, 'hat_flower_crown', 155),
  (1, 'hat_cap_bow', 85),
  (1, 'hat_cat_ears', 145),
  (1, 'hat_cap_fish', 80),
  (1, 'hat_beret_blue', 75),
  (1, 'hat_crown_gold', 455),
  (1, 'hat_bear_hood', 135),
  (1, 'outfit_raincoat', 170),
  (1, 'outfit_tuxedo', 425),
  (1, 'outfit_coat', 155),
  (1, 'glasses_round', 85),
  (1, 'outfit_uniform', 145),
  (1, 'outfit_imperial_cloak', 470),
  (1, 'outfit_cosmic_cape', 435),
  (1, 'outfit_royal_robe', 515),
  (1, 'outfit_astronaut', 180),
  (1, 'outfit_dino', 155),
  (1, 'hat_ninja', 145),
  (1, 'hat_halo', 395),
  (1, 'hat_pirate', 155),
  (1, 'outfit_doctor', 170),
  (1, 'outfit_angel', 455),
  (1, 'outfit_ninja', 180),
  (1, 'outfit_samurai', 435),
  (1, 'outfit_maid', 155),
  (1, 'outfit_naval_captain', 425),
  (1, 'outfit_pirate', 170),
  (1, 'outfit_princess_pink', 410),
  (1, 'outfit_princess_gold', 425),
  (1, 'outfit_princess_blue', 410),
  (1, 'bg_sky', 30),
  (1, 'bg_pink', 30),
  (1, 'bg_mint', 30),
  (1, 'bg_lavender', 30),
  (1, 'bg_peach', 35),
  (1, 'bg_ocean', 120),
  (1, 'bg_sunset', 120),
  (1, 'bg_galaxy', 335),
  (1, 'bg_rainbow', 365),
  (1, 'bg_cotton_candy', 55),
  (1, 'bg_mango', 55),
  (1, 'bg_watermelon', 55),
  (1, 'bg_lemonade', 55),
  (1, 'bg_mint_choco', 55),
  (1, 'bg_morning_sky', 55),
  (1, 'bg_flamingo', 55),
  (1, 'bg_ice', 55),
  (1, 'bg_cherry', 55),
  (1, 'bg_bubblegum', 55),
  (1, 'bg_aurora', 110),
  (1, 'bg_grape_soda', 110),
  (1, 'bg_night_mist', 135),
  (1, 'bg_forest', 110),
  (1, 'bg_volcano', 135),
  (1, 'bg_desert', 120),
  (1, 'bg_twilight', 110),
  (1, 'bg_deep_space', 300),
  (1, 'bg_cyber', 290),
  (1, 'bg_emerald', 270),
  (1, 'pet_dog', 70),
  (1, 'pet_orange_cat', 90);

create or replace function public.reward_coins_for_source(
  p_reward_type text,
  p_source_id text
)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  v_duration integer;
begin
  if p_reward_type = 'focus' then
    -- Focus clients include the duration in the source ID, for example
    -- "focus:60:<session-id>". The legacy concise forms are accepted during
    -- the transition so a request still contains no client-controlled delta.
    v_duration := nullif(
      coalesce(
        substring(p_source_id from '^focus:(30|60|120|180|240)(?::|$)'),
        substring(p_source_id from '^focus_(30|60|120|180|240)(?:_|$)'),
        substring(p_source_id from '^(30|60|120|180|240)$')
      ),
      ''
    )::integer;
    return case v_duration
      when 30 then 15
      when 60 then 40
      when 120 then 100
      when 180 then 160
      when 240 then 240
      else null
    end;
  end if;

  if p_reward_type = 'chore' then
    return case
      when p_source_id in ('chore_sweep', 'chore_dishes', 'chore_desk', 'chore_laundry',
           'chore_water_plants', 'chore_make_bed', 'chore_sort_laundry_basket',
           'chore_clean_shoes', 'chore_vacuum', 'chore_trash',
           'chore_organize_closet', 'chore_clean_fan',
           'chore_organize_bookshelf', 'chore_pack_toys', 'chore_feed_pet') then 25
      when p_source_id in ('chore_fold_towel', 'chore_wipe_mirror',
           'chore_wipe_dining_table', 'chore_wash_bottle', 'chore_pack_bag',
           'chore_put_away_dishes', 'chore_arrange_pillows',
           'chore_wipe_window') then 15
      when p_source_id in ('chore_sweep_leaves', 'chore_clean_bathroom', 'chore_mop_floor') then 40
      else null
    end;
  end if;

  if p_reward_type = 'outdoor' then
    return case
      when p_source_id in ('outdoor_water_plants', 'outdoor_sweep', 'outdoor_collect_leaves',
           'outdoor_stretch', 'outdoor_walk', 'outdoor_balance',
           'outdoor_tidy_corner') then 25
      when p_source_id in ('outdoor_nature', 'outdoor_read', 'outdoor_tree') then 20
      else null
    end;
  end if;

  return null;
end;
$$;

create or replace function public.admin_deduct_student_coins(
  p_student_code text,
  p_amount integer,
  p_request_id uuid,
  p_expected_balance integer
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
      or v_existing.source_id is distinct from v_student_code then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return (v_existing.balance_after, v_existing.id, true);
  end if;

  if p_expected_balance is null or v_student.coins <> p_expected_balance then
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
    jsonb_build_object('student_code', v_student_code, 'expected_balance', p_expected_balance)
  ) returning id into v_ledger_id;

  return (v_balance_after, v_ledger_id, false);
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
  v_transaction_type text;
  v_source_id uuid;
  v_source_date date;
  v_source_ledger_id uuid;
  v_ledger_source_id text;
  v_delta integer;
  v_balance_after integer;
  v_ledger_id uuid;
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

  -- p_source_date is retained for the mobile RPC signature but deliberately
  -- ignored. Date, reward, ownership, and completion state come from the
  -- locked server row below.
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
    v_delta := public.reward_coins_for_source('focus', 'focus:' || v_focus.duration_minutes::text);
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
    v_delta := public.reward_coins_for_source('chore', v_chore.quest_id);
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
    v_delta := public.reward_coins_for_source('outdoor', v_outdoor.quest_id);
    v_source_date := v_outdoor.date;
    v_source_ledger_id := v_outdoor.wallet_ledger_id;
    v_ledger_source_id := v_outdoor.quest_id;
  end if;
  if v_delta is null then
    raise exception 'INVALID_REWARD_SOURCE';
  end if;

  select * into v_existing from public.coin_ledger where request_id = p_request_id;
  if found then
    if v_existing.transaction_type <> v_transaction_type
      or v_existing.student_id <> v_student_id
      or v_existing.delta <> v_delta
      or v_existing.source_id is distinct from v_ledger_source_id
      or v_existing.source_date is distinct from v_source_date
      or v_existing.actor_user_id is not null then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return (v_existing.balance_after, v_existing.id, true);
  end if;

  if v_source_ledger_id is not null then
    raise exception 'REWARD_ALREADY_CLAIMED';
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
      'source_record_id', v_source_id
    )
  ) returning id into v_ledger_id;

  if p_reward_type = 'focus' then
    update public.focus_sessions set wallet_ledger_id = v_ledger_id where id = v_source_id;
  elsif p_reward_type = 'chore' then
    update public.chore_completions set wallet_ledger_id = v_ledger_id where id = v_source_id;
  else
    update public.outdoor_completions set wallet_ledger_id = v_ledger_id where id = v_source_id;
  end if;

  return (v_balance_after, v_ledger_id, false);
end;
$$;

-- Focus time starts on the server. A later challenge is not available until
-- the recorded duration has actually elapsed.
create or replace function public.start_focus_reward_session(
  p_source_id uuid,
  p_duration_minutes integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_existing public.focus_sessions%rowtype;
begin
  if v_student_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_source_id is null or public.reward_coins_for_source('focus', 'focus:' || p_duration_minutes::text) is null then
    raise exception 'INVALID_REWARD_SOURCE';
  end if;

  select * into v_existing from public.focus_sessions where id = p_source_id for update;
  if found then
    if v_existing.student_id <> v_student_id or v_existing.duration_minutes <> p_duration_minutes then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return p_source_id;
  end if;

  insert into public.focus_sessions (id, student_id, duration_minutes, status, coins_earned, started_at)
  values (p_source_id, v_student_id, p_duration_minutes, 'in_progress', 0, clock_timestamp());
  return p_source_id;
end;
$$;

-- Call on each Bangkok day before local camera verification. Repeated calls
-- return the persisted selection, including after same-device account restore.
-- Stable student code (not auth UUID) seeds ordering; clients supply no seed,
-- quest IDs, date, or count. Chores retain the existing 3-5/day count rule.
create or replace function public.ensure_daily_quest_assignments()
returns setof public.daily_quest_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_student_code text;
  v_date date;
  v_type text;
  v_pool text[];
  v_count integer;
begin
  if v_student_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select student_id into v_student_code from public.students where id = v_student_id for update;
  if not found then raise exception 'STUDENT_NOT_FOUND'; end if;
  v_date := (clock_timestamp() at time zone 'Asia/Bangkok')::date;

  foreach v_type in array array['chore', 'outdoor'] loop
    if exists (
      select 1 from public.daily_quest_assignments
      where student_id = v_student_id and reward_type = v_type and source_date = v_date
    ) then
      continue;
    end if;

    if v_type = 'chore' then
      v_pool := array[
        'chore_sweep', 'chore_dishes', 'chore_desk', 'chore_laundry',
        'chore_water_plants', 'chore_make_bed', 'chore_sort_laundry_basket',
        'chore_clean_shoes', 'chore_vacuum', 'chore_trash',
        'chore_organize_closet', 'chore_clean_fan', 'chore_organize_bookshelf',
        'chore_pack_toys', 'chore_feed_pet', 'chore_fold_towel',
        'chore_wipe_mirror', 'chore_wipe_dining_table', 'chore_wash_bottle',
        'chore_pack_bag', 'chore_put_away_dishes', 'chore_arrange_pillows',
        'chore_wipe_window', 'chore_sweep_leaves', 'chore_clean_bathroom', 'chore_mop_floor'
      ];
      v_count := 3 + get_byte(decode(md5(v_student_code || ':' || v_date::text || ':count'), 'hex'), 0) % 3;
    else
      v_pool := array[
        'outdoor_water_plants', 'outdoor_sweep', 'outdoor_collect_leaves',
        'outdoor_stretch', 'outdoor_walk', 'outdoor_balance', 'outdoor_tidy_corner',
        'outdoor_nature', 'outdoor_read', 'outdoor_tree'
      ];
      v_count := 4;
    end if;

    insert into public.daily_quest_assignments (student_id, reward_type, quest_id, source_date, position)
    select v_student_id, v_type, q.quest_id, v_date,
      row_number() over (order by md5(v_student_code || ':' || v_date::text || ':' || q.quest_id), q.quest_id)::integer
    from unnest(v_pool) as q(quest_id)
    order by md5(v_student_code || ':' || v_date::text || ':' || q.quest_id), q.quest_id
    limit v_count;
  end loop;

  return query select a.* from public.daily_quest_assignments a
    where a.student_id = v_student_id and a.source_date = v_date
    order by a.reward_type, a.position;
end;
$$;

create or replace function public.record_local_verification_attempt(
  p_attempt_id uuid,
  p_reward_type text,
  p_quest_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_existing public.client_verification_attempts%rowtype;
  v_quest_id text := trim(coalesce(p_quest_id, ''));
  v_date date;
begin
  if v_student_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_attempt_id is null or p_reward_type not in ('chore', 'outdoor')
    or public.reward_coins_for_source(p_reward_type, v_quest_id) is null then
    raise exception 'INVALID_REWARD_SOURCE';
  end if;

  perform 1 from public.students where id = v_student_id for update;
  if not found then raise exception 'STUDENT_NOT_FOUND'; end if;
  v_date := (clock_timestamp() at time zone 'Asia/Bangkok')::date;

  select * into v_existing from public.client_verification_attempts where id = p_attempt_id for update;
  if found then
    if v_existing.student_id <> v_student_id
      or v_existing.reward_type <> p_reward_type
      or v_existing.quest_id <> v_quest_id then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return p_attempt_id;
  end if;

  -- Lock the selected assignment for this owner and server day. An allowlisted
  -- quest alone is insufficient, and retries above keep their original date.
  perform 1 from public.daily_quest_assignments
  where student_id = v_student_id and reward_type = p_reward_type
    and quest_id = v_quest_id and source_date = v_date
  for update;
  if not found then raise exception 'QUEST_NOT_ASSIGNED'; end if;

  if exists (
    select 1 from public.client_verification_attempts
    where student_id = v_student_id
      and reward_type = p_reward_type
      and quest_id = v_quest_id
      and source_date = v_date
  ) then
    raise exception 'VERIFICATION_ALREADY_RECORDED';
  end if;

  insert into public.client_verification_attempts (id, student_id, reward_type, quest_id, source_date)
  values (p_attempt_id, v_student_id, p_reward_type, v_quest_id, v_date);
  return p_attempt_id;
end;
$$;

create or replace function public.issue_reward_challenge(
  p_reward_type text,
  p_source_id text
)
returns public.reward_challenge_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_student public.students%rowtype;
  v_active public.reward_challenges%rowtype;
  v_challenge public.reward_challenges%rowtype;
  v_focus public.focus_sessions%rowtype;
  v_attempt public.client_verification_attempts%rowtype;
  v_transaction_type text;
  v_source_id text := trim(coalesce(p_source_id, ''));
  v_source_uuid uuid;
  v_source_date date;
  v_expected_duration integer;
  v_verification_attempt_id uuid;
begin
  if v_student_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_reward_type not in ('focus', 'chore', 'outdoor') or v_source_id = '' then
    raise exception 'INVALID_REWARD_SOURCE';
  end if;

  select * into v_student from public.students where id = v_student_id for update;
  if not found then
    raise exception 'STUDENT_NOT_FOUND';
  end if;
  update public.reward_challenges
  set expires_at = clock_timestamp()
  where student_id = v_student_id and consumed_at is null and expires_at <= clock_timestamp();

  v_transaction_type := p_reward_type || '_reward';
  if p_reward_type = 'focus' then
    if v_source_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'INVALID_REWARD_SOURCE';
    end if;
    v_source_uuid := v_source_id::uuid;
    select * into v_focus
    from public.focus_sessions
    where id = v_source_uuid and student_id = v_student_id
    for update;
    if not found or v_focus.started_at is null
      or clock_timestamp() < v_focus.started_at + make_interval(mins => v_focus.duration_minutes) then
      raise exception 'FOCUS_NOT_COMPLETE';
    end if;
    if v_focus.status not in ('in_progress', 'completed') then
      raise exception 'FOCUS_NOT_COMPLETE';
    end if;
    v_source_date := (coalesce(v_focus.ended_at, clock_timestamp()) at time zone 'Asia/Bangkok')::date;
    v_expected_duration := v_focus.duration_minutes;
  else
    if v_source_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'INVALID_REWARD_SOURCE';
    end if;
    select * into v_attempt
    from public.client_verification_attempts
    where id = v_source_id::uuid
      and student_id = v_student_id
      and reward_type = p_reward_type
    for update;
    if not found then
      raise exception 'VERIFICATION_NOT_FOUND';
    end if;
    v_verification_attempt_id := v_attempt.id;
    v_source_id := v_attempt.quest_id;
    v_source_date := v_attempt.source_date;
    if p_reward_type = 'outdoor' and (
      select count(*) from public.coin_ledger
      where student_id = v_student_id
        and transaction_type = 'outdoor_reward'
        and source_date = v_source_date
    ) >= 3 then
      raise exception 'OUTDOOR_DAILY_QUOTA_REACHED';
    end if;
  end if;

  select * into v_active
  from public.reward_challenges
  where student_id = v_student_id and consumed_at is null and expires_at > clock_timestamp()
  order by issued_at desc
  limit 1
  for update;
  if found then
    if v_active.reward_type = p_reward_type
      and v_active.source_id = v_source_id
      and v_active.verification_attempt_id is not distinct from v_verification_attempt_id then
      return (v_active.nonce, v_active.expires_at, true);
    end if;
    raise exception 'CHALLENGE_ACTIVE';
  end if;

  if exists (
    select 1 from public.coin_ledger
    where student_id = v_student_id
      and transaction_type = v_transaction_type
      and source_id = v_source_id
      and source_date = v_source_date
  ) then
    raise exception 'REWARD_ALREADY_CLAIMED';
  end if;

  insert into public.reward_challenges (
    student_id, reward_type, source_id, source_date, expected_duration,
    verification_attempt_id, expires_at
  ) values (
    v_student_id, p_reward_type, v_source_id, v_source_date, v_expected_duration,
    v_verification_attempt_id, clock_timestamp() + interval '10 minutes'
  ) returning * into v_challenge;
  return (v_challenge.nonce, v_challenge.expires_at, false);
end;
$$;

create or replace function public.record_focus_completion(
  p_request_id uuid,
  p_challenge_nonce uuid
)
returns public.wallet_transaction_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_challenge public.reward_challenges%rowtype;
  v_ledger public.coin_ledger%rowtype;
  v_result public.wallet_transaction_result;
begin
  if v_student_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_request_id is null or p_challenge_nonce is null then raise exception 'INVALID_REQUEST_ID'; end if;
  select * into v_challenge from public.reward_challenges
  where nonce = p_challenge_nonce and student_id = v_student_id for update;
  if not found then raise exception 'CHALLENGE_NOT_FOUND'; end if;
  if v_challenge.reward_type <> 'focus' then raise exception 'CHALLENGE_TYPE_MISMATCH'; end if;
  if v_challenge.consumed_at is not null then
    select * into v_ledger from public.coin_ledger where id = v_challenge.ledger_id;
    if v_ledger.request_id = p_request_id then return (v_ledger.balance_after, v_ledger.id, true); end if;
    raise exception 'IDEMPOTENCY_CONFLICT';
  end if;
  if v_challenge.expires_at <= clock_timestamp() then raise exception 'CHALLENGE_EXPIRED'; end if;
  update public.focus_sessions
  set status = 'completed',
    ended_at = case when status = 'in_progress' then clock_timestamp() else ended_at end
  where id = v_challenge.source_id::uuid
    and student_id = v_student_id
    and status in ('in_progress', 'completed');
  if not found then raise exception 'FOCUS_NOT_COMPLETE'; end if;
  v_result := public.claim_student_reward(p_request_id, 'focus', v_challenge.source_id, null);
  update public.reward_challenges set consumed_at = now(), ledger_id = v_result.ledger_id where nonce = p_challenge_nonce;
  return v_result;
end;
$$;

create or replace function public.record_chore_completion(
  p_request_id uuid,
  p_challenge_nonce uuid
)
returns public.wallet_transaction_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_challenge public.reward_challenges%rowtype;
  v_ledger public.coin_ledger%rowtype;
  v_result public.wallet_transaction_result;
begin
  if v_student_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_request_id is null or p_challenge_nonce is null then raise exception 'INVALID_REQUEST_ID'; end if;
  select * into v_challenge from public.reward_challenges
  where nonce = p_challenge_nonce and student_id = v_student_id for update;
  if not found then raise exception 'CHALLENGE_NOT_FOUND'; end if;
  if v_challenge.reward_type <> 'chore' then raise exception 'CHALLENGE_TYPE_MISMATCH'; end if;
  if v_challenge.consumed_at is not null then
    select * into v_ledger from public.coin_ledger where id = v_challenge.ledger_id;
    if v_ledger.request_id = p_request_id then return (v_ledger.balance_after, v_ledger.id, true); end if;
    raise exception 'IDEMPOTENCY_CONFLICT';
  end if;
  if v_challenge.expires_at <= clock_timestamp() then raise exception 'CHALLENGE_EXPIRED'; end if;
  insert into public.chore_completions (id, student_id, quest_id, date, coins_earned, completed_at)
  values (v_challenge.nonce, v_student_id, v_challenge.source_id, v_challenge.source_date, 0, now());
  v_result := public.claim_student_reward(p_request_id, 'chore', v_challenge.nonce::text, null);
  update public.reward_challenges set consumed_at = now(), ledger_id = v_result.ledger_id where nonce = p_challenge_nonce;
  return v_result;
end;
$$;

create or replace function public.record_outdoor_completion(
  p_request_id uuid,
  p_challenge_nonce uuid
)
returns public.wallet_transaction_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_challenge public.reward_challenges%rowtype;
  v_ledger public.coin_ledger%rowtype;
  v_result public.wallet_transaction_result;
begin
  if v_student_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_request_id is null or p_challenge_nonce is null then raise exception 'INVALID_REQUEST_ID'; end if;
  select * into v_challenge from public.reward_challenges
  where nonce = p_challenge_nonce and student_id = v_student_id for update;
  if not found then raise exception 'CHALLENGE_NOT_FOUND'; end if;
  if v_challenge.reward_type <> 'outdoor' then raise exception 'CHALLENGE_TYPE_MISMATCH'; end if;
  if v_challenge.consumed_at is not null then
    select * into v_ledger from public.coin_ledger where id = v_challenge.ledger_id;
    if v_ledger.request_id = p_request_id then return (v_ledger.balance_after, v_ledger.id, true); end if;
    raise exception 'IDEMPOTENCY_CONFLICT';
  end if;
  if v_challenge.expires_at <= clock_timestamp() then raise exception 'CHALLENGE_EXPIRED'; end if;
  insert into public.outdoor_completions (id, student_id, quest_id, date)
  values (v_challenge.nonce, v_student_id, v_challenge.source_id, v_challenge.source_date);
  v_result := public.claim_student_reward(p_request_id, 'outdoor', v_challenge.nonce::text, null);
  update public.reward_challenges set consumed_at = now(), ledger_id = v_result.ledger_id where nonce = p_challenge_nonce;
  return v_result;
end;
$$;

-- Replaces the prior device-restore implementation. Ledger and inventory use
-- student_id foreign keys with delete cascades, so they must move before the
-- replaced student row is deleted.
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

  select * into v_existing
  from public.students
  where student_id = v_normalized
    and device_id = v_device;

  if found then
    if v_existing.id = v_uid then
      return v_existing;
    end if;

    update public.students
    set
      student_id = v_normalized || ':restore:' || v_existing.id::text,
      device_id = v_device || ':restore:' || v_existing.id::text
    where id = v_existing.id;

    insert into public.students (id, student_id, device_id, coins, class_name, nickname)
    values (
      v_uid, v_normalized, v_device, v_existing.coins,
      v_existing.class_name, v_existing.nickname
    )
    returning * into v_row;

    update public.focus_sessions set student_id = v_uid where student_id = v_existing.id;
    update public.daily_usage set student_id = v_uid where student_id = v_existing.id;
    update public.chore_completions set student_id = v_uid where student_id = v_existing.id;
    update public.outdoor_completions set student_id = v_uid where student_id = v_existing.id;
    update public.daily_quest_assignments set student_id = v_uid where student_id = v_existing.id;
    update public.client_verification_attempts set student_id = v_uid where student_id = v_existing.id;
    update public.reward_challenges set student_id = v_uid where student_id = v_existing.id;
    update public.coin_ledger set student_id = v_uid where student_id = v_existing.id;
    update public.student_inventory set student_id = v_uid where student_id = v_existing.id;

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

create or replace function public.purchase_shop_item(
  p_item_id text,
  p_catalog_version integer,
  p_request_id uuid
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
  v_item_id text := trim(coalesce(p_item_id, ''));
  v_price integer;
  v_balance_after integer;
  v_ledger_id uuid;
begin
  if v_student_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_request_id is null then
    raise exception 'INVALID_REQUEST_ID';
  end if;
  if v_item_id = '' or p_catalog_version is null then
    raise exception 'INVALID_PURCHASE';
  end if;

  select * into v_student from public.students where id = v_student_id for update;
  if not found then
    raise exception 'STUDENT_NOT_FOUND';
  end if;
  select * into v_existing from public.coin_ledger where request_id = p_request_id;
  if found then
    if v_existing.transaction_type <> 'shop_purchase'
      or v_existing.student_id <> v_student_id
      or v_existing.source_id is distinct from v_item_id
      or (v_existing.metadata ->> 'catalog_version') is distinct from p_catalog_version::text then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return (v_existing.balance_after, v_existing.id, true);
  end if;

  select item.price into v_price
  from public.shop_catalog_items item
  join public.shop_catalog_versions catalog on catalog.version = item.version
  where item.version = p_catalog_version
    and item.item_id = v_item_id
    and item.active
    and catalog.active;
  if v_price is null then
    raise exception 'CATALOG_ITEM_UNAVAILABLE';
  end if;
  if exists (
    select 1 from public.student_inventory
    where student_id = v_student_id and item_id = v_item_id
  ) then
    raise exception 'ALREADY_OWNED';
  end if;

  v_balance_after := v_student.coins - v_price;
  if v_balance_after < 0 then
    raise exception 'INSUFFICIENT_COINS';
  end if;
  update public.students set coins = v_balance_after where id = v_student_id;
  insert into public.coin_ledger (
    request_id, student_id, transaction_type, delta, balance_before,
    balance_after, source_id, metadata
  ) values (
    p_request_id, v_student_id, 'shop_purchase', -v_price, v_student.coins,
    v_balance_after, v_item_id,
    jsonb_build_object('item_id', v_item_id, 'catalog_version', p_catalog_version, 'price', v_price)
  ) returning id into v_ledger_id;
  insert into public.student_inventory (student_id, item_id, source_ledger_id)
  values (v_student_id, v_item_id, v_ledger_id);

  return (v_balance_after, v_ledger_id, false);
end;
$$;

create or replace function public.import_legacy_inventory(
  p_item_ids text[],
  p_request_id uuid
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
  v_item_ids text[];
  v_unknown_item_id text;
  v_ledger_id uuid;
begin
  if v_student_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_request_id is null then
    raise exception 'INVALID_REQUEST_ID';
  end if;

  select coalesce(array_agg(distinct item_id order by item_id), '{}'::text[])
  into v_item_ids
  from unnest(coalesce(p_item_ids, '{}'::text[])) as supplied(item_id)
  where trim(supplied.item_id) <> '';
  if cardinality(v_item_ids) = 0 then
    raise exception 'INVALID_ITEMS';
  end if;

  select * into v_student from public.students where id = v_student_id for update;
  if not found then
    raise exception 'STUDENT_NOT_FOUND';
  end if;
  select * into v_existing from public.coin_ledger where request_id = p_request_id;
  if found then
    if v_existing.transaction_type <> 'legacy_import'
      or v_existing.student_id <> v_student_id
      or v_existing.metadata -> 'item_ids' is distinct from to_jsonb(v_item_ids) then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return (v_existing.balance_after, v_existing.id, true);
  end if;

  select supplied.item_id into v_unknown_item_id
  from unnest(v_item_ids) as supplied(item_id)
  where not exists (
    select 1 from public.shop_catalog_items item where item.item_id = supplied.item_id
  )
  limit 1;
  if v_unknown_item_id is not null then
    raise exception 'UNKNOWN_ITEM';
  end if;

  insert into public.coin_ledger (
    request_id, student_id, transaction_type, delta, balance_before,
    balance_after, source_id, source_date, metadata
  ) values (
    p_request_id, v_student_id, 'legacy_import', 0, v_student.coins,
    v_student.coins, 'legacy_inventory', current_date,
    jsonb_build_object('item_ids', v_item_ids)
  ) returning id into v_ledger_id;

  insert into public.student_inventory (student_id, item_id, source_ledger_id)
  select v_student_id, supplied.item_id, v_ledger_id
  from unnest(v_item_ids) as supplied(item_id)
  on conflict (student_id, item_id) do nothing;

  return (v_student.coins, v_ledger_id, false);
end;
$$;

create or replace function public.get_my_wallet()
returns table (balance integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  return query
  select students.coins
  from public.students
  where students.id = auth.uid();
end;
$$;

create or replace function public.get_my_coin_history(p_limit integer default 50)
returns setof public.coin_ledger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'INVALID_LIMIT';
  end if;

  return query
  select ledger.*
  from public.coin_ledger ledger
  where ledger.student_id = auth.uid()
  order by ledger.created_at desc
  limit p_limit;
end;
$$;

alter table public.coin_ledger enable row level security;
alter table public.student_inventory enable row level security;
alter table public.shop_catalog_versions enable row level security;
alter table public.shop_catalog_items enable row level security;
alter table public.outdoor_completions enable row level security;
alter table public.daily_quest_assignments enable row level security;
alter table public.client_verification_attempts enable row level security;
alter table public.reward_challenges enable row level security;

-- The previous broad update policy made coins writable by any owner or admin.
-- PostgreSQL column grants keep the existing nickname/classroom flows while
-- reserving coins for security-definer wallet RPCs.
drop policy if exists students_update_own on public.students;
create policy students_update_own on public.students
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
revoke update on table public.students from public, anon, authenticated;
grant update (nickname, class_name) on table public.students to authenticated;

create policy coin_ledger_select_own_or_admin on public.coin_ledger
  for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

create policy student_inventory_select_own on public.student_inventory
  for select to authenticated
  using (student_id = auth.uid());

-- Clients only need their RLS-filtered read models; all writes are inside the
-- security-definer RPCs above.
revoke all on table public.coin_ledger, public.student_inventory,
  public.shop_catalog_versions, public.shop_catalog_items, public.outdoor_completions,
  public.daily_quest_assignments, public.client_verification_attempts, public.reward_challenges
  from public, anon, authenticated;
grant select on table public.coin_ledger, public.student_inventory to authenticated;

-- Existing policies are kept for historical reads, but authenticated clients
-- cannot fabricate a completed row to mint a reward.
revoke insert on table public.focus_sessions, public.chore_completions
  from public, anon, authenticated;

revoke all on function public.reward_coins_for_source(text, text) from public, anon, authenticated;
revoke all on function public.admin_deduct_student_coins(text, integer, uuid, integer) from public, anon, authenticated;
revoke all on function public.claim_student_reward(uuid, text, text, date) from public, anon, authenticated;
revoke all on function public.start_focus_reward_session(uuid, integer) from public, anon, authenticated;
revoke all on function public.ensure_daily_quest_assignments() from public, anon, authenticated;
revoke all on function public.record_local_verification_attempt(uuid, text, text) from public, anon, authenticated;
revoke all on function public.issue_reward_challenge(text, text) from public, anon, authenticated;
revoke all on function public.record_focus_completion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.record_chore_completion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.record_outdoor_completion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.purchase_shop_item(text, integer, uuid) from public, anon, authenticated;
revoke all on function public.import_legacy_inventory(text[], uuid) from public, anon, authenticated;
revoke all on function public.get_my_wallet() from public, anon, authenticated;
revoke all on function public.get_my_coin_history(integer) from public, anon, authenticated;
grant execute on function public.admin_deduct_student_coins(text, integer, uuid, integer) to authenticated;
grant execute on function public.start_focus_reward_session(uuid, integer) to authenticated;
grant execute on function public.ensure_daily_quest_assignments() to authenticated;
grant execute on function public.record_local_verification_attempt(uuid, text, text) to authenticated;
grant execute on function public.issue_reward_challenge(text, text) to authenticated;
grant execute on function public.record_focus_completion(uuid, uuid) to authenticated;
grant execute on function public.record_chore_completion(uuid, uuid) to authenticated;
grant execute on function public.record_outdoor_completion(uuid, uuid) to authenticated;
grant execute on function public.purchase_shop_item(text, integer, uuid) to authenticated;
grant execute on function public.import_legacy_inventory(text[], uuid) to authenticated;
grant execute on function public.get_my_wallet() to authenticated;
grant execute on function public.get_my_coin_history(integer) to authenticated;

-- Legacy clients may still reference this function during the transition, but
-- they cannot execute it. Remove the function after the compatible build is mandatory.
revoke execute on function public.increment_student_coins(integer) from authenticated;
comment on function public.increment_student_coins(integer) is
  'Legacy delta RPC retained only for the migration window; remove after the compatible build is mandatory.';
