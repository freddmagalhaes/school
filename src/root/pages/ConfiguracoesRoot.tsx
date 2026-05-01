import React, { useState, useEffect } from 'react';
import { Settings, Shield, Save, AlertTriangle, Info } from 'lucide-react';
import { useRootAuth } from '../../contexts/RootAuthContext';
import { supabase } from '../../lib/supabase';

interface SystemSettings {
  id: string;
  maintenance_mode: boolean;
  support_email: string;
  default_trial_days: number;
}

export const ConfiguracoesRoot = () => {
  const { isRoot } = useRootAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Formulário: Gerais
  const [supportEmail, setSupportEmail] = useState('');
  const [trialDays, setTrialDays] = useState<number>(14);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setSettings(data);
      setSupportEmail(data.support_email);
      setTrialDays(data.default_trial_days);
      setMaintenanceMode(data.maintenance_mode);
    } else {
      console.error('Erro ao carregar configurações do sistema:', error);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRoot || !settings) return;

    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    const { error } = await supabase
      .from('system_settings')
      .update({
        support_email: supportEmail,
        default_trial_days: trialDays,
        maintenance_mode: maintenanceMode
      })
      .eq('id', settings.id);

    if (error) {
      setErrorMsg('Erro ao salvar as configurações: ' + error.message);
    } else {
      setSuccessMsg('Configurações do sistema atualizadas com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings size={22} className="text-amber-500 dark:text-amber-400" /> Configurações Globais
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Parâmetros do sistema EduGestão Pro aplicados a todos os clientes.
        </p>
      </div>

      {!isRoot && (
        <div className="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20 text-amber-800 dark:text-amber-300 rounded-lg p-4 flex items-start gap-3 shadow-sm">
          <AlertTriangle size={20} className="mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">Acesso Restrito</h3>
            <p className="text-sm mt-1">Você está acessando como <b>Super Admin</b>. Somente o perfil dono (Root) possui permissão para modificar as configurações do sistema.</p>
          </div>
        </div>
      )}

      {/* Formulário Principal */}
      <form onSubmit={handleSave} className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="p-6 space-y-8">
          
          {/* Seção 1: Geral */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-[#1e2d4a] pb-2 mb-4">
              Parâmetros Gerais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  E-mail de Suporte Padrão
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  disabled={!isRoot || loading}
                  className="w-full bg-white dark:bg-[#141c2e] border border-gray-300 dark:border-[#2a3f6a] text-gray-900 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dias de Trial (Novos Clientes)
                </label>
                <input
                  type="number"
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                  disabled={!isRoot || loading}
                  min={1}
                  className="w-full bg-white dark:bg-[#141c2e] border border-gray-300 dark:border-[#2a3f6a] text-gray-900 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Sistema */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-[#1e2d4a] pb-2 mb-4 flex items-center gap-2">
              <Shield size={18} className="text-violet-500" /> Controle de Acesso e Sistema
            </h3>
            
            <div className="bg-red-50 dark:bg-red-400/5 border border-red-100 dark:border-red-400/20 rounded-xl p-5 flex items-start gap-4">
              <div className="pt-1">
                <input
                  type="checkbox"
                  id="maintenance_mode"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  disabled={!isRoot || loading}
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300 dark:border-gray-600 dark:bg-[#141c2e] disabled:opacity-50 cursor-pointer"
                />
              </div>
              <div>
                <label htmlFor="maintenance_mode" className="font-bold text-red-800 dark:text-red-400 block cursor-pointer">
                  Modo de Manutenção
                </label>
                <p className="text-sm text-red-600 dark:text-red-300/80 mt-1">
                  Ao ativar esta opção, o sistema do cliente (`/app`) ficará indisponível e exibirá uma tela de manutenção. Use com extrema cautela apenas durante atualizações críticas do banco de dados.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer (Ações) */}
        <div className="bg-gray-50 dark:bg-[#141c2e] px-6 py-4 flex items-center justify-between border-t border-gray-100 dark:border-[#1e2d4a]">
          <div>
            {successMsg && <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{successMsg}</span>}
            {errorMsg && <span className="text-sm font-medium text-red-600 dark:text-red-400">{errorMsg}</span>}
          </div>
          
          {isRoot && (
            <button
              type="submit"
              disabled={saving || loading}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : <><Save size={18} /> Salvar Parâmetros</>}
            </button>
          )}
        </div>
      </form>

      {/* Info de versão (Read Only) */}
      <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-6 shadow-sm dark:shadow-none transition-colors mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-400/10 border border-blue-400/20 rounded-xl flex items-center justify-center">
            <Info size={18} className="text-blue-500 dark:text-blue-400" />
          </div>
          <h2 className="font-bold text-gray-900 dark:text-white">Informações do Ambiente</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'Sistema',   value: 'EduGestão Pro' },
            { label: 'Versão',    value: '1.0.0 (alpha)' },
            { label: 'Ambiente',  value: 'Produção' },
            { label: 'Banco',     value: 'Supabase PostgreSQL' },
            { label: 'Hospedagem', value: 'AWS EC2 + Elastic IP' },
            { label: 'Frontend',  value: 'React 19 + Vite' },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col p-3 bg-gray-50 dark:bg-[#141c2e] border border-gray-50 dark:border-[#1e2d4a] rounded-xl">
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
              <span className="text-gray-900 dark:text-gray-200 font-medium mt-1">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
