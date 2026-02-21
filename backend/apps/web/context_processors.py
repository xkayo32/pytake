from django.conf import settings as django_settings


def global_settings(request):
    """Injeção de variáveis globais em todos os templates"""
    return {
        'APP_NAME': 'PyTake',
        'APP_VERSION': '2.0',
        'BASE_URL': django_settings.BASE_URL,
        'SUPPORT_EMAIL': 'suporte@pytake.net',
        'DEBUG': django_settings.DEBUG,
    }
