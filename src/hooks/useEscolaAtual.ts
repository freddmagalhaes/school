import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface EscolaSimples {
  id: string;
  nome: string;
}

/**
 * Hook que resolve o escola_id de forma inteligente:
 * - Se houver escolaAtiva (usuário normal vinculado à escola), usa ela.
 * - Se for Root sem escolaAtiva, busca todas as escolas e deixa o Root selecionar.
 */
export function useEscolaAtual() {
  const { escolaAtiva, isSystemRoot } = useAuth();

  const [escolas, setEscolas] = useState<EscolaSimples[]>([]);
  const [escolaRootId, setEscolaRootId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // O escola_id efetivo: vem do contexto normal OU da seleção manual do Root
  const escolaId = escolaAtiva?.escola_id ?? escolaRootId ?? null;

  useEffect(() => {
    if (isSystemRoot && !escolaAtiva) {
      fetchTodasEscolas();
    }
  }, [isSystemRoot, escolaAtiva]);

  const fetchTodasEscolas = async () => {
    setLoading(true);
    const { data } = await supabase.from('escolas').select('id, nome').order('nome');
    setEscolas(data || []);
    // Auto-seleciona a primeira escola se houver apenas uma
    if (data && data.length === 1) setEscolaRootId(data[0].id);
    setLoading(false);
  };

  return {
    escolaId,
    isSystemRoot,
    // Apenas relevante quando Root sem vínculo
    precisaSelecionarEscola: isSystemRoot && !escolaAtiva && !escolaRootId,
    escolas,
    escolaRootId,
    setEscolaRootId,
    loadingEscolas: loading,
  };
}
