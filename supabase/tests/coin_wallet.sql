begin;

select plan(22);

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
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wallet-student-two@example.test', 'not-used', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb);

insert into public.students (id, student_id, device_id, coins) values
  ('00000000-0000-0000-0000-000000000011', 'STUDENT-ONE', 'wallet-device-one', 100),
  ('00000000-0000-0000-0000-000000000012', 'STUDENT-TWO', 'wallet-device-two', 25);

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
select results_eq(
  $$select balance, replayed from public.claim_student_reward('30000000-0000-0000-0000-000000000001', 'chore', 'chore_sweep', '2026-09-23')$$,
  $$values (85::integer, false)$$,
  'server-owned chore reward credits once'
);
select results_eq(
  $$select balance, replayed from public.claim_student_reward('30000000-0000-0000-0000-000000000001', 'chore', 'chore_sweep', '2026-09-23')$$,
  $$values (85::integer, true)$$,
  'reward replay returns its original result'
);
select is((select count(*)::integer from public.coin_ledger where request_id = '30000000-0000-0000-0000-000000000001'), 1, 'reward replay writes one ledger row');

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

select * from finish();
rollback;
