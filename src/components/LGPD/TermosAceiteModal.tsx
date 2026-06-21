import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const TermosAceiteModal: React.FC = () => {
  const { user, setTermosAceitos } = useAuth();
  const [aceito, setAceito] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleAceitar = async () => {
    if (!user) return;
    setSalvando(true);
    setErro('');

    try {
      // Tenta atualizar no banco (pode afetar 0 linhas se perfil não existir, mas não gera erro 403 de INSERT)
      const { error } = await supabase
        .from('perfis')
        .update({ aceitou_termos_em: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      // Destranca a UI localmente sem precisar fazer fetch de novo
      setTermosAceitos();
    } catch (err: any) {
      setErro('Erro ao registrar o aceite. Tente novamente.');
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0e1425] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-[#1e2d4a]">
        <div className="bg-indigo-600 p-6 flex items-center gap-4 text-white">
          <ShieldCheck size={32} className="shrink-0" />
          <div>
            <h2 className="text-xl font-bold">Termos de Uso e Política de Privacidade</h2>
            <p className="text-indigo-100 text-sm">Atualização importante sobre Proteção de Dados (LGPD)</p>
          </div>
        </div>

        <div className="p-6">
          <div className="prose prose-sm max-w-none text-gray-600 dark:text-gray-300 mb-6 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-[#2a3f5f] h-64 overflow-y-auto">
            <h3 className="text-gray-900 dark:text-white font-bold mb-2">1. Coleta e Tratamento de Dados</h3>
            <p className="mb-4">Para fornecer nossos serviços educacionais, coletamos e processamos dados pessoais estritamente necessários, como nome, CPF e e-mail. Estes dados são tratados com o mais alto nível de segurança e estão de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
            
            <h3 className="text-gray-900 dark:text-white font-bold mb-2">2. Compartilhamento e Sigilo</h3>
            <p className="mb-4">Seus dados não são vendidos ou compartilhados com terceiros para fins publicitários. O acesso às informações dentro do sistema é restrito apenas a funcionários autorizados da instituição de ensino (diretores, secretários, professores), conforme a necessidade de suas funções.</p>
            
            <h3 className="text-gray-900 dark:text-white font-bold mb-2">3. Trilha de Auditoria</h3>
            <p className="mb-4">Para garantir a segurança de todos, o sistema registra logs de acesso e ações críticas. Quando um usuário com permissão visualiza um dado sensível (como o CPF de um aluno ou professor), essa ação é registrada de forma imutável em nossa base de dados para fins de auditoria e responsabilização (Accountability).</p>
            
            <h3 className="text-gray-900 dark:text-white font-bold mb-2">4. Seus Direitos</h3>
            <p>Você tem o direito de solicitar a correção de dados incompletos ou inexatos, bem como informações sobre com quais entidades seus dados foram compartilhados, entrando em contato direto com a secretaria da sua instituição.</p>
          </div>

          {erro && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {erro}
            </div>
          )}

          <label className="flex items-start gap-3 p-4 border border-indigo-100 dark:border-[#2a3f5f] rounded-xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-white/5 transition-colors group">
            <input 
              type="checkbox" 
              checked={aceito}
              onChange={(e) => setAceito(e.target.checked)}
              className="mt-1 w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
            />
            <div className="text-sm">
              <span className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">Eu li e concordo com os Termos de Uso e Política de Privacidade.</span>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">Ao continuar, declaro estar ciente de como meus dados serão tratados e compreendo as regras de segurança e auditoria da plataforma.</p>
            </div>
          </label>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-[#0a0f1e] border-t border-gray-100 dark:border-[#1e2d4a] flex justify-end gap-3">
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Sair do sistema
          </button>
          <button
            onClick={handleAceitar}
            disabled={!aceito || salvando}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {salvando ? 'Registrando Aceite...' : (
              <>
                <CheckCircle2 size={16} /> Continuar para o Sistema
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
