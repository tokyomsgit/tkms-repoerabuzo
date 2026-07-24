-- レポ選ぶぞう — Supabase 初期セットアップ
-- 既存テーブル（assignments, staff 等）と被らない名前を使用
-- Supabase Dashboard → SQL Editor で実行（再実行可）

-- 取込データ
create table if not exists public.repoerabuzo_imports (
  id bigserial primary key,
  period_label text,
  data jsonb default '{}'::jsonb,
  pv_data jsonb default '{}'::jsonb,
  prop_data jsonb not null default '{}'::jsonb,
  imported_by text,
  imported_at timestamptz not null default now()
);

create index if not exists repoerabuzo_imports_imported_at_idx
  on public.repoerabuzo_imports (imported_at desc);

-- エリアテンプレート
create table if not exists public.repoerabuzo_templates (
  name text primary key,
  areas jsonb not null default '[]'::jsonb
);

-- RLS 有効化
alter table public.repoerabuzo_imports enable row level security;
alter table public.repoerabuzo_templates enable row level security;

-- anon キーから読み書き（アプリ・Apps Script 用）
drop policy if exists "repoerabuzo_imports_select_anon" on public.repoerabuzo_imports;
create policy "repoerabuzo_imports_select_anon"
  on public.repoerabuzo_imports for select to anon using (true);

drop policy if exists "repoerabuzo_imports_insert_anon" on public.repoerabuzo_imports;
create policy "repoerabuzo_imports_insert_anon"
  on public.repoerabuzo_imports for insert to anon with check (true);

drop policy if exists "repoerabuzo_templates_select_anon" on public.repoerabuzo_templates;
create policy "repoerabuzo_templates_select_anon"
  on public.repoerabuzo_templates for select to anon using (true);

drop policy if exists "repoerabuzo_templates_insert_anon" on public.repoerabuzo_templates;
create policy "repoerabuzo_templates_insert_anon"
  on public.repoerabuzo_templates for insert to anon with check (true);

drop policy if exists "repoerabuzo_templates_update_anon" on public.repoerabuzo_templates;
create policy "repoerabuzo_templates_update_anon"
  on public.repoerabuzo_templates for update to anon using (true) with check (true);

drop policy if exists "repoerabuzo_templates_delete_anon" on public.repoerabuzo_templates;
create policy "repoerabuzo_templates_delete_anon"
  on public.repoerabuzo_templates for delete to anon using (true);

-- 他社件数キャッシュ（SUUMO マンション名検索結果）
create table if not exists public.repoerabuzo_other_counts (
  building_name text primary key,
  support_count int not null default 0,
  no_support_count int not null default 0,
  checked_at timestamptz not null default now()
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
