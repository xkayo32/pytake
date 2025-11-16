-- Criar banco de dados se não existir
SELECT 'CREATE DATABASE pytake'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pytake')\gexec

-- Conectar ao banco pytake
\c pytake

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- NOTE: All tables are managed by Alembic migrations
-- Do NOT create tables here manually, or it will conflict with Alembic


CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();