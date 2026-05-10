-- Migration : table utilisateurs pour l'authentification JWT
-- Fichier : sql/10_create_users_table.sql

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(72)  NOT NULL,
    name          VARCHAR(80)  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index sur l'email (clé de connexion)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Trigger de mise à jour de updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at'
  ) THEN
    CREATE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;

COMMENT ON TABLE  users              IS 'Comptes utilisateurs — authentification JWT';
COMMENT ON COLUMN users.email        IS 'Email unique, normalisé en minuscule';
COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt (12 rounds) du mot de passe';
