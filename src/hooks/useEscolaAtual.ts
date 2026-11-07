import { useState, useEffect, useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface EscolaSimples {
  id: string;
  nome: string;
}

// Escola escolhida pelo Root (que não é membro de nenhuma). É UMA só para o app inteiro: todas as abas e telas
// leem o mesmo valor, então trocar de aba não permite cadastrar numa escola diferente da que está na tela.
// Fica guardada só na aba do navegador (sessionStorage) e some ao sair.
const CHAVE = 'escola_root_id';
let escolaRoot: string | null = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(CHAVE) : null;
const ouvintes = new Set<() => void>();
const definirEscolaRoot = (id: string | null) => {
  escolaRoot = id || null;
  if (id) sessionStorage.setItem(CHAVE, id); else sessionStorage.removeItem(CHAVE);
  ouvintes.forEach(f => f());
};
const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };

/**
 * Hook que resolve o escola_id de forma inteligente:
 * - Se houver escolaAtiva (usuário normal vinculado à escola), usa ela.
 * - Se for Root sem escolaAtiva, busca todas as escolas e deixa o Root selecionar (escolha compartilhada).
 */
export function useEscolaAtual() {
  const { escolaAtiva, isSystemRoot } = useAuth();

  const [escolas, setEscolas] = useState<EscolaSimples[]>([]);
  const escolaRootId = useSyncExternalStore(assinar, () => escolaRoot);
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
    const lista = data || [];
    setEscolas(lista);
    // Seleção guardada de uma escola que não existe mais: descarta. Só uma escola: já escolhe.
    if (escolaRoot && !lista.some(e => e.id === escolaRoot)) definirEscolaRoot(null);
    if (lista.length === 1) definirEscolaRoot(lista[0].id);
    setLoading(false);
  };

  return {
    escolaId,
    isSystemRoot,
    // Apenas relevante quando Root sem vínculo
    precisaSelecionarEscola: isSystemRoot && !escolaAtiva && !escolaRootId,
    // O Root sem vínculo vê o seletor sempre, para poder trocar de escola de propósito
    mostrarSeletorRoot: isSystemRoot && !escolaAtiva,
    escolas,
    escolaRootId,
    setEscolaRootId: definirEscolaRoot,
    loadingEscolas: loading,
  };
}
