/*
# Korean Learning App - Database Schema

1. Overview
This app helps foreigners learn Korean. It includes user accounts (auth),
daily attendance tracking, a vocabulary library, quizzes, and conversation practice.
All user-specific data is owner-scoped via user_id with RLS policies.

2. New Tables
- `profiles` — extends auth.users with display name and avatar
- `attendance` — daily check-in records for streak tracking
- `word_categories` — categories for vocabulary (e.g., Greetings, Food, Numbers)
- `words` — Korean vocabulary items with English translation, romanization, audio
- `quiz_questions` — multiple-choice quiz questions linked to words
- `quiz_results` — user quiz attempt history
- `conversation_scenarios` — conversation themes (e.g., Ordering at a Restaurant)
- `conversation_lines` — individual lines within a conversation scenario
- `study_progress` — tracks which words a user has studied / bookmarked

3. Security
- All tables have RLS enabled.
- User-specific tables (attendance, quiz_results, study_progress, profiles) use owner-scoped policies with auth.uid().
- Content tables (word_categories, words, quiz_questions, conversation_scenarios, conversation_lines) are readable by all authenticated users (shared learning content).
- Only the owner can insert/modify their attendance, quiz_results, and study_progress rows.

4. Important Notes
- user_id columns default to auth.uid() so frontend inserts work without passing user_id.
- attendance table has a unique constraint on (user_id, check_in_date) to prevent duplicate daily check-ins.
- study_progress has a unique constraint on (user_id, word_id) to prevent duplicate progress rows.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_emoji text NOT NULL DEFAULT '🇰🇷',
  target_level text NOT NULL DEFAULT 'Beginner',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, check_in_date)
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_attendance" ON attendance;
CREATE POLICY "select_own_attendance" ON attendance FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_attendance" ON attendance;
CREATE POLICY "insert_own_attendance" ON attendance FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_attendance" ON attendance;
CREATE POLICY "update_own_attendance" ON attendance FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_attendance" ON attendance;
CREATE POLICY "delete_own_attendance" ON attendance FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- WORD CATEGORIES (shared content)
CREATE TABLE IF NOT EXISTS word_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ko text NOT NULL,
  icon text NOT NULL DEFAULT '📚',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE word_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_word_categories" ON word_categories;
CREATE POLICY "read_word_categories" ON word_categories FOR SELECT
  TO authenticated USING (true);

-- WORDS (shared content)
CREATE TABLE IF NOT EXISTS words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES word_categories(id) ON DELETE CASCADE,
  korean text NOT NULL,
  english text NOT NULL,
  romanization text NOT NULL DEFAULT '',
  example_ko text NOT NULL DEFAULT '',
  example_en text NOT NULL DEFAULT '',
  difficulty int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_words" ON words;
CREATE POLICY "read_words" ON words FOR SELECT
  TO authenticated USING (true);

-- QUIZ QUESTIONS (shared content)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  question text NOT NULL,
  correct_answer text NOT NULL,
  wrong_answer_1 text NOT NULL,
  wrong_answer_2 text NOT NULL,
  wrong_answer_3 text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_quiz_questions" ON quiz_questions;
CREATE POLICY "read_quiz_questions" ON quiz_questions FOR SELECT
  TO authenticated USING (true);

-- QUIZ RESULTS (user-specific)
CREATE TABLE IF NOT EXISTS quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  total_questions int NOT NULL DEFAULT 0,
  correct_answers int NOT NULL DEFAULT 0,
  score_percentage int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_quiz_results" ON quiz_results;
CREATE POLICY "select_own_quiz_results" ON quiz_results FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_quiz_results" ON quiz_results;
CREATE POLICY "insert_own_quiz_results" ON quiz_results FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_quiz_results" ON quiz_results;
CREATE POLICY "update_own_quiz_results" ON quiz_results FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_quiz_results" ON quiz_results;
CREATE POLICY "delete_own_quiz_results" ON quiz_results FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- CONVERSATION SCENARIOS (shared content)
CREATE TABLE IF NOT EXISTS conversation_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ko text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '💬',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE conversation_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_conversation_scenarios" ON conversation_scenarios;
CREATE POLICY "read_conversation_scenarios" ON conversation_scenarios FOR SELECT
  TO authenticated USING (true);

-- CONVERSATION LINES (shared content)
CREATE TABLE IF NOT EXISTS conversation_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES conversation_scenarios(id) ON DELETE CASCADE,
  speaker text NOT NULL,
  speaker_en text NOT NULL DEFAULT '',
  korean text NOT NULL,
  english text NOT NULL,
  romanization text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE conversation_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_conversation_lines" ON conversation_lines;
CREATE POLICY "read_conversation_lines" ON conversation_lines FOR SELECT
  TO authenticated USING (true);

-- STUDY PROGRESS (user-specific bookmarks)
CREATE TABLE IF NOT EXISTS study_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  is_bookmarked boolean NOT NULL DEFAULT false,
  study_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word_id)
);
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_study_progress" ON study_progress;
CREATE POLICY "select_own_study_progress" ON study_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_study_progress" ON study_progress;
CREATE POLICY "insert_own_study_progress" ON study_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_study_progress" ON study_progress;
CREATE POLICY "update_own_study_progress" ON study_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_study_progress" ON study_progress;
CREATE POLICY "delete_own_study_progress" ON study_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_words_category ON words(category_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_word ON quiz_questions(word_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, check_in_date);
CREATE INDEX IF NOT EXISTS idx_conversation_lines_scenario ON conversation_lines(scenario_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_user ON study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id);
