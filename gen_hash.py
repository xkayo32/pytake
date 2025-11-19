#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/administrator/pytake/backend')

from app.core.security import hash_password, verify_password

password = "admin123"
hashed = hash_password(password)

print(f"Password: {password}")
print(f"Hashed: {hashed}")

# Verify
verify_result = verify_password(password, hashed)
print(f"Verify: {verify_result}")
