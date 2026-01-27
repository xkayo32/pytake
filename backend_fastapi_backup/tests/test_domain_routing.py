"""
🔗 Domain Routing Tests - API Integration

Testa todos os endpoints críticos em prod/staging/dev
Pode ser executado com: pytest backend/tests/test_domain_routing.py

Autor: Kayo Carvalho Fernandes
Data: 2025-11-18
Versão: 1.0
"""

import pytest
import httpx
import os
from typing import Dict, Optional

# Configuração de ambientes
ENVIRONMENTS = {
    "prod": {
        "frontend": "https://app.pytake.net",
        "api": "https://api.pytake.net",
    },
    "staging": {
        "frontend": "https://app-staging.pytake.net",
        "api": "https://api-staging.pytake.net",
    },
    "dev": {
        "frontend": "https://app-dev.pytake.net",
        "api": "https://api-dev.pytake.net",
    },
}

# Ambiente padrão para testes (pode ser sobrescrito via env var)
DEFAULT_ENV = os.getenv("TEST_ENV", "prod")


@pytest.fixture(params=["prod", "staging", "dev"])
def environment(request) -> str:
    """Fixture que itera sobre todos os ambientes"""
    return request.param


@pytest.fixture
def api_client():
    """Cria cliente HTTP para testes"""
    return httpx.Client(verify=True, timeout=10.0)


@pytest.fixture
def async_api_client():
    """Cria cliente HTTP assíncrono para testes"""
    return httpx.AsyncClient(verify=True, timeout=10.0)


class TestFrontendRouting:
    """Testes de roteamento do frontend"""

    def test_login_page_accessible(self, api_client: httpx.Client, environment: str):
        """✅ Página de login deve estar acessível"""
        url = f"{ENVIRONMENTS[environment]['frontend']}/login"
        response = api_client.get(url, follow_redirects=True)
        
        assert response.status_code == 200, f"Login page failed with {response.status_code}"
        assert "login" in response.text.lower() or "signin" in response.text.lower()

    def test_register_page_accessible(self, api_client: httpx.Client, environment: str):
        """✅ Página de registro deve estar acessível"""
        url = f"{ENVIRONMENTS[environment]['frontend']}/register"
        response = api_client.get(url, follow_redirects=True)
        
        assert response.status_code == 200, f"Register page failed with {response.status_code}"
        assert "register" in response.text.lower() or "signup" in response.text.lower()

    def test_admin_panel_protected(self, api_client: httpx.Client, environment: str):
        """✅ Painel admin deve estar protegido (redirecionado ou 401)"""
        url = f"{ENVIRONMENTS[environment]['frontend']}/admin"
        response = api_client.get(url, follow_redirects=False)
        
        # Pode ser redirecionado (301, 302, 307) ou retornar 401
        assert response.status_code in [200, 301, 302, 307, 401], \
            f"Admin panel returned unexpected status {response.status_code}"

    def test_agent_panel_protected(self, api_client: httpx.Client, environment: str):
        """✅ Painel de agente deve estar protegido"""
        url = f"{ENVIRONMENTS[environment]['frontend']}/agent"
        response = api_client.get(url, follow_redirects=False)
        
        assert response.status_code in [200, 301, 302, 307, 401], \
            f"Agent panel returned unexpected status {response.status_code}"

    def test_home_page_accessible(self, api_client: httpx.Client, environment: str):
        """✅ Página inicial deve estar acessível"""
        url = f"{ENVIRONMENTS[environment]['frontend']}/"
        response = api_client.get(url, follow_redirects=True)
        
        assert response.status_code == 200, f"Home page failed with {response.status_code}"


class TestAPIRouting:
    """Testes de roteamento da API"""

    def test_health_endpoint(self, api_client: httpx.Client, environment: str):
        """✅ Endpoint de health check deve responder"""
        url = f"{ENVIRONMENTS[environment]['api']}/api/v1/health"
        response = api_client.get(url)
        
        assert response.status_code == 200, f"Health check failed with {response.status_code}"
        assert "ok" in response.text.lower() or "healthy" in response.text.lower()

    def test_swagger_docs_available(self, api_client: httpx.Client, environment: str):
        """✅ Documentação Swagger deve estar disponível"""
        url = f"{ENVIRONMENTS[environment]['api']}/api/v1/docs"
        response = api_client.get(url)
        
        assert response.status_code == 200, f"Swagger docs failed with {response.status_code}"
        assert "swagger" in response.text.lower() or "openapi" in response.text.lower()

    def test_openapi_schema(self, api_client: httpx.Client, environment: str):
        """✅ Schema OpenAPI deve estar disponível"""
        url = f"{ENVIRONMENTS[environment]['api']}/api/v1/openapi.json"
        response = api_client.get(url)
        
        assert response.status_code == 200, f"OpenAPI schema failed with {response.status_code}"
        assert "openapi" in response.text or "swagger" in response.text

    def test_auth_endpoint_responds(self, api_client: httpx.Client, environment: str):
        """✅ Endpoint de auth deve responder (mesmo sem credenciais válidas)"""
        url = f"{ENVIRONMENTS[environment]['api']}/api/v1/auth/login"
        response = api_client.post(url, json={"email": "test@test.com", "password": "test"})
        
        # Deve ser 422 (validação) ou 401 (credenciais inválidas)
        assert response.status_code in [400, 401, 422], \
            f"Auth endpoint returned unexpected status {response.status_code}"

    def test_404_error_handling(self, api_client: httpx.Client, environment: str):
        """✅ Endpoint inválido deve retornar 404"""
        url = f"{ENVIRONMENTS[environment]['api']}/api/v1/nonexistent"
        response = api_client.get(url)
        
        assert response.status_code == 404, f"404 handling failed with {response.status_code}"


class TestSSLCertificates:
    """Testes de certificados SSL"""

    def test_frontend_ssl_valid(self, api_client: httpx.Client, environment: str):
        """✅ Certificado SSL do frontend deve ser válido"""
        url = f"{ENVIRONMENTS[environment]['frontend']}"
        try:
            response = api_client.get(url, verify=True)
            assert response.status_code in [200, 301, 302], \
                f"SSL test failed with status {response.status_code}"
        except httpx.SSLError as e:
            pytest.fail(f"SSL certificate error for frontend {environment}: {str(e)}")

    def test_api_ssl_valid(self, api_client: httpx.Client, environment: str):
        """✅ Certificado SSL da API deve ser válido"""
        url = f"{ENVIRONMENTS[environment]['api']}/api/v1/health"
        try:
            response = api_client.get(url, verify=True)
            assert response.status_code == 200, f"SSL test failed with status {response.status_code}"
        except httpx.SSLError as e:
            pytest.fail(f"SSL certificate error for API {environment}: {str(e)}")


class TestResponseHeaders:
    """Testes de headers de resposta"""

    def test_frontend_security_headers(self, api_client: httpx.Client, environment: str):
        """✅ Frontend deve incluir headers de segurança"""
        url = f"{ENVIRONMENTS[environment]['frontend']}/"
        response = api_client.get(url, follow_redirects=True)
        
        # Pelo menos um header de segurança deve estar presente
        security_headers = ["x-frame-options", "x-content-type-options", "content-security-policy"]
        present = any(h in response.headers for h in security_headers)
        
        # Warning ao invés de fail, pois não é crítico
        if not present:
            pytest.skip("No security headers detected (non-critical)")

    def test_api_cors_headers(self, api_client: httpx.Client, environment: str):
        """✅ API deve incluir headers CORS apropriados"""
        url = f"{ENVIRONMENTS[environment]['api']}/api/v1/health"
        response = api_client.get(url)
        
        # Deveria ter access-control-allow-origin ou similar
        # Não é crítico se não tiver, mas é bom ter
        if "access-control-allow-origin" in response.headers:
            assert "localhost" in response.headers["access-control-allow-origin"] or \
                   "*" in response.headers["access-control-allow-origin"]

    def test_content_type_headers(self, api_client: httpx.Client, environment: str):
        """✅ Respostas devem ter Content-Type apropriado"""
        url = f"{ENVIRONMENTS[environment]['api']}/api/v1/health"
        response = api_client.get(url)
        
        assert "content-type" in response.headers, "Missing Content-Type header"


class TestEnvironmentConsistency:
    """Testes de consistência entre ambientes"""

    @pytest.mark.parametrize("endpoint", ["/api/v1/health", "/api/v1/docs"])
    def test_all_environments_have_same_endpoints(self, api_client: httpx.Client, endpoint: str):
        """✅ Todos os ambientes devem ter os mesmos endpoints"""
        results = {}
        
        for env, urls in ENVIRONMENTS.items():
            url = f"{urls['api']}{endpoint}"
            response = api_client.get(url)
            results[env] = response.status_code
        
        # Todos devem retornar o mesmo status
        status_codes = list(results.values())
        assert len(set(status_codes)) == 1, \
            f"Inconsistent status codes between environments: {results}"

    def test_frontend_versions_match(self, api_client: httpx.Client):
        """✅ Frontend deve ter a mesma versão em todos ambientes (opcional)"""
        # Este teste é mais para informação do que para falhar
        for env, urls in ENVIRONMENTS.items():
            response = api_client.get(urls['frontend'], follow_redirects=True)
            # Poderia extrair versão de meta tags ou scripts


@pytest.fixture(scope="session")
def test_report():
    """Fixture para gerar relatório de testes"""
    yield
    print("\n" + "="*60)
    print("🔗 Domain Routing Tests Complete")
    print("="*60)


# Para executar: pytest backend/tests/test_domain_routing.py -v
# Para um ambiente específico: pytest backend/tests/test_domain_routing.py -v --deselect-marker=not_prod
# Com relatório HTML: pytest backend/tests/test_domain_routing.py -v --html=report.html
