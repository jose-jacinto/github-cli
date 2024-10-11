-- Table for storing languages
-- Could be useful to keep track of what languages we store
CREATE TABLE IF NOT EXISTS languages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

-- Create the user_languages junction table
CREATE TABLE IF NOT EXISTS user_languages (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  language_id INTEGER REFERENCES languages(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, language_id)
);

-- Insert some languages
INSERT INTO languages (name) VALUES
  ('TypeScript')
ON CONFLICT (name) DO NOTHING;

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_languages_user_id ON user_languages (user_id);