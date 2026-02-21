from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.http import JsonResponse
import json


# ─────────────────────────────────────────────
# Páginas Públicas
# ─────────────────────────────────────────────

def landing(request):
    """Home / Landing Page pública"""
    if request.user.is_authenticated:
        return redirect('web:dashboard')
    return render(request, 'web/landing.html')


def pricing(request):
    """Página de planos e preços"""
    plans = [
        {
            'name': 'Starter',
            'price': '297',
            'period': 'mês',
            'description': 'Ideal para pequenas empresas iniciando no WhatsApp',
            'highlight': False,
            'features': [
                '1 número WhatsApp',
                'Até 3 agentes',
                '1.000 conversas/mês',
                'Chatbot básico',
                'Relatórios essenciais',
                'Suporte por email',
            ],
            'cta': 'Começar grátis',
        },
        {
            'name': 'Pro',
            'price': '697',
            'period': 'mês',
            'description': 'Para equipes que precisam de automação avançada',
            'highlight': True,
            'badge': 'Mais popular',
            'features': [
                '3 números WhatsApp',
                'Até 15 agentes',
                '10.000 conversas/mês',
                'Flow Builder visual',
                'Campanhas em massa',
                'Relatórios avançados',
                'API de integração',
                'Suporte prioritário',
            ],
            'cta': 'Começar grátis',
        },
        {
            'name': 'Enterprise',
            'price': 'Sob consulta',
            'period': '',
            'description': 'Para grandes operações com necessidades específicas',
            'highlight': False,
            'features': [
                'Números ilimitados',
                'Agentes ilimitados',
                'Conversas ilimitadas',
                'IA avançada',
                'Onboarding dedicado',
                'SLA garantido',
                'Infraestrutura dedicada',
                'Suporte 24/7',
            ],
            'cta': 'Falar com vendas',
        },
    ]
    return render(request, 'web/pricing.html', {'plans': plans})


def privacy_policy(request):
    """Política de Privacidade"""
    return render(request, 'web/privacy.html')


def terms_of_service(request):
    """Termos de Serviço"""
    return render(request, 'web/terms.html')


# ─────────────────────────────────────────────
# Autenticação via Session
# ─────────────────────────────────────────────

def login_view(request):
    """Login via Django session"""
    if request.user.is_authenticated:
        return redirect('web:dashboard')

    if request.method == 'POST':
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        remember_me = request.POST.get('remember_me')

        user = authenticate(request, username=email, password=password)
        if user is not None:
            if not user.is_active:
                messages.error(request, 'Conta desativada. Entre em contato com o suporte.')
                return render(request, 'web/login.html', {'email': email})

            login(request, user)

            if not remember_me:
                request.session.set_expiry(0)

            next_url = request.GET.get('next', '')
            if next_url and next_url.startswith('/'):
                return redirect(next_url)
            return redirect('web:dashboard')
        else:
            messages.error(request, 'Email ou senha incorretos.')
            return render(request, 'web/login.html', {'email': email})

    return render(request, 'web/login.html')


def logout_view(request):
    """Logout e redireciona para login"""
    logout(request)
    messages.success(request, 'Você saiu com sucesso.')
    return redirect('web:login')


def register_view(request):
    """Registro de nova organização"""
    if request.user.is_authenticated:
        return redirect('web:dashboard')
    return render(request, 'web/register.html')


# ─────────────────────────────────────────────
# App (área logada)
# ─────────────────────────────────────────────

@login_required
def dashboard(request):
    """Dashboard principal"""
    return render(request, 'web/app/dashboard.html')


# ─────────────────────────────────────────────
# Erros
# ─────────────────────────────────────────────

def error_404(request, exception=None):
    return render(request, 'errors/404.html', status=404)


def error_500(request):
    return render(request, 'errors/500.html', status=500)


def error_403(request, exception=None):
    return render(request, 'errors/403.html', status=403)
