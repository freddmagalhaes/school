import { supabase } from './supabase';

export const registrarLogAuditoria = async (escolaId: string, acao: string, detalhes: Record<string, any> = {}) => {
  try {
    const { error } = await supabase.rpc('log_audit', {
      p_escola_id: escolaId,
      p_acao: acao,
      p_detalhes: detalhes
    });
    
    if (error) {
      console.error('Falha ao registrar log de auditoria:', error);
    }
  } catch (err) {
    console.error('Exceção ao registrar log de auditoria:', err);
  }
};
