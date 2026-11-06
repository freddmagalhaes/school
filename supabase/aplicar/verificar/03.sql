-- Passo 3: esperado = Admin, Diretor, Secretaria, Professor, Aluno, Subdiretor, Responsavel (Responsavel por último)
select string_agg(enumlabel, ', ' order by enumsortorder) as valores
from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'perfil_papel';
