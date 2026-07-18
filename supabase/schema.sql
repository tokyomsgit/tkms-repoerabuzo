-- レポ選ぶぞう — Supabase 初期セットアップ
-- 既存テーブル（assignments, staff 等）と被らない名前を使用
-- Supabase Dashboard → SQL Editor で実行

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
create policy "repoerabuzo_imports_select_anon"
  on public.repoerabuzo_imports for select to anon using (true);
create policy "repoerabuzo_imports_insert_anon"
  on public.repoerabuzo_imports for insert to anon with check (true);

create policy "repoerabuzo_templates_select_anon"
  on public.repoerabuzo_templates for select to anon using (true);
create policy "repoerabuzo_templates_insert_anon"
  on public.repoerabuzo_templates for insert to anon with check (true);
create policy "repoerabuzo_templates_update_anon"
  on public.repoerabuzo_templates for update to anon using (true) with check (true);
create policy "repoerabuzo_templates_delete_anon"
  on public.repoerabuzo_templates for delete to anon using (true);
