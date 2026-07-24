-- 購入サポート情報 有/無 の掲載数に変更（番手・他社件数を廃止）
-- Supabase Dashboard → SQL Editor で実行

truncate table public.repoerabuzo_other_counts;

alter table public.repoerabuzo_other_counts
  drop column if exists other_count;

alter table public.repoerabuzo_other_counts
  drop column if exists own_rank;

alter table public.repoerabuzo_other_counts
  drop column if exists badge_total;

alter table public.repoerabuzo_other_counts
  add column if not exists support_count int not null default 0;

alter table public.repoerabuzo_other_counts
  add column if not exists no_support_count int not null default 0;
