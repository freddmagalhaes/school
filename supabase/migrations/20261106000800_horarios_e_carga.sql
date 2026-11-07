-- Grade de horários, conflito de horário (inclusive entre escolas) e carga horária contratada.
-- Idempotente: pode ser executada mais de uma vez.

-- ============ Carga horária contratada por vínculo (horas por semana, em cada escola) ============
ALTER TABLE public.membros_escola
  ADD COLUMN IF NOT EXISTS carga_horaria_semanal smallint
  CHECK (carga_horaria_semanal IS NULL OR carga_horaria_semanal BETWEEN 0 AND 80);

-- ============ Grade: uma linha = uma aula (turma + disciplina + professor + dia + hora) ============
CREATE TABLE IF NOT EXISTS public.horarios_aula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  disciplina_id uuid NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),   -- 1 = segunda ... 6 = sábado, 7 = domingo
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL,
  created_at timestamptz DEFAULT now(),
  CHECK (hora_fim > hora_inicio)
);
CREATE INDEX IF NOT EXISTS idx_horarios_escola_turma ON public.horarios_aula (escola_id, turma_id);
CREATE INDEX IF NOT EXISTS idx_horarios_professor_dia ON public.horarios_aula (professor_id, dia_semana);

-- Validações de cada aula. SECURITY DEFINER para enxergar as outras escolas: o RLS esconde os dados de lá,
-- e a mensagem de conflito entre escolas nunca diz qual escola nem qual turma.
CREATE OR REPLACE FUNCTION public.horarios_aula_valida() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_turma public.turmas%ROWTYPE;
  v_outra text;
BEGIN
  SELECT * INTO v_turma FROM public.turmas WHERE id = NEW.turma_id;
  IF v_turma.id IS NULL OR v_turma.escola_id <> NEW.escola_id THEN
    RAISE EXCEPTION 'A turma não pertence a esta escola.' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.disciplinas WHERE id = NEW.disciplina_id AND escola_id = NEW.escola_id) THEN
    RAISE EXCEPTION 'A disciplina não pertence a esta escola.' USING ERRCODE = '23514';
  END IF;
  -- O professor precisa estar atribuído a essa turma e disciplina (tela Gestão de Turmas)
  IF NOT EXISTS (SELECT 1 FROM public.turma_professores
                 WHERE turma_id = NEW.turma_id AND professor_id = NEW.professor_id AND disciplina_id = NEW.disciplina_id) THEN
    RAISE EXCEPTION 'O professor não está atribuído a esta turma e disciplina. Atribua primeiro em Gestão de Turmas.' USING ERRCODE = '23514';
  END IF;

  -- Serializa as verificações concorrentes (duas pessoas gravando ao mesmo tempo)
  PERFORM pg_advisory_xact_lock(hashtextextended('prof:' || NEW.professor_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('turma:' || NEW.turma_id::text, 0));

  -- A turma não pode ter duas aulas ao mesmo tempo
  IF EXISTS (SELECT 1 FROM public.horarios_aula h
             WHERE h.turma_id = NEW.turma_id AND h.dia_semana = NEW.dia_semana
               AND h.id IS DISTINCT FROM NEW.id
               AND h.hora_inicio < NEW.hora_fim AND NEW.hora_inicio < h.hora_fim) THEN
    RAISE EXCEPTION 'A turma já tem aula neste horário.' USING ERRCODE = '23P01';
  END IF;

  -- O professor não pode estar em duas aulas ao mesmo tempo na mesma escola (diz qual turma)
  SELECT t.nome INTO v_outra
  FROM public.horarios_aula h JOIN public.turmas t ON t.id = h.turma_id
  WHERE h.professor_id = NEW.professor_id AND h.escola_id = NEW.escola_id AND h.dia_semana = NEW.dia_semana
    AND t.ano_letivo = v_turma.ano_letivo AND h.id IS DISTINCT FROM NEW.id
    AND h.hora_inicio < NEW.hora_fim AND NEW.hora_inicio < h.hora_fim
  LIMIT 1;
  IF v_outra IS NOT NULL THEN
    RAISE EXCEPTION 'O professor já tem aula neste horário nesta escola (turma %).', v_outra USING ERRCODE = '23P01';
  END IF;

  -- ... nem em outra escola (sem revelar qual)
  IF EXISTS (SELECT 1 FROM public.horarios_aula h JOIN public.turmas t ON t.id = h.turma_id
             WHERE h.professor_id = NEW.professor_id AND h.escola_id <> NEW.escola_id AND h.dia_semana = NEW.dia_semana
               AND t.ano_letivo = v_turma.ano_letivo
               AND h.hora_inicio < NEW.hora_fim AND NEW.hora_inicio < h.hora_fim) THEN
    RAISE EXCEPTION 'O professor já tem aula neste horário em outra escola.' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_horarios_aula_valida ON public.horarios_aula;
CREATE TRIGGER trg_horarios_aula_valida
  BEFORE INSERT OR UPDATE ON public.horarios_aula
  FOR EACH ROW EXECUTE FUNCTION public.horarios_aula_valida();

-- Se a atribuição professor × turma × disciplina for removida, as aulas da grade dela saem junto
CREATE OR REPLACE FUNCTION public.horarios_aula_limpa() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.horarios_aula
  WHERE turma_id = OLD.turma_id AND professor_id = OLD.professor_id AND disciplina_id = OLD.disciplina_id;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_horarios_aula_limpa ON public.turma_professores;
CREATE TRIGGER trg_horarios_aula_limpa
  AFTER DELETE ON public.turma_professores
  FOR EACH ROW EXECUTE FUNCTION public.horarios_aula_limpa();

-- ============ Permissões ============
ALTER TABLE public.horarios_aula ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.horarios_aula FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horarios_aula TO authenticated;

DROP POLICY IF EXISTS horarios_select ON public.horarios_aula;
CREATE POLICY horarios_select ON public.horarios_aula FOR SELECT
  USING (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria', 'Professor'));
DROP POLICY IF EXISTS horarios_write ON public.horarios_aula;
CREATE POLICY horarios_write ON public.horarios_aula FOR ALL
  USING (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria'))
  WITH CHECK (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria'));
DROP POLICY IF EXISTS root_le_horarios ON public.horarios_aula;
CREATE POLICY root_le_horarios ON public.horarios_aula FOR SELECT USING (public.is_root_owner());
