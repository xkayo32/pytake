-- Tabela de grupos de contatos
CREATE TABLE IF NOT EXISTS contact_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de relacionamento muitos-para-muitos entre grupos e contatos
CREATE TABLE IF NOT EXISTS contact_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    group_id UUID NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, contact_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contact_groups_tenant ON contact_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_group ON contact_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_contact ON contact_group_members(contact_id);

-- Trigger para atualizar updated_at em contact_groups
CREATE TRIGGER update_contact_groups_updated_at BEFORE UPDATE ON contact_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo (assumindo tenant_id padrão como '00000000-0000-0000-0000-000000000001')
-- Primeiro, inserir contatos de exemplo
INSERT INTO contacts (id, tenant_id, phone, name, tags, custom_fields) VALUES 
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '5511987654321', 'João Silva', ARRAY['Cliente', 'VIP'], '{"email": "joao@email.com"}'),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '5521987654321', 'Maria Santos', ARRAY['Lead'], '{"email": "maria@email.com"}'),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '5531987654321', 'Pedro Costa', ARRAY['Cliente'], '{"email": "pedro@email.com"}'),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '5541987654321', 'Ana Paula', ARRAY['Lead', 'Novo'], '{"email": "ana@email.com"}'),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '5551987654321', 'Carlos Lima', ARRAY['Cliente'], '{"email": "carlos@email.com"}'),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '5561987654321', 'Fernanda Rosa', ARRAY['Cliente', 'VIP'], '{"email": "fernanda@email.com"}'),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '5571987654321', 'Ricardo Moura', ARRAY['Lead'], '{"email": "ricardo@email.com"}'),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '5581987654321', 'Juliana Pereira', ARRAY['Cliente'], '{"email": "juliana@email.com"}'),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '5591987654321', 'Roberto Alves', ARRAY['Lead', 'Quente'], '{"email": "roberto@email.com"}'),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '5511888888888', 'Empresa ABC Ltda', ARRAY['Empresa', 'B2B'], '{"email": "contato@empresa.com", "cnpj": "12.345.678/0001-90"}')
ON CONFLICT (tenant_id, phone) DO NOTHING;

-- Inserir grupos de exemplo
INSERT INTO contact_groups (id, tenant_id, name, description) VALUES 
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Clientes VIP', 'Clientes com maior volume de compras'),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Leads Qualificados', 'Leads com alta probabilidade de conversão'),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'Clientes Ativos', 'Clientes com compras recentes'),
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'Empresas B2B', 'Clientes corporativos')
ON CONFLICT (id) DO NOTHING;

-- Associar contatos aos grupos
-- Grupo Clientes VIP
INSERT INTO contact_group_members (tenant_id, group_id, contact_id) 
SELECT '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', c.id 
FROM contacts c 
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001' 
AND c.name IN ('João Silva', 'Fernanda Rosa', 'Empresa ABC Ltda')
ON CONFLICT (group_id, contact_id) DO NOTHING;

-- Grupo Leads Qualificados  
INSERT INTO contact_group_members (tenant_id, group_id, contact_id)
SELECT '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', c.id
FROM contacts c
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001'
AND c.name IN ('Maria Santos', 'Ana Paula', 'Ricardo Moura', 'Roberto Alves')
ON CONFLICT (group_id, contact_id) DO NOTHING;

-- Grupo Clientes Ativos
INSERT INTO contact_group_members (tenant_id, group_id, contact_id)
SELECT '00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', c.id
FROM contacts c
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001'
AND c.name IN ('Pedro Costa', 'Carlos Lima', 'Juliana Pereira', 'João Silva')
ON CONFLICT (group_id, contact_id) DO NOTHING;

-- Grupo Empresas B2B
INSERT INTO contact_group_members (tenant_id, group_id, contact_id)
SELECT '00000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', c.id
FROM contacts c
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001'
AND c.name IN ('Empresa ABC Ltda')
ON CONFLICT (group_id, contact_id) DO NOTHING;