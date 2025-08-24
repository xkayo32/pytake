-- Script para recuperar o flow que foi perdido
-- Flow ID: 9285eac3-52f7-4124-9935-1cbd14f556e3

-- Primeiro, vamos verificar se há versões anteriores do flow
SELECT id, name, status, created_at, updated_at,
       jsonb_array_length(nodes) as node_count,
       jsonb_array_length(edges) as edge_count
FROM flows 
WHERE name LIKE '%Boas-vindas%'
ORDER BY created_at DESC
LIMIT 10;

-- Se encontrarmos uma versão com conteúdo, podemos copiar de volta
-- Exemplo: UPDATE flows 
-- SET nodes = (SELECT nodes FROM flows WHERE id = 'ID_COM_CONTEUDO'),
--     edges = (SELECT edges FROM flows WHERE id = 'ID_COM_CONTEUDO')
-- WHERE id = '9285eac3-52f7-4124-9935-1cbd14f556e3';

-- Verificar se há backup em outras tabelas ou logs
SELECT * FROM flows 
WHERE id IN (
  SELECT id FROM flows 
  WHERE name = 'Boas-vindas Automáticas' 
  AND jsonb_array_length(nodes) > 0
)
ORDER BY updated_at DESC
LIMIT 1;