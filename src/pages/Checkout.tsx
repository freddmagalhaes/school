import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  QrCode,
  FileText,
  ShieldCheck,
  Star,
  Building2,
  BookOpen,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

// ============================================================
// Definição dos planos (espelho do Home.tsx)
// ============================================================
const PLANOS: Record<string, {
  id: string;
  nome: string;
  precoMensal: number;
  precoAnual: number;
  icone: React.ElementType;
  recursos: string[];
}> = {
  basico: {
    id: 'basico',
    nome: 'Básico',
    precoMensal: 197,
    precoAnual: 1970,
    icone: BookOpen,
    recursos: ['1 escola', 'Até 5 usuários', 'Suporte por e-mail'],
  },
  profissional: {
    id: 'profissional',
    nome: 'Profissional',
    precoMensal: 397,
    precoAnual: 3970,
    icone: Star,
    recursos: ['Até 3 escolas', 'Até 20 usuários', 'Suporte WhatsApp + E-mail'],
  },
  enterprise: {
    id: 'enterprise',
    nome: 'Enterprise',
    precoMensal: 797,
    precoAnual: 7970,
    icone: Building2,
    recursos: ['Escolas ilimitadas', 'Usuários ilimitados', 'Suporte 24/7 prioritário'],
  },
};

// ============================================================
// Tipo para os dados do cliente
// ============================================================
type DadosCliente = {
  nome: string;
  email: string;
  documento: string;
  escola: string;
  telefone: string;
};

// ============================================================
// Tipo de método de pagamento
// ============================================================
type Metodo = 'pix' | 'cartao' | 'boleto' | null;

// ============================================================
// Componente principal do Checkout
// ============================================================
export const Checkout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const planoId = searchParams.get('plano') || 'profissional';
  const ciclo = (searchParams.get('ciclo') || 'mensal') as 'mensal' | 'anual';

  const plano = PLANOS[planoId] || PLANOS.profissional;
  const preco = ciclo === 'mensal' ? plano.precoMensal : Math.round(plano.precoAnual / 12);
  const precoTotal = ciclo === 'anual' ? plano.precoAnual : plano.precoMensal;

  // Controle de steps: 1 = Resumo, 2 = Dados, 3 = Pagamento, 4 = Confirmação
  const [step, setStep] = useState(1);
  const [dados, setDados] = useState<DadosCliente>({
    nome: '',
    email: '',
    documento: '',
    escola: '',
    telefone: '',
  });
  const [metodo, setMetodo] = useState<Metodo>(null);
  const [processando, setProcessando] = useState(false);
  // Guardamos qualquer erro de gravação para exibir ao usuário
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

  const IconePlano = plano.icone;

  // Grava a assinatura no Supabase e avança para a tela de confirmação
  const handleCheckout = async () => {
    if (!metodo) return;
    setProcessando(true);
    setErroSalvar(null);

    const { error } = await supabase.from('assinaturas').insert({
      nome:        dados.nome,
      email:       dados.email,
      documento:   dados.documento || null,
      telefone:    dados.telefone  || null,
      nome_escola: dados.escola,
      plano:       plano.id  as 'basico' | 'profissional' | 'enterprise',
      ciclo:       ciclo,
      metodo_pgto: metodo,
      valor_total: precoTotal,
      status:      'pendente',
      // TODO: Quando o Mercado Pago estiver integrado, atualizar o status
      // para 'ativo' após confirmação do webhook de pagamento.
    });

    setProcessando(false);

    if (error) {
      console.error('[EduGestão Pro] Erro ao salvar assinatura:', error);
      setErroSalvar(
        'Não foi possível registrar sua assinatura. Tente novamente ou entre em contato via WhatsApp.'
      );
      return;
    }

    // Sucesso: avança para a tela de confirmação
    setStep(4);
  };

  const passos = ['Plano', 'Seus dados', 'Pagamento', 'Confirmação'];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ===== NAVBAR ===== */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg shadow">
                <GraduationCap className="text-white h-5 w-5" />
              </div>
              <span className="font-bold text-lg text-gray-900 tracking-tight">
                EduGestão <span className="text-indigo-600">Pro</span>
              </span>
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-full">
              <ShieldCheck size={14} />
              Ambiente Seguro
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ===== PROGRESSO ===== */}
        {step < 4 && (
          <div className="mb-10">
            <div className="flex items-center justify-center gap-0">
              {passos.map((p, i) => {
                const num = i + 1;
                const ativo = step === num;
                const concluido = step > num;
                return (
                  <React.Fragment key={p}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                          concluido
                            ? 'bg-indigo-600 text-white'
                            : ativo
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {concluido ? <Check size={16} strokeWidth={3} /> : num}
                      </div>
                      <span className={`text-xs mt-1.5 font-medium ${ativo ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {p}
                      </span>
                    </div>
                    {i < passos.length - 1 && (
                      <div className={`h-0.5 w-16 sm:w-24 mx-1 mb-4 transition-all ${concluido ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8 items-start">

          {/* ===== COLUNA PRINCIPAL ===== */}
          <div className="lg:col-span-2">

            {/* ---- STEP 1: Resumo do Plano ---- */}
            {step === 1 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Seu plano selecionado</h2>

                <div className="border-2 border-indigo-500 rounded-2xl p-6 bg-indigo-50/50 mb-6">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
                      <IconePlano size={26} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Plano {plano.nome}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        ciclo === 'anual' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        Cobrança {ciclo === 'anual' ? 'Anual (2 meses grátis!)' : 'Mensal'}
                      </span>
                    </div>
                  </div>

                  <ul className="flex flex-col gap-2.5">
                    {plano.recursos.map((r) => (
                      <li key={r} className="flex items-center gap-2.5">
                        <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Check size={11} className="text-indigo-600" strokeWidth={3} />
                        </div>
                        <span className="text-sm text-gray-700">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Trocar plano */}
                <div className="text-center mb-6">
                  <Link
                    to="/#planos"
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium underline underline-offset-4"
                  >
                    Quero escolher outro plano
                  </Link>
                </div>

                <button
                  id="btn-continuar-step1"
                  onClick={() => setStep(2)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  Continuar <ArrowRight size={18} />
                </button>
              </div>
            )}

            {/* ---- STEP 2: Dados do Cliente ---- */}
            {step === 2 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Seus dados</h2>

                <form
                  id="form-dados-cliente"
                  onSubmit={(e) => { e.preventDefault(); setStep(3); }}
                  className="flex flex-col gap-5"
                >
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="checkout-nome" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Nome completo *
                      </label>
                      <input
                        id="checkout-nome"
                        type="text"
                        required
                        value={dados.nome}
                        onChange={(e) => setDados({ ...dados, nome: e.target.value })}
                        placeholder="João da Silva"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        E-mail *
                      </label>
                      <input
                        id="checkout-email"
                        type="email"
                        required
                        value={dados.email}
                        onChange={(e) => setDados({ ...dados, email: e.target.value })}
                        placeholder="joao@escola.com.br"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="checkout-documento" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        CPF ou CNPJ *
                      </label>
                      <input
                        id="checkout-documento"
                        type="text"
                        required
                        value={dados.documento}
                        onChange={(e) => setDados({ ...dados, documento: e.target.value })}
                        placeholder="00.000.000/0001-00"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-telefone" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Telefone / WhatsApp
                      </label>
                      <input
                        id="checkout-telefone"
                        type="tel"
                        value={dados.telefone}
                        onChange={(e) => setDados({ ...dados, telefone: e.target.value })}
                        placeholder="(31) 99999-9999"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="checkout-escola" className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Nome da escola / instituição *
                    </label>
                    <input
                      id="checkout-escola"
                      type="text"
                      required
                      value={dados.escola}
                      onChange={(e) => setDados({ ...dados, escola: e.target.value })}
                      placeholder="E.E. Prof. João Pinheiro"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={16} />
                      Voltar
                    </button>
                    <button
                      id="btn-continuar-step2"
                      type="submit"
                      className="flex-2 flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      Continuar <ArrowRight size={18} />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ---- STEP 3: Método de Pagamento ---- */}
            {step === 3 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Forma de pagamento</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Escolha como prefere pagar. A integração com o Mercado Pago está pronta para ativação.
                </p>

                <div className="flex flex-col gap-4 mb-8">
                  {/* PIX */}
                  <button
                    id="btn-pix"
                    type="button"
                    onClick={() => setMetodo('pix')}
                    className={`flex items-center gap-4 p-5 border-2 rounded-2xl text-left transition-all ${
                      metodo === 'pix'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      metodo === 'pix' ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}>
                      <QrCode size={22} className={metodo === 'pix' ? 'text-indigo-600' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">Pix</span>
                        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          Aprovação imediata
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">QR Code gerado pelo Mercado Pago</p>
                    </div>
                    {metodo === 'pix' && <Check size={20} className="text-indigo-600" strokeWidth={3} />}
                  </button>

                  {/* CARTÃO */}
                  <button
                    id="btn-cartao"
                    type="button"
                    onClick={() => setMetodo('cartao')}
                    className={`flex items-center gap-4 p-5 border-2 rounded-2xl text-left transition-all ${
                      metodo === 'cartao'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      metodo === 'cartao' ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}>
                      <CreditCard size={22} className={metodo === 'cartao' ? 'text-indigo-600' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">Cartão de Crédito</span>
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          Até 12x
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">Todas as bandeiras · via Mercado Pago</p>
                    </div>
                    {metodo === 'cartao' && <Check size={20} className="text-indigo-600" strokeWidth={3} />}
                  </button>

                  {/* BOLETO */}
                  <button
                    id="btn-boleto"
                    type="button"
                    onClick={() => setMetodo('boleto')}
                    className={`flex items-center gap-4 p-5 border-2 rounded-2xl text-left transition-all ${
                      metodo === 'boleto'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      metodo === 'boleto' ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}>
                      <FileText size={22} className={metodo === 'boleto' ? 'text-indigo-600' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">Boleto Bancário</span>
                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          1-3 dias úteis
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">Compensação em até 3 dias úteis · via Mercado Pago</p>
                    </div>
                    {metodo === 'boleto' && <Check size={20} className="text-indigo-600" strokeWidth={3} />}
                  </button>
                </div>

                {/* Aviso de integração pendente */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                  <p className="text-xs text-amber-700 font-medium">
                    🔧 <strong>Modo demo:</strong> A integração com o Mercado Pago está preparada e será ativada em breve.
                    Ao clicar em "Confirmar Assinatura", seus dados serão <strong>registrados no banco de dados</strong> para ativação manual.
                  </p>
                </div>

                {/* Mensagem de erro ao salvar */}
                {erroSalvar && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <p className="text-xs text-red-700 font-medium">❌ {erroSalvar}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    Voltar
                  </button>
                  <button
                    id="btn-confirmar-assinatura"
                    type="button"
                    onClick={handleCheckout}
                    disabled={!metodo || processando}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {processando ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        Confirmar Assinatura
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ---- STEP 4: Confirmação ---- */}
            {step === 4 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={44} className="text-emerald-500" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Pedido recebido! 🎉</h2>
                <p className="text-gray-600 mb-2 text-lg">
                  Obrigado, <strong>{dados.nome || 'cliente'}</strong>!
                </p>
                <p className="text-gray-500 max-w-md mx-auto mb-8">
                  Recebemos sua solicitação de assinatura do <strong>Plano {plano.nome}</strong>.
                  Nossa equipe entrará em contato em até 1 dia útil pelo e-mail{' '}
                  <strong className="text-indigo-600">{dados.email}</strong> para confirmar o acesso.
                </p>

                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-8 text-left max-w-sm mx-auto">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">Resumo do pedido</p>
                  <div className="flex justify-between text-sm text-gray-700 mb-1">
                    <span>Plano</span>
                    <span className="font-semibold">{plano.nome}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700 mb-1">
                    <span>Ciclo</span>
                    <span className="font-semibold">{ciclo === 'anual' ? 'Anual' : 'Mensal'}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700 mb-1">
                    <span>Pagamento</span>
                    <span className="font-semibold capitalize">{metodo}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-indigo-100 pt-2 mt-2">
                    <span>Total</span>
                    <span className="text-indigo-600">
                      R$ {precoTotal.toLocaleString('pt-BR')}{ciclo === 'anual' ? '/ano' : '/mês'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href="https://wa.me/5531989805397"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-full transition-all"
                  >
                    Falar no WhatsApp
                  </a>
                  <Link
                    to="/"
                    className="border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-full transition-all"
                  >
                    Voltar ao início
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ===== SIDEBAR: Resumo do pedido ===== */}
          {step < 4 && (
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 sticky top-24">
                <h3 className="font-bold text-gray-900 mb-5 text-sm uppercase tracking-widest text-gray-500">
                  Resumo do pedido
                </h3>

                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <IconePlano size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Plano {plano.nome}</p>
                    <p className="text-xs text-gray-400 capitalize">{ciclo === 'anual' ? 'Anual' : 'Mensal'}</p>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-800">R$ {preco}/mês</span>
                </div>
                {ciclo === 'anual' && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Desconto anual</span>
                    <span className="font-medium text-emerald-600">-17%</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between font-bold text-base">
                  <span className="text-gray-900">Total</span>
                  <span className="text-indigo-600">
                    R$ {precoTotal.toLocaleString('pt-BR')}{ciclo === 'anual' ? '/ano' : '/mês'}
                  </span>
                </div>

                {/* Selos de segurança */}
                <div className="mt-6 flex flex-col gap-2">
                  {[
                    { icon: ShieldCheck, texto: 'Dados protegidos por SSL' },
                    { icon: Check, texto: 'Powered by Mercado Pago' },
                    { icon: Check, texto: 'Cancele quando quiser' },
                  ].map(({ icon: Icon, texto }) => (
                    <div key={texto} className="flex items-center gap-2 text-xs text-gray-500">
                      <Icon size={13} className="text-emerald-500" />
                      {texto}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Link de voltar */}
        {step < 4 && (
          <div className="text-center mt-8">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft size={14} />
              Voltar para o site
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};
