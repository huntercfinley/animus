-- Profile: canonical username support.
-- The auth flow already looks up users by username, but the column was
-- never formally declared in a migration. Make it canonical, enforce
-- lowercase, and uniqueness.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE profiles SET username = LOWER(username)
  WHERE username IS NOT NULL AND username <> LOWER(username);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON profiles (username)
  WHERE username IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_format'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_format
      CHECK (
        username IS NULL
        OR (
          username = LOWER(username)
          AND char_length(username) BETWEEN 3 AND 20
          AND username ~ '^[a-z0-9_]+$'
        )
      );
  END IF;
END$$;
