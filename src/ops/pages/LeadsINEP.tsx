import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Building, CheckCircle, Mail, MapPin, KeyRound, User } from 'lucide-react';

interface LeadINEP {
  id: string;
  codigo_inep: string;
  nome_escola: string;
  uf: string;
  municipio: string;
  dependencia_adm: string;
  localizacao: string;
  status: string;
import { formatarCNPJ, formatarCPF, validarCNPJ, validarCPF } from '../../utils/validators';

export const LeadsINEP: React.FC = () => {
  const [leads, setLeads] = useState<LeadINEP[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Pendente');
  const [page, setPage] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const ITEMS_PER_PAGE = 50;

  // Conversão
  const [leadSelecionado, setLeadSelecionado] = useState<LeadINEP | null>(null);
  const [formConversao, setFormConversao] = useState({
    cnpj: '',
    nomeGestor: '',
    cpfGestor: '',
    emailGestor: ''
  });
  const [convertendo, setConvertendo] = useState(false);

  // Ao trocar aba ou digitar, reseta a paginação
  useEffect(() => {
    setPage(1);
  }, [filtroStatus]); // A busca manual já reseta no handleSearch

  useEffect(() => {
    carregarLeads();
  }, [filtroStatus, page]);

  const carregarLeads = async () => {
    setLoading(true);
    let query = supabase
      .from('crm_leads_escolas')
      .select('*', { count: 'exact' })
      .eq('status', filtroStatus);

    if (searchTerm) {
      query = query.ilike('nome_escola', `%${searchTerm}%`);
    }

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (!error && data) {
      setLeads(data);
      if (count !== null) setTotalLeads(count);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    carregarLeads();
  };

  const abrirModalConversao = (lead: LeadINEP) => {
    setLeadSelecionado(lead);
    setFormConversao({ cnpj: '', nomeGestor: '', cpfGestor: '', emailGestor: '' });
  };

  const fecharModal = () => {
    setLeadSelecionado(null);
  };

  const converterLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadSelecionado) return;
    
    setConvertendo(true);

    if (!validarCNPJ(formConversao.cnpj)) {
      alert('O CNPJ informado é inválido. Por favor, verifique.');
      setConvertendo(false);
      return;
    }

    if (!validarCPF(formConversao.cpfGestor)) {
      alert('O CPF do gestor é inválido. Por favor, verifique.');
      setConvertendo(false);
      return;
    }

    try {
      // 1. Criar a Escola
      const { data: escolaData, error: escolaError } = await supabase
        .from('escolas')
        .insert({
          nome: leadSelecionado.nome_escola,
          cnpj: formConversao.cnpj,
          telefone: leadSelecionado.telefone || null
        })
        .select()
        .single();

      if (escolaError || !escolaData) throw new Error('Erro ao criar escola: ' + (escolaError?.message || ''));

      // 2. Criar Usuário Root (Diretor) via Edge Function
      const { data: funcData, error: funcError } = await supabase.functions.invoke('create-school-user', {
        body: {
          email: formConversao.emailGestor,
          nome: formConversao.nomeGestor,
          cpf: formConversao.cpfGestor,
          escolaId: escolaData.id,
          papel: 'Diretor'
        }
      });

      if (funcError) throw new Error('Erro ao criar usuário: ' + funcError.message);

      // 3. Atualizar o Lead
      await supabase
        .from('crm_leads_escolas')
        .update({ 
          status: 'Convertido',
          escola_id: escolaData.id
        })
        .eq('id', leadSelecionado.id);

      alert(`Escola ${escolaData.nome} ativada com sucesso! Um e-mail com a senha foi enviado para ${formConversao.emailGestor}.`);
      fecharModal();
      carregarLeads();

    } catch (err: any) {
      alert(err.message || 'Ocorreu um erro na conversão.');
    } finally {
      setConvertendo(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Leads INEP (CRM)</h2>
          <p className="text-sm text-gray-500">Base de prospecção de escolas mapeadas no Censo Escolar.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0e1425] p-4 rounded-xl border border-gray-100 dark:border-[#1e2d4a] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 w-full flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome da escola..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[#2a3f5f] rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium rounded-lg text-sm transition-colors">
            Buscar
          </button>
        </form>
        
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-[#2a3f5f] rounded-lg text-sm bg-white dark:bg-[#0a0f1e] text-gray-900 dark:text-gray-100"
          >
            <option value="Pendente">Apenas Pendentes (Não Clientes)</option>
            <option value="Convertido">Já Convertidos (Clientes)</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0e1425] rounded-xl border border-gray-100 dark:border-[#1e2d4a] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-white/5 border-b dark:border-[#1e2d4a]">
              <tr>
                <th className="px-6 py-4 font-semibold">INEP</th>
                <th className="px-6 py-4 font-semibold">Nome da Escola</th>
                <th className="px-6 py-4 font-semibold">Localidade</th>
                <th className="px-6 py-4 font-semibold">Dependência</th>
                <th className="px-6 py-4 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Buscando leads no banco...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum lead encontrado com esses filtros.</td></tr>
              ) : (
                leads.map(lead => (
                  <tr key={lead.id} className="border-b dark:border-[#1e2d4a] last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-500 dark:text-gray-400">{lead.codigo_inep}</td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">{lead.nome_escola}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <MapPin size={14} /> {lead.municipio} - {lead.uf}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {lead.dependencia_adm}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {lead.status === 'Convertido' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-lg">
                          <CheckCircle size={14} /> Cliente
                        </span>
                      ) : (
                        <button 
                          onClick={() => abrirModalConversao(lead)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          Ativar Cliente
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* PAGINAÇÃO */}
        <div className="p-4 border-t border-gray-100 dark:border-[#1e2d4a] flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5">
          <div>
            Mostrando <span className="font-semibold text-gray-900 dark:text-gray-100">{leads.length}</span> de <span className="font-semibold text-gray-900 dark:text-gray-100">{totalLeads}</span> escolas
          </div>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border border-gray-300 dark:border-[#2a3f5f] rounded-lg hover:bg-white dark:hover:bg-[#1e2d4a] disabled:opacity-50 transition-colors font-medium text-gray-700 dark:text-gray-300 shadow-sm"
            >
              Anterior
            </button>
            <button 
              disabled={page * ITEMS_PER_PAGE >= totalLeads}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-gray-300 dark:border-[#2a3f5f] rounded-lg hover:bg-white dark:hover:bg-[#1e2d4a] disabled:opacity-50 transition-colors font-medium text-gray-700 dark:text-gray-300 shadow-sm"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {leadSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0e1425] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border dark:border-[#1e2d4a]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1e2d4a] flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20">
              <div>
                <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-300">Converter em Cliente</h2>
                <p className="text-xs text-indigo-700 dark:text-indigo-400/80">Injetar escola no banco oficial do SaaS.</p>
              </div>
              <button onClick={fecharModal} className="text-indigo-400 dark:text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={converterLead} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-[#2a3f5f] rounded-xl mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Escola Selecionada:</p>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2"><Building size={16} className="text-gray-400 dark:text-gray-500" /> {leadSelecionado.nome_escola}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{leadSelecionado.municipio} - {leadSelecionado.uf}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNPJ da Escola</label>
                <input
                  required
                  value={formConversao.cnpj}
                  onChange={e => setFormConversao({...formConversao, cnpj: formatarCNPJ(e.target.value)})}
                  className="w-full p-2.5 border border-gray-300 dark:border-[#2a3f5f] rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-[#0a0f1e] text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>

              <div className="border-t border-gray-100 dark:border-[#1e2d4a] pt-4 mt-2">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Dados do Gestor (1º Acesso)</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1"><User size={14}/> Nome do Gestor</label>
                    <input
                      required
                      value={formConversao.nomeGestor}
                      onChange={e => setFormConversao({...formConversao, nomeGestor: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 dark:border-[#2a3f5f] rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-[#0a0f1e] text-gray-900 dark:text-gray-100 placeholder-gray-400"
                      placeholder="Nome completo do diretor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1"><KeyRound size={14}/> CPF do Gestor</label>
                    <input
                      required
                      value={formConversao.cpfGestor}
                      onChange={e => setFormConversao({...formConversao, cpfGestor: formatarCPF(e.target.value)})}
                      className="w-full p-2.5 border border-gray-300 dark:border-[#2a3f5f] rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-[#0a0f1e] text-gray-900 dark:text-gray-100 placeholder-gray-400"
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1"><Mail size={14}/> E-mail do Gestor</label>
                    <input
                      required
                      type="email"
                      value={formConversao.emailGestor}
                      onChange={e => setFormConversao({...formConversao, emailGestor: e.target.value})}
                      className="w-full p-2.5 border border-gray-300 dark:border-[#2a3f5f] rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm bg-white dark:bg-[#0a0f1e] text-gray-900 dark:text-gray-100 placeholder-gray-400"
                      placeholder="diretor@escola.com.br"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Uma senha provisória será enviada para este e-mail.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={fecharModal} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-[#2a3f5f] text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={convertendo} 
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-70 flex items-center gap-2 shadow-sm"
                >
                  {convertendo ? 'Criando Conta...' : 'Ativar e Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
