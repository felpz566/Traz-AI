-- Traz School: Luau-first learning system
create table if not exists public.school_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  display_order integer not null default 0,
  language text not null default 'Luau',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_exercises (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.school_levels(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  content text not null default '',
  language text not null default 'Luau',
  retorne_quiz boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_quizzes (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.school_exercises(id) on delete cascade,
  title text not null default '',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.school_quizzes(id) on delete cascade,
  question_order integer not null check (question_order between 1 and 4),
  question text not null check (char_length(question) between 1 and 2000),
  respost text not null check (char_length(respost) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (quiz_id, question_order)
);

create table if not exists public.school_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.school_exercises(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique(user_id, exercise_id)
);

alter table public.school_levels enable row level security;
alter table public.school_exercises enable row level security;
alter table public.school_quizzes enable row level security;
alter table public.school_quiz_questions enable row level security;
alter table public.school_progress enable row level security;

create policy "school_levels_authenticated_read" on public.school_levels for select to authenticated using (true);
create policy "school_levels_admin_write" on public.school_levels for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "school_exercises_authenticated_read" on public.school_exercises for select to authenticated using (true);
create policy "school_exercises_admin_write" on public.school_exercises for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "school_quizzes_authenticated_read" on public.school_quizzes for select to authenticated using (true);
create policy "school_quizzes_admin_write" on public.school_quizzes for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "school_questions_authenticated_read" on public.school_quiz_questions for select to authenticated using (true);
create policy "school_questions_admin_write" on public.school_quiz_questions for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "school_progress_owner_all" on public.school_progress for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists school_levels_order_idx on public.school_levels(display_order, created_at);
create index if not exists school_exercises_level_order_idx on public.school_exercises(level_id, display_order, created_at);
create index if not exists school_quizzes_exercise_order_idx on public.school_quizzes(exercise_id, display_order, created_at);
create index if not exists school_questions_quiz_order_idx on public.school_quiz_questions(quiz_id, question_order);
create index if not exists school_progress_user_idx on public.school_progress(user_id);
