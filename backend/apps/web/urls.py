from django.urls import path
from . import views

app_name = 'web'

urlpatterns = [
    # ── Páginas Públicas ──────────────────────────────────────
    path('', views.landing, name='landing'),
    path('precos/', views.pricing, name='pricing'),
    path('privacidade/', views.privacy_policy, name='privacy'),
    path('termos/', views.terms_of_service, name='terms'),

    # ── Autenticação ──────────────────────────────────────────
    path('entrar/', views.login_view, name='login'),
    path('sair/', views.logout_view, name='logout'),
    path('cadastro/', views.register_view, name='register'),

    # ── App (área logada) ─────────────────────────────────────
    path('app/', views.dashboard, name='dashboard'),
]
