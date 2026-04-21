import { Settings, Database, Globe, Shield, Info } from 'lucide-react';

export const ConfiguracoesRoot = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings size={22} className="text-amber-500 dark:text-amber-400" /> Configurações
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configurações globais do sistema EduGestão Pro</p>
      </div>

      {/* Info de versão */}
      <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-6 shadow-sm dark:shadow-none transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-center justify-center">
            <Info size={18} className="text-amber-500 dark:text-amber-400" />
          </div>
          <h2 className="font-bold text-gray-900 dark:text-white">Informações do Sistema</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Sistema',   value: 'EduGestão Pro' },
            { label: 'Versão',    value: '1.0.0 (alpha)' },
            { label: 'Ambiente',  value: 'Produção' },
            { label: 'Banco',     value: 'Supabase PostgreSQL' },
            { label: 'Hospedagem', value: 'AWS EC2 + Elastic IP' },
            { label: 'Frontend',  value: 'React 19 + Vite + TypeScript' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#141c2e] border border-gray-50 dark:border-[#1e2d4a] rounded-xl">
              <span className="text-gray-500 dark:text-gray-400">{label}</span>
              <span className="text-gray-900 dark:text-gray-200 font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Módulos (placeholder) */}
      {[
        { icon: Database, titulo: 'Banco de Dados', desc: 'Configurações de conexão, backup e manutenção do Supabase.', cor: 'blue' },
        { icon: Globe,    titulo: 'Domínio e SSL',  desc: 'Configuração do domínio, Nginx e certificado HTTPS via Certbot.', cor: 'emerald' },
        { icon: Shield,   titulo: 'Segurança',      desc: 'Políticas de senha, 2FA e auditoria de acessos ao backoffice.', cor: 'violet' },
      ].map(({ icon: Icon, titulo, desc, cor }) => (
        <div key={titulo} className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-6 opacity-60 shadow-sm dark:shadow-none transition-colors">
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-10 h-10 bg-${cor}-400/10 border border-${cor}-400/20 rounded-xl flex items-center justify-center`}>
              <Icon size={18} className={`text-${cor}-500 dark:text-${cor}-400`} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">{titulo}</h2>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">Em breve</span>
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 ml-13">{desc}</p>
        </div>
      ))}
    </div>
  );
};
