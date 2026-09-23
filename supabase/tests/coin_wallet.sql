begin;

select plan(35);

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

insert into public.chore_completions (id, student_id, quest_id, date, coins_earned, completed_at) values
  ('30000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', 'chore_sweep', '2026-09-23', 0, '2026-09-23T12:00:00Z');

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
select results_eq(
  $$select balance, replayed from public.claim_student_reward('30000000-0000-0000-0000-000000000001', 'chore', '30000000-0000-0000-0000-000000000011', '1999-01-01')$$,
  $$values (85::integer, false)$$,
  'server-recorded chore reward credits once with its server date'
);
select is(
  (select source_date from public.coin_ledger where request_id = '30000000-0000-0000-0000-000000000001'),
  '2026-09-23'::date,
  'reward claim derives the source date from the completed server row'
);
select results_eq(
  $$select balance, replayed from public.claim_student_reward('30000000-0000-0000-0000-000000000001', 'chore', '30000000-0000-0000-0000-000000000011', '2030-01-01')$$,
  $$values (85::integer, true)$$,
  'reward replay returns its original result'
);
select is((select count(*)::integer from public.coin_ledger where request_id = '30000000-0000-0000-0000-000000000001'), 1, 'reward replay writes one ledger row');

select throws_ok(
  $$select * from public.record_outdoor_completion('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000011', 'outdoor-not-real')$$,
  'P0001', 'INVALID_REWARD_SOURCE',
  'invalid outdoor quest IDs cannot mint coins'
);
select results_eq(
  $$select balance, replayed from public.record_outdoor_completion('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000012', 'outdoor_walk')$$,
  $$values (110::integer, false)$$,
  'recorded outdoor completion creates and consumes one server source'
);
select results_eq(
  $$select balance, replayed from public.record_outdoor_completion('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000012', 'outdoor_walk')$$,
  $$values (110::integer, true)$$,
  'outdoor completion retry is idempotent'
);
select is((select count(*)::integer from public.coin_ledger where request_id = '50000000-0000-0000-0000-000000000002'), 1, 'outdoor retry writes one ledger row');

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
  $$select balance from public.register_student('STUDENT-ONE', 'wallet-device-one')$$,
  $$values (85::integer)$$,
  'reinstall restores the confirmed balance'
);
reset role;
select is((select count(*)::integer from public.coin_ledger where student_id = '00000000-0000-0000-0000-000000000013'), 4, 'reinstall transfers ledger history to the new student ID');
select is((select count(*)::integer from public.student_inventory where student_id = '00000000-0000-0000-0000-000000000013'), 1, 'reinstall transfers owned inventory to the new student ID');
select is((select count(*)::integer from public.coin_ledger where student_id = '00000000-0000-0000-0000-000000000011'), 0, 'reinstall leaves no ledger history on the deleted student ID');

select * from finish();
rollback;
