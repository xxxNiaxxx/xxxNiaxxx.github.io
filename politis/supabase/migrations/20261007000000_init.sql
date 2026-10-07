-- Politis — initial schema
-- Public content tables (sources, benefits, benefit_rules, procedures, procedure_steps) are
-- read-only for clients. User tables (profiles, tasks) are protected by Row Level Security.
-- NOTE: no column ever stores government credentials, AFM, AMKA or banking data.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Sources
-- ---------------------------------------------------------------------------
create table public.sources (
  id text primary key,
  authority text not null,
  url text not null,
  last_verified date not null,
  is_mock boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Benefits & rules
-- ---------------------------------------------------------------------------
create table public.procedures (
  id text primary key,
  title text not null,
  action_title text not null,
  description text not null,
  category text not null check (category in ('family','work','unemployment','housing','education','vehicle','tax','health')),
  authority text not null,
  official_url text not null,
  estimated_time text not null,
  cost text not null,
  required_documents text[] not null default '{}',
  online boolean not null default true,
  keywords text[] not null default '{}',
  source_id text references public.sources(id) on delete set null,
  is_mock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.procedure_steps (
  id text primary key,
  procedure_id text not null references public.procedures(id) on delete cascade,
  step_order int not null,
  title text not null,
  description text,
  unique (procedure_id, step_order)
);

create table public.benefits (
  id text primary key,
  title text not null,
  summary text not null,
  description text not null,
  category text not null check (category in ('family','work','unemployment','housing','education','vehicle','tax','health')),
  authority text not null,
  official_url text not null,
  last_verified date not null,
  status text not null default 'open' check (status in ('open','upcoming','closed')),
  deadline timestamptz,
  procedure_id text references public.procedures(id) on delete set null,
  required_checks text[] not null default '{}',
  keywords text[] not null default '{}',
  source_id text references public.sources(id) on delete set null,
  is_mock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.benefit_rules (
  id text primary key,
  benefit_id text not null references public.benefits(id) on delete cascade,
  field text not null check (field in ('ageRange','employmentStatus','children','housingStatus','region','incomeRange')),
  operator text not null check (operator in ('in','notIn','gte','lte','eq')),
  value jsonb not null,
  required boolean not null default true,
  description text not null
);

-- ---------------------------------------------------------------------------
-- User data
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  age_range text check (age_range in ('18-24','25-34','35-44','45-54','55-64','65+')),
  employment_status text check (employment_status in ('employed','self_employed','unemployed','student','retired','other')),
  children smallint check (children between 0 and 3),
  housing_status text check (housing_status in ('renter','owner','family','other')),
  region text,
  municipality text,
  income_range text check (income_range in ('low','lower_middle','middle','high')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  due_date timestamptz,
  status text not null default 'pending' check (status in ('pending','done')),
  -- Plain text (no FK) so tasks keep working while content is served from local mock data.
  procedure_id text,
  benefit_id text,
  remind_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index benefits_category_idx on public.benefits (category);
create index benefits_status_idx on public.benefits (status);
create index benefits_deadline_idx on public.benefits (deadline) where deadline is not null;
create index benefits_keywords_idx on public.benefits using gin (keywords);
create index benefit_rules_benefit_idx on public.benefit_rules (benefit_id);
create index procedures_category_idx on public.procedures (category);
create index procedures_keywords_idx on public.procedures using gin (keywords);
create index procedure_steps_procedure_idx on public.procedure_steps (procedure_id, step_order);
create index tasks_user_status_due_idx on public.tasks (user_id, status, due_date);
create index tasks_procedure_idx on public.tasks (procedure_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger benefits_updated_at before update on public.benefits for each row execute function public.set_updated_at();
create trigger procedures_updated_at before update on public.procedures for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.sources enable row level security;
alter table public.benefits enable row level security;
alter table public.benefit_rules enable row level security;
alter table public.procedures enable row level security;
alter table public.procedure_steps enable row level security;
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;

-- Public content: readable by anyone, writable only via the service role (admin tooling).
create policy "sources are readable" on public.sources for select using (true);
create policy "benefits are readable" on public.benefits for select using (true);
create policy "benefit rules are readable" on public.benefit_rules for select using (true);
create policy "procedures are readable" on public.procedures for select using (true);
create policy "procedure steps are readable" on public.procedure_steps for select using (true);

-- Profiles: a user can only see and change their own row.
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile delete" on public.profiles for delete using (auth.uid() = id);

-- Tasks: a user can only see and change their own tasks.
create policy "own tasks select" on public.tasks for select using (auth.uid() = user_id);
create policy "own tasks insert" on public.tasks for insert with check (auth.uid() = user_id);
create policy "own tasks update" on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tasks delete" on public.tasks for delete using (auth.uid() = user_id);
