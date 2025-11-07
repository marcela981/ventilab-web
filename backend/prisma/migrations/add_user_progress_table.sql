-- Creates persistence for per-lesson user progress tracking
CREATE TABLE IF NOT EXISTS user_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  progress DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  score DOUBLE PRECISION NULL,
  metadata JSONB NULL,
  client_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  server_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- server_updated_at is the LWW (last-write-wins) authority managed by the server
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_module_id ON user_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON user_progress(lesson_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_progress_user_module_lesson ON user_progress(user_id, module_id, lesson_id);

