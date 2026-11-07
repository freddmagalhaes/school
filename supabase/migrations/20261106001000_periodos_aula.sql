-- Tempos de aula da escola, por turno (1º horário 07:00-07:50, 2º 07:50-08:40, ...).
-- Servem para lançar a grade escolhendo "1º horário" em vez de digitar horas.
-- A grade (horarios_aula) continua guardando as horas, não o número do horário: mudar os tempos depois não mexe nas aulas já lançadas.
-- Idempotente.
CREATE TABLE IF NOT EXISTS public.periodos_aula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turno text NOT NULL,                       -- o mesmo texto de turmas.turno
  ordem smallint NOT NULL CHECK (ordem BETWEEN 1 AND 20),
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL,
  created_at timestamptz DEFAULT now(),
  CHECK (hora_fim > hora_inicio),
  UNIQUE (escola_id, turno, ordem)
);

ALTER TABLE public.periodos_aula ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.periodos_aula FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodos_aula TO authenticated;

DROP POLICY IF EXISTS periodos_select ON public.periodos_aula;
CREATE POLICY periodos_select ON public.periodos_aula FOR SELECT
  USING (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria', 'Professor'));
DROP POLICY IF EXISTS periodos_write ON public.periodos_aula;
CREATE POLICY periodos_write ON public.periodos_aula FOR ALL
  USING (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria'))
  WITH CHECK (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria'));
DROP POLICY IF EXISTS root_gerencia_periodos_aula ON public.periodos_aula;
CREATE POLICY root_gerencia_periodos_aula ON public.periodos_aula FOR ALL
  USING (public.is_root_owner()) WITH CHECK (public.is_root_owner());
