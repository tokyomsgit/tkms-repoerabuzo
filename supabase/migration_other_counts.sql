-- 他社件数テーブルだけ追加する場合（imports/templates は既に作成済みのとき）
-- Supabase Dashboard → SQL Editor で実行

create table if not exists public.repoerabuzo_other_counts (
  building_name text not null,
  price int not null,
  other_count int not null default 0,
  checked_at timestamptz not null default now(),
  primary key (building_name, price)
);

alter table public.repoerabuzo_other_counts enable row level security;

drop policy if exists "repoerabuzo_other_counts_select_anon" on public.repoerabuzo_other_counts;
create policy "repoerabuzo_other_counts_select_anon"
  on public.repoerabuzo_other_counts for select to anon using (true);

drop policy if exists "repoerabuzo_other_counts_insert_anon" on public.repoerabuzo_other_counts;
create policy "repoerabuzo_other_counts_insert_anon"
  on public.repoerabuzo_other_counts for insert to anon with check (true);

drop policy if exists "repoerabuzo_other_counts_update_anon" on public.repoerabuzo_other_counts;
create policy "repoerabuzo_other_counts_update_anon"
  on public.repoerabuzo_other_counts for update to anon using (true) with check (true);
