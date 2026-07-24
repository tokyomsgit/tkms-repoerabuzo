-- 他社件数キャッシュに専有面積を追加（建物名+価格だけでは別部屋を混ぜてしまう）
-- Supabase Dashboard → SQL Editor で実行

alter table public.repoerabuzo_other_counts
  add column if not exists area numeric(8, 2);

update public.repoerabuzo_other_counts
  set area = 0
  where area is null;

alter table public.repoerabuzo_other_counts
  alter column area set not null;

alter table public.repoerabuzo_other_counts
  drop constraint if exists repoerabuzo_other_counts_pkey;

alter table public.repoerabuzo_other_counts
  add primary key (building_name, price, area);

-- 旧形式（area=0）の行は使わないので削除して再取得させる
delete from public.repoerabuzo_other_counts where area = 0;
