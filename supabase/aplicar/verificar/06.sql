-- Passo 6 (a). Esperado:
--   anon           | INSERT | 2    (assinaturas e contatos)
--   authenticated  | DELETE, INSERT, SELECT, UPDATE | uma linha cada, com o mesmo número de tabelas (21)
--   e NENHUMA linha com TRUNCATE, TRIGGER ou REFERENCES
select grantee, privilege_type, count(*) as tabelas
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by grantee, privilege_type order by grantee, privilege_type;
