import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, Building2, Mail, Phone,
  FileText, Calendar, CreditCard, AlertCircle, Save,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatarCPF, validarCPF } from '../../utils/validators';

type Assinatura = {
  id: string;
  nome: string;
  email: string;
  documento?: string;
  telefone?: string;
  nome_escola: string;
  plano: string;
  ciclo: string;
  metodo_pgto: string;
  valor_total: number;
  status: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  escola_id?: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  ativo:        { label: 'Ativo',        classes: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  pendente:     { label: 'Pendente',     classes: 'bg-rose-400/10 text-rose-400 border-rose-400/20' },
  cancelado:    { label: 'Cancelado',    classes: 'bg-gray-400/10 text-gray-400 border-gray-400/20' },
  inadimplente: { label: 'Inadimplente', classes: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
};

export const ClienteDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Assinatura | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [obs, setObs] = useState('');
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null);
  const [ehExemplo, setEhExemplo] = useState(false);
  const [novaEscola, setNovaEscola] = useState({ cnpj: '', telefone: '', adminNome: '', adminEmail: '', adminCpf: '' });
  const [criandoEscola, setCriandoEscola] = useState(false);

  useEffect(() => {
    const fetchCliente = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('id', id)
        .single();
      if (data) {
        setCliente(data);
        setObs(data.observacoes || '');
      } else {
        // Mock para desenvolvimento
        const mock: Assinatura = {
          id: id || '1',
          nome: 'Cliente Exemplo', email: 'contato@escolaexemplo.com', documento: '00.000.000/0001-00',
          telefone: '(00) 00000-0000', nome_escola: 'Escola Modelo de Exemplo',
          plano: 'profissional', ciclo: 'mensal', metodo_pgto: 'pix',
          valor_total: 397, status: 'pendente', observacoes: '',
          created_at: '2026-04-20T10:00:00Z', updated_at: '2026-04-20T10:00:00Z',
        };
        setCliente(mock);
        setEhExemplo(true);
        setObs(mock.observacoes || '');
      }
      setLoading(false);
    };
    fetchCliente();
  }, [id]);

  const mudarStatus = async (novoStatus: string) => {
    setSalvando(true);
    const { error } = await supabase
      .from('assinaturas')
      .update({ status: novoStatus })
      .eq('id', id);
    if (error) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao atualizar status.' });
    } else {
      setCliente(prev => prev ? { ...prev, status: novoStatus } : prev);
      setFeedback({ tipo: 'ok', msg: `Status alterado para "${novoStatus}" com sucesso!` });
    }
    setSalvando(false);
    setTimeout(() => setFeedback(null), 3000);
  };

  const criarEscola = async () => {
    if (!cliente) return;
    const cnpj = novaEscola.cnpj.trim();
    if (!cnpj || cnpj.length > 18) { setFeedback({ tipo: 'erro', msg: 'Informe o CNPJ da escola (até 18 caracteres).' }); return; }
    if (!novaEscola.adminNome.trim() || !novaEscola.adminEmail.trim()) { setFeedback({ tipo: 'erro', msg: 'Informe nome e e-mail do administrador da escola.' }); return; }
    if (!validarCPF(novaEscola.adminCpf)) { setFeedback({ tipo: 'erro', msg: 'CPF do administrador inválido.' }); return; }

    setCriandoEscola(true);
    setFeedback(null);
    // 1) cria a escola
    const { data: escola, error: errEscola } = await supabase
      .from('escolas')
      .insert({ nome: cliente.nome_escola, cnpj, telefone: novaEscola.telefone.trim() || null })
      .select('id')
      .single();
    if (errEscola || !escola) {
      setFeedback({ tipo: 'erro', msg: errEscola?.code === '23505' ? 'Já existe uma escola com este CNPJ.' : `Não foi possível criar a escola: ${errEscola?.message ?? 'erro desconhecido'}` });
      setCriandoEscola(false);
      return;
    }
    // 2) liga a escola à assinatura
    const { error: errLink } = await supabase.from('assinaturas').update({ escola_id: escola.id }).eq('id', cliente.id);
    if (errLink) {
      setFeedback({ tipo: 'erro', msg: `Escola criada, mas não foi possível ligá-la à assinatura: ${errLink.message}. Crie o administrador em Usuários.` });
      setCriandoEscola(false);
      return;
    }
    setCliente({ ...cliente, escola_id: escola.id });
    // 3) cria o primeiro Admin (a função envia o e-mail de primeiro acesso)
    const { data, error: errAdmin } = await supabase.functions.invoke('create-school-user', {
      body: { escola_id: escola.id, nome: novaEscola.adminNome.trim(), email: novaEscola.adminEmail.trim(), cpf: novaEscola.adminCpf, papel: 'Admin', tipo_vinculo: 'Efetivo' },
    });
    if (errAdmin || data?.error) {
      setFeedback({ tipo: 'erro', msg: `Escola criada, mas o administrador não foi criado (${data?.error ?? errAdmin?.message}). Crie-o em Usuários, escolhendo esta escola.` });
    } else if (data?.email_enviado === false) {
      setFeedback({ tipo: 'ok', msg: `Escola e administrador criados, mas o e-mail não foi enviado. Peça para usar "Esqueci minha senha" com ${novaEscola.adminEmail}.` });
    } else {
      setFeedback({ tipo: 'ok', msg: `Escola criada! Um e-mail de primeiro acesso foi enviado para ${novaEscola.adminEmail}.` });
    }
    setCriandoEscola(false);
  };

  const salvarObs = async () => {
    setSalvando(true);
    const { error } = await supabase
      .from('assinaturas')
      .update({ observacoes: obs })
      .eq('id', id);
    if (error) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao salvar observações.' });
    } else {
      setFeedback({ tipo: 'ok', msg: 'Observações salvas!' });
    }
    setSalvando(false);
    setTimeout(() => setFeedback(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="text-center py-20 text-gray-400">
        <AlertCircle size={40} className="mx-auto mb-3 text-rose-400" />
        Cliente não encontrado.
      </div>
    );
  }

  const statusC = STATUS_CONFIG[cliente.status] || STATUS_CONFIG.pendente;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/ops/clientes')}
          className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{cliente.nome_escola}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{cliente.nome} · {cliente.email}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${statusC.classes}`}>
          {statusC.label}
        </span>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm font-medium ${
          feedback.tipo === 'ok'
            ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
            : 'bg-rose-400/10 border-rose-400/20 text-rose-400'
        }`}>
          {feedback.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {feedback.msg}
        </div>
      )}


      {/* Escola do cliente */}
      <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-none">
        <h2 className="text-sm font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wider">Escola no sistema</h2>
        {cliente.escola_id ? (
          <p className="text-sm text-emerald-500 flex items-center gap-2"><CheckCircle2 size={16} /> Escola criada e ligada a esta assinatura.</p>
        ) : ehExemplo ? (
          <p className="text-sm text-gray-500">Este é um cliente de exemplo (não há assinaturas reais cadastradas). A criação de escola fica disponível para clientes reais.</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cria a escola <strong>{cliente.nome_escola}</strong> e o primeiro administrador, que recebe um e-mail para definir a senha.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { k: 'cnpj', label: 'CNPJ da escola *', ph: '00.000.000/0000-00' },
                { k: 'telefone', label: 'Telefone', ph: '(00) 00000-0000' },
                { k: 'adminNome', label: 'Nome do administrador *', ph: cliente.nome },
                { k: 'adminEmail', label: 'E-mail do administrador *', ph: cliente.email },
                { k: 'adminCpf', label: 'CPF do administrador *', ph: '000.000.000-00' },
              ].map(({ k, label, ph }) => (
                <label key={k} className="text-xs text-gray-500 space-y-1">
                  {label}
                  <input
                    value={(novaEscola as Record<string, string>)[k]}
                    onChange={e => setNovaEscola(prev => ({ ...prev, [k]: k === 'adminCpf' ? formatarCPF(e.target.value) : e.target.value }))}
                    placeholder={ph}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[#1e2d4a] rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-[#141c2e]"
                  />
                </label>
              ))}
            </div>
            <button
              onClick={criarEscola}
              disabled={criandoEscola}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl"
            >
              {criandoEscola ? 'Criando...' : 'Criar escola e enviar acesso'}
            </button>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dados do cliente */}
        <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-none">
          <h2 className="text-sm font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-4">Dados do Contato</h2>
          {[
            { icon: Building2, label: 'Escola', value: cliente.nome_escola },
            { icon: Mail,      label: 'E-mail', value: cliente.email },
            { icon: Phone,     label: 'Telefone', value: cliente.telefone || '—' },
            { icon: FileText,  label: 'CPF/CNPJ', value: cliente.documento || '—' },
            { icon: Calendar,  label: 'Assinatura em', value: new Date(cliente.created_at).toLocaleDateString('pt-BR') },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-50 dark:bg-[#141c2e] border border-gray-100 dark:border-[#1e2d4a] rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={14} className="text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dados da assinatura */}
        <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-6 space-y-4 shadow-sm dark:shadow-none">
          <h2 className="text-sm font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-4">Assinatura</h2>
          {[
            { icon: CreditCard, label: 'Plano', value: cliente.plano },
            { icon: Calendar,   label: 'Ciclo', value: cliente.ciclo },
            { icon: CreditCard, label: 'Pagamento', value: cliente.metodo_pgto },
            { icon: CreditCard, label: 'Valor total', value: `R$ ${cliente.valor_total.toLocaleString('pt-BR')}/${cliente.ciclo === 'anual' ? 'ano' : 'mês'}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-50 dark:bg-[#141c2e] border border-gray-100 dark:border-[#1e2d4a] rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={14} className="text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-gray-900 dark:text-gray-200 text-sm font-medium capitalize">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ações de status */}
      <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-6 shadow-sm dark:shadow-none">
        <h2 className="text-sm font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-4">Ações</h2>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={cliente.status === 'ativo' || salvando}
            onClick={() => mudarStatus('ativo')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-all"
          >
            <CheckCircle2 size={15} />
            Ativar Cliente
          </button>
          <button
            disabled={cliente.status === 'cancelado' || salvando}
            onClick={() => mudarStatus('cancelado')}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-400/10 text-rose-400 border border-rose-400/20 hover:bg-rose-400/20 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-all"
          >
            <XCircle size={15} />
            Cancelar Assinatura
          </button>
          <button
            disabled={cliente.status === 'inadimplente' || salvando}
            onClick={() => mudarStatus('inadimplente')}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-400/10 text-orange-400 border border-orange-400/20 hover:bg-orange-400/20 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-all"
          >
            <AlertCircle size={15} />
            Marcar Inadimplente
          </button>
          <a
            href={`https://wa.me/55${(cliente.telefone || '').replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(cliente.nome)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-[#141c2e] text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-[#1e2d4a] hover:border-amber-400/30 rounded-xl text-sm font-semibold transition-all"
          >
            <Phone size={15} />
            WhatsApp
          </a>
        </div>
      </div>

      {/* Observações internas */}
      <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-6 shadow-sm dark:shadow-none">
        <h2 className="text-sm font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-4">
          Observações Internas
        </h2>
        <textarea
          rows={4}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Notas sobre este cliente (visíveis apenas para a equipe interna)..."
          className="w-full bg-gray-50 dark:bg-[#141c2e] border border-gray-100 dark:border-[#1e2d4a] text-gray-900 dark:text-gray-300 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-amber-400/40 resize-none placeholder-gray-400 dark:placeholder-gray-600 transition-all"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={salvarObs}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 text-gray-900 font-bold rounded-xl text-sm transition-all"
          >
            <Save size={14} />
            {salvando ? 'Salvando...' : 'Salvar Observações'}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <Link to="/ops/clientes" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← Voltar para lista de clientes
        </Link>
      </div>
    </div>
  );
};
