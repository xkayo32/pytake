-- Script para criar usuário admin padrão
-- Executar manualmente na DB: psql -U pytake_user -d pytake -f scripts/create_admin.sql

DO $$
DECLARE
    admin_org_id UUID;
    admin_password_hash VARCHAR(255);
BEGIN
    -- Gerar senha: admin123!Admin (hash bcrypt)
    admin_password_hash := '$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86AGR0Ifj5u';
    
    -- Criar organização admin
    INSERT INTO organizations (
        id, name, slug, description, is_active, created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        'PyTake Admin',
        'pytake-admin',
        'Organização administrativa do PyTake',
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO admin_org_id;
    
    -- Se não retornou, pega o ID existente
    IF admin_org_id IS NULL THEN
        SELECT id INTO admin_org_id FROM organizations WHERE slug = 'pytake-admin';
    END IF;
    
    -- Criar usuário admin
    INSERT INTO users (
        id,
        organization_id,
        email,
        password_hash,
        full_name,
        role,
        is_active,
        email_verified,
        email_verified_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        admin_org_id,
        'admin@pytake.net',
        admin_password_hash,
        'Administrador Sistema',
        'super_admin',
        true,
        true,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        role = 'super_admin',
        is_active = true,
        updated_at = NOW();
    
    RAISE NOTICE '✅ Admin criado com sucesso!';
    RAISE NOTICE '📧 Email: admin@pytake.net';
    RAISE NOTICE '🔑 Senha: admin123!Admin';
    RAISE NOTICE '👥 Role: super_admin';
    
END $$;
