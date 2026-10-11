CREATE TABLE public.projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, name text NOT NULL, description text NOT NULL DEFAULT '', language text NOT NULL DEFAULT 'TypeScript', archived boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.files (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, name text NOT NULL, path text NOT NULL, language text NOT NULL DEFAULT 'text', content text NOT NULL DEFAULT '', size integer NOT NULL DEFAULT 0, favorite boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.snippets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, title text NOT NULL, language text NOT NULL DEFAULT 'text', content text NOT NULL DEFAULT '', tags text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.knowledge_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, name text NOT NULL, content text NOT NULL DEFAULT '', type text NOT NULL DEFAULT 'text', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.agent_runs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, agent text NOT NULL, prompt text NOT NULL, status text NOT NULL DEFAULT 'running', result text, credits_used integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects, public.files, public.snippets, public.knowledge_documents, public.agent_runs TO authenticated;
GRANT ALL ON public.projects, public.files, public.snippets, public.knowledge_documents, public.agent_runs TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own projects" ON public.projects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own files" ON public.files FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own snippets" ON public.snippets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own knowledge" ON public.knowledge_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own agent runs" ON public.agent_runs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.school_levels (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text NOT NULL DEFAULT '', language text NOT NULL DEFAULT 'Luau', display_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.school_exercises (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), level_id uuid NOT NULL REFERENCES public.school_levels(id) ON DELETE CASCADE, title text NOT NULL, description text NOT NULL DEFAULT '', content text NOT NULL DEFAULT '', retorne_quiz boolean NOT NULL DEFAULT false, language text NOT NULL DEFAULT 'Luau', display_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.school_quizzes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), exercise_id uuid NOT NULL REFERENCES public.school_exercises(id) ON DELETE CASCADE, title text NOT NULL DEFAULT 'Quiz', display_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.school_quiz_questions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quiz_id uuid NOT NULL REFERENCES public.school_quizzes(id) ON DELETE CASCADE, question_order integer NOT NULL DEFAULT 1, question text NOT NULL, respost text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.school_progress (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, exercise_id uuid NOT NULL REFERENCES public.school_exercises(id) ON DELETE CASCADE, completed_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, exercise_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_levels, public.school_exercises, public.school_quizzes, public.school_quiz_questions, public.school_progress TO authenticated;
GRANT ALL ON public.school_levels, public.school_exercises, public.school_quizzes, public.school_quiz_questions, public.school_progress TO service_role;
ALTER TABLE public.school_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read levels" ON public.school_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin levels" ON public.school_levels FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Read exercises" ON public.school_exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin exercises" ON public.school_exercises FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Read quizzes" ON public.school_quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin quizzes" ON public.school_quizzes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Read questions" ON public.school_quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin questions" ON public.school_quiz_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own progress" ON public.school_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);