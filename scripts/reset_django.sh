#!/bin/bash
# Reset PostgreSQL e iniciar Django do zero

set -e

echo "🔄 Resetando PyTake para Django..."

# 1. Parar containers (se estiverem rodando)
echo "1️⃣  Parando containers..."
docker-compose down || true

# 2. Remover volumes PostgreSQL (apagar dados FastAPI)
echo "2️⃣  Apagando banco de dados FastAPI..."
docker volume rm pytake-postgres_data_dev || true
docker volume rm postgres_data_dev || true

# 3. Build da imagem Django
echo "3️⃣  Building imagem Django..."
docker-compose build backend

# 4. Subir todos os serviços
echo "4️⃣  Subindo serviços Docker..."
docker-compose up -d

# 5. Esperar PostgreSQL ficar pronto
echo "5️⃣  Aguardando PostgreSQL..."
sleep 10

# 6. Rodar migrations Django
echo "6️⃣  Rodando migrations..."
docker-compose exec -T backend python manage.py migrate

# 7. Criar superuser (opcional)
echo "7️⃣  Criando superuser (admin / admin123)..."
docker-compose exec -T backend python manage.py shell << EOF
from django.contrib.auth.models import User
from apps.authentication.models import User as CustomUser

if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print("✅ Superuser criado: admin / admin123")
else:
    print("⚠️  Superuser já existe")
EOF

# 8. Carregar dados iniciais (opcional)
echo "8️⃣  Setup inicial..."

# 9. Status final
echo ""
echo "================================"
echo "✅ DJANGO PRONTO!"
echo "================================"
echo ""
echo "🌐 URLs disponíveis:"
echo "  • API: http://localhost:8002/api/v1/"
echo "  • Admin: http://localhost:8002/admin/"
echo "  • Docs: http://localhost:8002/api/schema/"
echo "  • Health: http://localhost:8002/api/v1/health/"
echo ""
echo "📊 Credenciais:"
echo "  • Usuario: admin"
echo "  • Senha: admin123"
echo ""
echo "📋 Próximos passos:"
echo "  1. Ver logs: docker-compose logs -f backend"
echo "  2. Testar endpoints: curl http://localhost:8002/api/v1/health/"
echo "  3. Acessar admin: http://localhost:8002/admin/"
echo ""
echo "🛑 Para parar tudo: docker-compose down"
echo ""
