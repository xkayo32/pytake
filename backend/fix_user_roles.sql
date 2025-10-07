-- Fix user roles to match expected values
-- Run this if default users have incorrect roles

UPDATE users
SET role = 'org_admin'
WHERE email = 'admin@pytake.com' AND role != 'org_admin';

UPDATE users
SET role = 'agent'
WHERE email = 'agente@pytake.com' AND role != 'agent';

-- Verify
SELECT email, role, full_name
FROM users
WHERE email IN ('admin@pytake.com', 'agente@pytake.com')
ORDER BY email;
