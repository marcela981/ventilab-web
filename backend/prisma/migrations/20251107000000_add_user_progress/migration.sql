-- Prisma Migration: add_user_progress
-- server_updated_at is the server-side LWW authority during merges

CREATE TABLE "user_progress" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "position_seconds" INTEGER NOT NULL DEFAULT 0,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT FALSE,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "metadata" JSONB,
    "client_updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "server_updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "user_progress_user_id_module_id_lesson_id_key" ON "user_progress"("user_id", "module_id", "lesson_id");
CREATE INDEX "user_progress_user_id_idx" ON "user_progress"("user_id");
CREATE INDEX "user_progress_module_id_idx" ON "user_progress"("module_id");
CREATE INDEX "user_progress_lesson_id_idx" ON "user_progress"("lesson_id");

