-- 他社件数：マンション名単位に統一（必須マイグレーション）
-- エラー "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- が出ている場合は、このSQLを Supabase Dashboard → SQL Editor で実行してください。

truncate table public.repoerabuzo_other_counts;

alter table public.repoerabuzo_other_counts
  drop constraint if exists repoerabuzo_other_counts_pkey;

alter table public.repoerabuzo_other_counts
  drop column if exists price;

alter table public.repoerabuzo_other_counts
  drop column if exists area;

alter table public.repoerabuzo_other_counts
  add primary key (building_name);
