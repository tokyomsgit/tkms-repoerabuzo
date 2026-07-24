-- 他社件数：自社順位（購入サポート情報付き内）を追加
-- Supabase Dashboard → SQL Editor で実行

alter table public.repoerabuzo_other_counts
  add column if not exists own_rank int;

alter table public.repoerabuzo_other_counts
  add column if not exists badge_total int not null default 0;
