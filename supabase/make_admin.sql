-- Concede permissão de Root Admin para o e-mail específico
INSERT INTO public.root_admins (id, nome, email, role, is_root, is_active)
SELECT 
  id, 
  'Administrador', 
  email, 
  'root', 
  true, 
  true
FROM auth.users
WHERE email = 'fredericog2009@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET 
  is_root = true, 
  is_active = true, 
  role = 'root';
