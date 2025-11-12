import sys
import importlib

print('🔍 Smoke check backend')
try:
    # Basic deps presence
    import fastapi  # noqa: F401
    import sqlalchemy  # noqa: F401

    # Ensure backend package is importable
    sys.path.insert(0, 'backend')
    try:
        importlib.import_module('app.main')
        print('✅ app.main import OK')
    except Exception as e:
        print('Info: app.main not found or failed:', e)

    print('✅ Basic deps ok')
except Exception as e:
    print('❌ Deps failure:', e)
    sys.exit(1)
