begin;

select plan(62);

select is(
  (select count(*)::integer from public.shop_catalog_items where version = 1),
  69,
  'catalog version one seeds all 69 specified items'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wallet-admin@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wallet-student-one@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wallet-student-two@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wallet-student-one-restored@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb);

insert into public.students (id, student_id, device_id, coins) values
  ('00000000-0000-0000-0000-000000000011', 'STUDENT-ONE', 'wallet-device-one', 100),
  ('00000000-0000-0000-0000-000000000012', 'STUDENT-TWO', 'wallet-device-two', 25);

create temporary table wallet_test_challenges (
  name text primary key,
  nonce uuid not null
);

create temporary table wallet_test_attempts (
  name text primary key,
  id uuid not null
);

-- Fixed privileged assignments isolate the reward tests from rotating selections.
insert into public.daily_quest_assignments (student_id, reward_type, quest_id, source_date, position)
select '00000000-0000-0000-0000-000000000011'::uuid, reward_type, quest_id,
  (clock_timestamp() at time zone 'Asia/Bangkok')::date, position
from (values
  ('chore', 'chore_sweep', 1), ('chore', 'chore_dishes', 2), ('chore', 'chore_desk', 3),
  ('outdoor', 'outdoor_walk', 1), ('outdoor', 'outdoor_water_plants', 2),
  ('outdoor', 'outdoor_sweep', 3), ('outdoor', 'outdoor_collect_leaves', 4)
) as fixture(reward_type, quest_id, position);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
set local role authenticated;
select results_eq(
  $$select reward_type, count(*)::integer between 3 and 5 from public.ensure_daily_quest_assignments() group by reward_type order by reward_type$$,
  $$values ('chore'::text, true), ('outdoor'::text, true)$$,
  'assignment RPC creates bounded daily selections for the authenticated student'
);
select is(
  (select count(*)::integer from public.ensure_daily_quest_assignments() where reward_type = 'outdoor'),
  4, 'server selects exactly four outdoor quests'
);
select throws_ok(
  $$insert into public.daily_quest_assignments (student_id, reward_type, quest_id, source_date, position)
    values ('00000000-0000-0000-0000-000000000012', 'chore', 'chore_sweep', current_date, 1)$$,
  '42501', 'permission denied for table daily_quest_assignments',
  'clients cannot choose or replace server assignments directly'
);
reset role;
create temporary table wallet_test_assignments as select * from public.ensure_daily_quest_assignments();
select results_eq(
  $$select reward_type, quest_id, source_date, position from public.ensure_daily_quest_assignments() order by reward_type, position$$,
  $$select reward_type, quest_id, source_date, position from wallet_test_assignments order by reward_type, position$$,
  'assignment retries preserve the canonical selection and order'
);

select ok(
  (select bool_and(student_id = '00000000-0000-0000-0000-000000000012'::uuid
    and source_date = (clock_timestamp() at time zone 'Asia/Bangkok')::date)
    from public.ensure_daily_quest_assignments()),
  'assignment RPC returns only the authenticated student and current Bangkok day'
);
select lives_ok(
  $$select public.record_local_verification_attempt('60000000-0000-0000-0000-000000000080', 'chore',
    (select quest_id from wallet_test_assignments where reward_type = 'chore' order by position limit 1))$$,
  'server-generated selected quest accepts a verification attempt'
);

-- An absent auth context and a non-admin user must not be able to deduct.
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select * from public.admin_deduct_student_coins('STUDENT-ONE', 40, '10000000-0000-0000-0000-000000000001', 100)$$,
  'P0001', 'ADMIN_REQUIRED',
  'unauthenticated deduction requires an admin'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
select throws_ok(
  $$select * from public.admin_deduct_student_coins('STUDENT-ONE', 40, '10000000-0000-0000-0000-000000000002', 100)$$,
  'P0001', 'ADMIN_REQUIRED',
  'student deduction requires an admin'
);

insert into public.admin_users (user_id, email, username)
values ('00000000-0000-0000-0000-000000000001', 'wallet-admin@example.test', 'wallet-admin');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$select * from public.admin_deduct_student_coins('STUDENT-ONE', 0, '10000000-0000-0000-0000-000000000003', 100)$$,
  'P0001', 'INVALID_AMOUNT',
  'zero deduction is rejected'
);
select throws_ok(
  $$select * from public.admin_deduct_student_coins('STUDENT-ONE', -1, '10000000-0000-0000-0000-000000000004', 100)$$,
  'P0001', 'INVALID_AMOUNT',
  'negative deduction is rejected'
);
select throws_ok(
  $$select * from public.admin_deduct_student_coins('STUDENT-ONE', 101, '10000000-0000-0000-0000-000000000005', 100)$$,
  'P0001', 'INSUFFICIENT_COINS',
  'deduction above the balance is rejected'
);
select throws_ok(
  $$select * from public.admin_deduct_student_coins('STUDENT-ONE', 40, '10000000-0000-0000-0000-000000000006', 99)$$,
  'P0001', 'BALANCE_CHANGED',
  'stale expected balance is rejected'
);

select results_eq(
  $$select balance from public.admin_deduct_student_coins(' STUDENT-ONE ', 40, '10000000-0000-0000-0000-000000000007', 100)$$,
  $$values (60::integer)$$,
  'valid deduction returns the new balance'
);
select is((select coins from public.students where student_id = 'STUDENT-ONE'), 60, 'valid deduction updates the student balance');
select is((select count(*)::integer from public.coin_ledger where request_id = '10000000-0000-0000-0000-000000000007'), 1, 'valid deduction writes one ledger row');
select is((select transaction_type from public.coin_ledger where request_id = '10000000-0000-0000-0000-000000000007'), 'admin_deduction', 'deduction ledger row has its transaction type');

select results_eq(
  $$select balance, replayed from public.admin_deduct_student_coins('STUDENT-ONE', 40, '10000000-0000-0000-0000-000000000007', 100)$$,
  $$values (60::integer, true)$$,
  'deduction replay returns the original balance and replay marker'
);
select is((select coins from public.students where student_id = 'STUDENT-ONE'), 60, 'deduction replay does not change the balance');
select throws_ok(
  $$select * from public.admin_deduct_student_coins('STUDENT-ONE', 39, '10000000-0000-0000-0000-000000000007', 100)$$,
  'P0001', 'IDEMPOTENCY_CONFLICT',
  'deduction request reuse with a different amount is rejected'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
set local role authenticated;
select throws_ok(
  $$update public.students set coins = 999 where id = '00000000-0000-0000-0000-000000000011'$$,
  '42501', 'permission denied for table students',
  'direct student coin updates are rejected'
);
select lives_ok(
  $$update public.students set nickname = 'Wallet tester' where id = '00000000-0000-0000-0000-000000000011'$$,
  'student nickname updates remain allowed'
);
select throws_ok(
  $$insert into public.chore_completions (id, student_id, quest_id, date) values ('30000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000011', 'chore_sweep', '2026-09-23')$$,
  '42501', 'permission denied for table chore_completions',
  'direct reward-source inserts are rejected'
);
reset role;
select throws_ok(
  $$select * from public.purchase_shop_item('hat_tophat', 1, '20000000-0000-0000-0000-000000000001')$$,
  'P0001', 'INSUFFICIENT_COINS',
  'purchase cannot make the balance negative'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select * from public.admin_deduct_student_coins('STUDENT-ONE', 61, '10000000-0000-0000-0000-000000000008', 60)$$,
  'P0001', 'INSUFFICIENT_COINS',
  'admin deduction cannot make the balance negative'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select throws_ok(
  $$select * from public.claim_student_reward('30000000-0000-0000-0000-000000000000', 'chore', '30000000-0000-0000-0000-000000000099', '1999-01-01')$$,
  'P0001', 'REWARD_SOURCE_NOT_FOUND',
  'forged reward source IDs are rejected'
);
select throws_ok(
  $$select * from public.record_outdoor_completion('50000000-0000-0000-0000-000000000000', '40000000-0000-0000-0000-000000000010')$$,
  'P0001', 'CHALLENGE_NOT_FOUND',
  'an unknown challenge nonce cannot mint coins'
);
select throws_ok(
  $$select public.record_local_verification_attempt('60000000-0000-0000-0000-000000000099', 'chore', 'chore_laundry')$$,
  'P0001', 'QUEST_NOT_ASSIGNED',
  'allowlisted but unassigned quest cannot record a verification attempt'
);
insert into public.daily_quest_assignments (student_id, reward_type, quest_id, source_date, position)
values ('00000000-0000-0000-0000-000000000011', 'chore', 'chore_laundry',
  (clock_timestamp() at time zone 'Asia/Bangkok')::date - 1, 1);
select throws_ok(
  $$select public.record_local_verification_attempt('60000000-0000-0000-0000-000000000098', 'chore', 'chore_laundry')$$,
  'P0001', 'QUEST_NOT_ASSIGNED',
  'a prior-day assignment cannot authorize a new attempt today'
);
-- Temporarily remove any caller assignment; the other student selection remains.
create temporary table wallet_test_removed_assignments as
with removed as (delete from public.daily_quest_assignments
where student_id = '00000000-0000-0000-0000-000000000011'
  and quest_id = (select quest_id from wallet_test_assignments where reward_type = 'chore' order by position limit 1)
returning *) select * from removed;
select throws_ok(
  $$select public.record_local_verification_attempt('60000000-0000-0000-0000-000000000097', 'chore',
    (select quest_id from wallet_test_assignments where reward_type = 'chore' order by position limit 1))$$,
  'P0001', 'QUEST_NOT_ASSIGNED',
  'another student assignment cannot authorize a verification attempt'
);
insert into public.daily_quest_assignments select * from wallet_test_removed_assignments;
select results_eq(
  $$select public.record_local_verification_attempt('60000000-0000-0000-0000-000000000001', 'chore', 'chore_sweep')$$,
  $$values ('60000000-0000-0000-0000-000000000001'::uuid)$$,
  'selected quest can record an attempt for the student and Bangkok day'
);
insert into wallet_test_attempts (name, id)
select 'chore', public.record_local_verification_attempt('60000000-0000-0000-0000-000000000001', 'chore', 'chore_sweep');
select throws_ok(
  $$select public.record_local_verification_attempt('60000000-0000-0000-0000-000000000002', 'chore', 'chore_sweep')$$,
  'P0001', 'VERIFICATION_ALREADY_RECORDED',
  'one verified chore attempt per quest and Bangkok day is enforced'
);
insert into wallet_test_attempts (name, id)
select 'outdoor-one', public.record_local_verification_attempt('60000000-0000-0000-0000-000000000003', 'outdoor', 'outdoor_walk');
insert into wallet_test_challenges (name, nonce)
select 'chore', nonce from public.issue_reward_challenge('chore', (select id::text from wallet_test_attempts where name = 'chore'));
select throws_ok(
  $$select * from public.issue_reward_challenge('outdoor', (select id::text from wallet_test_attempts where name = 'outdoor-one'))$$,
  'P0001', 'CHALLENGE_ACTIVE',
  'only one active reward challenge is allowed'
);
select results_eq(
  $$select balance, replayed from public.record_chore_completion('30000000-0000-0000-0000-000000000001', (select nonce from wallet_test_challenges where name = 'chore'))$$,
  $$values (85::integer, false)$$,
  'issued chore challenge records and credits once with its server date'
);
select is(
  (select source_date from public.coin_ledger where request_id = '30000000-0000-0000-0000-000000000001'),
  (now() at time zone 'Asia/Bangkok')::date,
  'reward claim derives the source date from the completed server row'
);
select results_eq(
  $$select balance, replayed from public.record_chore_completion('30000000-0000-0000-0000-000000000001', (select nonce from wallet_test_challenges where name = 'chore'))$$,
  $$values (85::integer, true)$$,
  'reward replay returns its original result'
);
select is((select count(*)::integer from public.coin_ledger where request_id = '30000000-0000-0000-0000-000000000001'), 1, 'reward replay writes one ledger row');

select throws_ok(
  $$select public.record_local_verification_attempt('60000000-0000-0000-0000-000000000004', 'outdoor', 'outdoor-not-real')$$,
  'P0001', 'INVALID_REWARD_SOURCE',
  'invalid outdoor quest IDs cannot mint coins'
);
insert into wallet_test_challenges (name, nonce)
select 'outdoor-one', nonce from public.issue_reward_challenge('outdoor', (select id::text from wallet_test_attempts where name = 'outdoor-one'));
select results_eq(
  $$select balance, replayed from public.record_outdoor_completion('50000000-0000-0000-0000-000000000002', (select nonce from wallet_test_challenges where name = 'outdoor-one'))$$,
  $$values (110::integer, false)$$,
  'recorded outdoor completion creates and consumes one server source'
);
select results_eq(
  $$select balance, replayed from public.record_outdoor_completion('50000000-0000-0000-0000-000000000002', (select nonce from wallet_test_challenges where name = 'outdoor-one'))$$,
  $$values (110::integer, true)$$,
  'outdoor completion retry is idempotent'
);
select is((select count(*)::integer from public.coin_ledger where request_id = '50000000-0000-0000-0000-000000000002'), 1, 'outdoor retry writes one ledger row');
insert into wallet_test_attempts (name, id)
select 'outdoor-two', public.record_local_verification_attempt('60000000-0000-0000-0000-000000000005', 'outdoor', 'outdoor_water_plants');
insert into wallet_test_challenges (name, nonce)
select 'outdoor-two', nonce from public.issue_reward_challenge('outdoor', (select id::text from wallet_test_attempts where name = 'outdoor-two'));
select lives_ok(
  $$select * from public.record_outdoor_completion('50000000-0000-0000-0000-000000000003', (select nonce from wallet_test_challenges where name = 'outdoor-two'))$$,
  'second outdoor reward consumes an issued challenge'
);
insert into wallet_test_attempts (name, id)
select 'outdoor-three', public.record_local_verification_attempt('60000000-0000-0000-0000-000000000006', 'outdoor', 'outdoor_sweep');
insert into wallet_test_challenges (name, nonce)
select 'outdoor-three', nonce from public.issue_reward_challenge('outdoor', (select id::text from wallet_test_attempts where name = 'outdoor-three'));
select lives_ok(
  $$select * from public.record_outdoor_completion('50000000-0000-0000-0000-000000000004', (select nonce from wallet_test_challenges where name = 'outdoor-three'))$$,
  'third outdoor reward consumes an issued challenge'
);
insert into wallet_test_attempts (name, id)
select 'outdoor-four', public.record_local_verification_attempt('60000000-0000-0000-0000-000000000007', 'outdoor', 'outdoor_collect_leaves');
select throws_ok(
  $$select * from public.issue_reward_challenge('outdoor', (select id::text from wallet_test_attempts where name = 'outdoor-four'))$$,
  'P0001', 'OUTDOOR_DAILY_QUOTA_REACHED',
  'outdoor daily reward quota is enforced'
);

insert into wallet_test_attempts (name, id)
select 'expired-one', public.record_local_verification_attempt('60000000-0000-0000-0000-000000000008', 'chore', 'chore_dishes');
insert into wallet_test_challenges (name, nonce)
select 'expired-one', nonce from public.issue_reward_challenge('chore', (select id::text from wallet_test_attempts where name = 'expired-one'));
update public.reward_challenges
set expires_at = clock_timestamp() - interval '1 second'
where nonce = (select nonce from wallet_test_challenges where name = 'expired-one');
insert into wallet_test_challenges (name, nonce)
select 'expired-two', nonce from public.issue_reward_challenge('chore', (select id::text from wallet_test_attempts where name = 'expired-one'));
select isnt(
  (select nonce from wallet_test_challenges where name = 'expired-one'),
  (select nonce from wallet_test_challenges where name = 'expired-two'),
  'expired unconsumed challenge is replaced by a new nonce'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', true);
set local role authenticated;
select results_eq(
  $$select public.start_focus_reward_session('70000000-0000-0000-0000-000000000001', 30)$$,
  $$values ('70000000-0000-0000-0000-000000000001'::uuid)$$,
  'server starts an in-progress focus reward session'
);
reset role;
select ok(
  (select ended_at is null from public.focus_sessions where id = '70000000-0000-0000-0000-000000000001'),
  'in-progress focus has no completion timestamp'
);
select throws_ok(
  $$select * from public.issue_reward_challenge('focus', '70000000-0000-0000-0000-000000000001')$$,
  'P0001', 'FOCUS_NOT_COMPLETE',
  'fresh server-started focus session cannot issue a reward challenge'
);
update public.focus_sessions
-- Simulate a session that started before the previous Bangkok midnight.
set started_at = ((clock_timestamp() at time zone 'Asia/Bangkok')::date - 1 + time '23:00') at time zone 'Asia/Bangkok'
where id = '70000000-0000-0000-0000-000000000001';
insert into wallet_test_challenges (name, nonce)
select 'focus', nonce from public.issue_reward_challenge('focus', '70000000-0000-0000-0000-000000000001');
select results_eq(
  $$select balance, replayed from public.record_focus_completion('70000000-0000-0000-0000-000000000002', (select nonce from wallet_test_challenges where name = 'focus'))$$,
  $$values (40::integer, false)$$,
  'elapsed focus challenge credits once'
);
select is(
  (select status from public.focus_sessions where id = '70000000-0000-0000-0000-000000000001'),
  'completed',
  'focus reward consumption completes the same server-started source row'
);

select ok(
  (select ended_at is not null
    and (ended_at at time zone 'Asia/Bangkok')::date > (started_at at time zone 'Asia/Bangkok')::date
    and (ended_at at time zone 'Asia/Bangkok')::date = (clock_timestamp() at time zone 'Asia/Bangkok')::date
    from public.focus_sessions where id = '70000000-0000-0000-0000-000000000001'),
  'cross-midnight focus records the server completion day, not the start day'
);
select is(
  (select source_date from public.coin_ledger where request_id = '70000000-0000-0000-0000-000000000002'),
  (select (ended_at at time zone 'Asia/Bangkok')::date from public.focus_sessions where id = '70000000-0000-0000-0000-000000000001'),
  'cross-midnight focus ledger uses the completion date'
);
create temporary table wallet_test_focus_end as
select ended_at from public.focus_sessions where id = '70000000-0000-0000-0000-000000000001';
select results_eq(
  $$select balance, replayed from public.record_focus_completion('70000000-0000-0000-0000-000000000002', (select nonce from wallet_test_challenges where name = 'focus'))$$,
  $$values (40::integer, true)$$,
  'cross-midnight focus completion retry returns the original result'
);

select is(
  (select ended_at from public.focus_sessions where id = '70000000-0000-0000-0000-000000000001'),
  (select ended_at from wallet_test_focus_end),
  'focus replay preserves the original completion timestamp'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select lives_ok(
  $$select * from public.import_legacy_inventory(array['hat_school', 'hat_school'], '40000000-0000-0000-0000-000000000001')$$,
  'legacy inventory import ignores duplicate known item IDs'
);
select is((select count(*)::integer from public.student_inventory where student_id = '00000000-0000-0000-0000-000000000011' and item_id = 'hat_school'), 1, 'legacy import owns one copy of a duplicate item');
select throws_ok(
  $$select * from public.import_legacy_inventory(array['unknown-item'], '40000000-0000-0000-0000-000000000002')$$,
  'P0001', 'UNKNOWN_ITEM',
  'legacy inventory import rejects unknown item IDs'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000013', true);
set local role authenticated;
select results_eq(
  $$select coins from public.register_student('STUDENT-ONE', 'wallet-device-one')$$,
  $$values (160::integer)$$,
  'reinstall restores the confirmed balance'
);
reset role;
select is((select count(*)::integer from public.coin_ledger where student_id = '00000000-0000-0000-0000-000000000013'), 6, 'reinstall transfers ledger history to the new student ID');
select is((select count(*)::integer from public.student_inventory where student_id = '00000000-0000-0000-0000-000000000013'), 1, 'reinstall transfers owned inventory to the new student ID');
select is((select count(*)::integer from public.coin_ledger where student_id = '00000000-0000-0000-0000-000000000011'), 0, 'reinstall leaves no ledger history on the deleted student ID');

select is(
  (select count(*)::integer from public.daily_quest_assignments where student_id = '00000000-0000-0000-0000-000000000013'),
  8, 'reinstall transfers current and historical assignments with verified attempts'
);

select * from finish();
rollback;
