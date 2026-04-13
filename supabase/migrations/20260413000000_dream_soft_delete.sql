-- Soft-delete support for dreams. Users can move dreams to a trash can
-- and either restore them or permanently delete them (like Photos app).
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dreams_user_active
  ON dreams (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dreams_user_trashed
  ON dreams (user_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;
