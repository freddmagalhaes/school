import React, { useState } from 'react';
import {
  GraduationCap,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  PieChart,
  Check,
  Phone,
  Mail,
  Star,
  Users,
  Building2,
  Zap,
  MessageCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ============================================================
// Definição dos planos de assinatura
// ============================================================
const planos = [
  {
    id: 'basico',
    nome: 'Básico',
    descricao: 'Perfeito para começar e gerenciar uma escola com eficiência.',
    precoMensal: 197,
    precoAnual: 1970,
    cor: 'indigo',
    icone: BookOpen,
    escolas: '1 escola',
    usuarios: 'Até 5 usuários',
    suporte: 'Suporte por e-mail',
    destaque: false,
    recursos: [
      'Módulo de Secretaria completo',
      'Gestão de alunos e enturmação',
      'Emissão de PDF (Atas e Termos)',
      'Painel financeiro básico',
      'Suporte via e-mail',
    ],
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    descricao: 'Ideal para redes com até 3 unidades que precisam de mais poder.',
    precoMensal: 397,
    precoAnual: 3970,
    cor: 'violet',
    icone: Star,
    escolas: 'Até 3 escolas',
    usuarios: 'Até 20 usuários',
    suporte: 'WhatsApp + E-mail',
    destaque: true,
    recursos: [
      'Tudo do plano Básico',
      'Até 3 escolas (multi-tenant)',
      'Painel de RH avançado (Designados vs Efetivos)',
      'Alertas automáticos de vencimento de contrato',
      'Relatórios financeiros detalhados',
      'Suporte via WhatsApp e E-mail',
    ],
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    descricao: 'Para secretarias e redes de grande porte sem limitações.',
    precoMensal: 797,
    precoAnual: 7970,
    cor: 'emerald',
    icone: Building2,
    escolas: 'Escolas ilimitadas',
    usuarios: 'Usuários ilimitados',
    suporte: 'Suporte prioritário 24/7',
    destaque: false,
    recursos: [
      'Tudo do plano Profissional',
      'Escolas e usuários ilimitados',
      'Onboarding personalizado',
      'Acesso à API para integrações',
      'SLA garantido',
      'Suporte prioritário 24/7',
    ],
  },
];

// ============================================================
// Componente principal da Landing Page
// ============================================================
export const Home: React.FC = () => {
  const [ciclo, setCiclo] = useState<'mensal' | 'anual'>('mensal');

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ===== NAVBAR ===== */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg shadow">
                <GraduationCap className="text-white h-6 w-6" />
              </div>
              <span className="font-bold text-xl text-gray-900 tracking-tight">
                EduGestão <span className="text-indigo-600">Pro</span>
              </span>
            </div>

            {/* Nav Links */}
            <nav className="hidden md:flex gap-8">
              <a href="#funcionalidades" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                Funcionalidades
              </a>
              <a href="#planos" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                Planos
              </a>
              <Link to="/contato" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                Contato
              </Link>
            </nav>

            {/* CTAs */}
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                Entrar
              </Link>
              <Link
                to="/assinar"
                className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm hidden sm:block"
              >
                Assinar Agora
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative bg-indigo-900 text-white overflow-hidden">
        {/* Grid decorativo */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 40V0h40v40H0z" fill="none" />
                <path d="M0 39h40V0" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>

        {/* Gradiente radial */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-800 via-indigo-900 to-purple-900 opacity-80" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-28 relative z-10 text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            <Zap size={12} className="text-yellow-400" />
            Plataforma SaaS para Gestão Escolar
          </span>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            A revolução na{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
              gestão escolar
            </span>
            .
          </h1>

          <p className="mt-4 text-xl text-indigo-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            Administre RH, Diários de Classe e Fluxo Financeiro com nossa plataforma Multi-tenant construída
            para Secretarias e Diretorias de excelência.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/assinar"
              className="bg-white text-indigo-900 px-8 py-3.5 rounded-full font-bold shadow-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2 text-base"
            >
              Começar Agora <ArrowRight size={18} />
            </Link>
            <a
              href="#planos"
              className="border border-indigo-400/50 text-white px-8 py-3.5 rounded-full font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-base"
            >
              Ver Planos
            </a>
          </div>

          {/* Estatísticas rápidas */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { label: 'Escolas ativas', valor: '50+' },
              { label: 'Alunos gerenciados', valor: '12k+' },
              { label: 'Uptime garantido', valor: '99.9%' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-extrabold text-white">{stat.valor}</div>
                <div className="text-xs text-indigo-300 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FUNCIONALIDADES ===== */}
      <section id="funcionalidades" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-indigo-600 text-sm font-bold uppercase tracking-widest">Módulos</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold text-gray-900">
              Tudo que sua escola precisa
            </h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              Módulos integrados criados por quem entende de rotina escolar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: ShieldCheck,
                cor: 'blue',
                titulo: 'Visão Multi-tenant',
                desc: 'Alterne entre várias escolas na mesma conta. Os dados são blindados, evitando qualquer mistura de informações.',
              },
              {
                icon: BookOpen,
                cor: 'emerald',
                titulo: 'Gestão Acadêmica',
                desc: 'Enturmação rápida com geração de PDF nativa para Atas de Expulsão e Termos de Transferência em um clique!',
              },
              {
                icon: PieChart,
                cor: 'purple',
                titulo: 'Painel de RH & Financeiro',
                desc: 'Filtros dinâmicos para contratos Designados vs Efetivos e alertas automáticos de vencimento de contrato de professores.',
              },
            ].map(({ icon: Icon, cor, titulo, desc }) => (
              <div
                key={titulo}
                className="p-8 border border-gray-100 rounded-2xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 group"
              >
                <div className={`w-14 h-14 bg-${cor}-100 text-${cor}-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <Icon size={26} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{titulo}</h3>
                <p className="text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PLANOS ===== */}
      <section id="planos" className="py-24 bg-gradient-to-b from-gray-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Cabeçalho */}
          <div className="text-center mb-12">
            <span className="text-indigo-600 text-sm font-bold uppercase tracking-widest">Preços</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold text-gray-900">
              Planos transparentes, sem surpresas
            </h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              Hospedado na AWS com Elastic IP dedicado. Alta disponibilidade e segurança enterprise.
            </p>

            {/* Toggle Mensal / Anual */}
            <div className="mt-8 inline-flex items-center bg-white border border-gray-200 rounded-full p-1 shadow-sm">
              <button
                id="toggle-mensal"
                onClick={() => setCiclo('mensal')}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  ciclo === 'mensal'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Mensal
              </button>
              <button
                id="toggle-anual"
                onClick={() => setCiclo('anual')}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                  ciclo === 'anual'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Anual
                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  -17%
                </span>
              </button>
            </div>
          </div>

          {/* Cards de plano */}
          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {planos.map((plano) => {
              const preco = ciclo === 'mensal' ? plano.precoMensal : Math.round(plano.precoAnual / 12);
              const IconePlano = plano.icone;

              return (
                <div
                  key={plano.id}
                  className={`relative flex flex-col rounded-3xl p-8 transition-all hover:-translate-y-1 ${
                    plano.destaque
                      ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-300 border-2 border-indigo-500 scale-105'
                      : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  {/* Badge Recomendado */}
                  {plano.destaque && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 text-xs font-extrabold px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wide">
                        ⭐ Mais Popular
                      </span>
                    </div>
                  )}

                  {/* Ícone e nome */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      plano.destaque ? 'bg-white/20' : 'bg-indigo-50'
                    }`}>
                      <IconePlano size={22} className={plano.destaque ? 'text-white' : 'text-indigo-600'} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${plano.destaque ? 'text-white' : 'text-gray-900'}`}>
                        {plano.nome}
                      </h3>
                    </div>
                  </div>

                  {/* Preço */}
                  <div className="mb-3">
                    <div className="flex items-end gap-1">
                      <span className={`text-4xl font-extrabold ${plano.destaque ? 'text-white' : 'text-gray-900'}`}>
                        R$ {preco}
                      </span>
                      <span className={`text-sm pb-1 ${plano.destaque ? 'text-indigo-200' : 'text-gray-400'}`}>
                        /mês
                      </span>
                    </div>
                    {ciclo === 'anual' && (
                      <p className={`text-xs mt-1 ${plano.destaque ? 'text-indigo-200' : 'text-gray-400'}`}>
                        Cobrado R$ {plano.precoAnual.toLocaleString('pt-BR')}/ano (2 meses grátis!)
                      </p>
                    )}
                  </div>

                  {/* Descrição */}
                  <p className={`text-sm mb-6 leading-relaxed ${plano.destaque ? 'text-indigo-100' : 'text-gray-500'}`}>
                    {plano.descricao}
                  </p>

                  {/* Infos rápidas */}
                  <div className={`flex flex-col gap-1.5 mb-6 pb-6 border-b ${
                    plano.destaque ? 'border-indigo-400/40' : 'border-gray-100'
                  }`}>
                    {[
                      { icon: Building2, texto: plano.escolas },
                      { icon: Users, texto: plano.usuarios },
                      { icon: MessageCircle, texto: plano.suporte },
                    ].map(({ icon: Icon, texto }) => (
                      <div key={texto} className="flex items-center gap-2">
                        <Icon size={14} className={plano.destaque ? 'text-indigo-300' : 'text-indigo-400'} />
                        <span className={`text-xs font-medium ${plano.destaque ? 'text-indigo-100' : 'text-gray-600'}`}>
                          {texto}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Lista de recursos */}
                  <ul className="flex flex-col gap-3 mb-8 flex-1">
                    {plano.recursos.map((r) => (
                      <li key={r} className="flex items-start gap-2.5">
                        <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          plano.destaque ? 'bg-white/20' : 'bg-indigo-100'
                        }`}>
                          <Check size={10} className={plano.destaque ? 'text-white' : 'text-indigo-600'} strokeWidth={3} />
                        </div>
                        <span className={`text-sm ${plano.destaque ? 'text-indigo-100' : 'text-gray-600'}`}>
                          {r}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    to={`/assinar?plano=${plano.id}&ciclo=${ciclo}`}
                    id={`btn-assinar-${plano.id}`}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm text-center transition-all ${
                      plano.destaque
                        ? 'bg-white text-indigo-700 hover:bg-gray-50 shadow-lg'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                    }`}
                  >
                    Assinar {plano.nome}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Nota sobre AWS */}
          <p className="text-center text-xs text-gray-400 mt-10">
            🔒 Hospedado na AWS com EC2 + Elastic IP dedicado. Todos os planos incluem SSL e backups diários automáticos.
          </p>
        </div>
      </section>

      {/* ===== TEASER DE CONTATO ===== */}
      <section id="contato" className="py-20 bg-indigo-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ficou com alguma dúvida?
          </h2>
          <p className="text-indigo-200 mb-10 text-lg">
            Nossa equipe está pronta para ajudar. Fale conosco agora mesmo!
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="https://wa.me/5531989805397"
              target="_blank"
              rel="noopener noreferrer"
              id="btn-whatsapp"
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-full font-bold transition-all shadow-lg"
            >
              <Phone size={18} />
              WhatsApp: (31) 98980-5397
            </a>
            <a
              href="mailto:atendimento@automocoes.tec.br"
              id="btn-email"
              className="flex items-center justify-center gap-2 border border-indigo-400/50 hover:bg-white/10 text-white px-8 py-3.5 rounded-full font-semibold transition-all"
            >
              <Mail size={18} />
              atendimento@automocoes.tec.br
            </a>
          </div>
          <div className="mt-8">
            <Link
              to="/contato"
              className="text-indigo-300 hover:text-white text-sm font-medium underline underline-offset-4 transition-colors"
            >
              Ou acesse nossa página de contato →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-950 text-gray-500 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-md">
                <GraduationCap className="text-white h-4 w-4" />
              </div>
              <span className="font-bold text-sm text-gray-300">
                EduGestão <span className="text-indigo-400">Pro</span>
              </span>
            </div>

            {/* Links */}
            <nav className="flex gap-6 text-xs">
              <a href="#funcionalidades" className="hover:text-gray-300 transition-colors">Funcionalidades</a>
              <a href="#planos" className="hover:text-gray-300 transition-colors">Planos</a>
              <Link to="/contato" className="hover:text-gray-300 transition-colors">Contato</Link>
            </nav>

            {/* Copyright */}
            <p className="text-xs">
              © {new Date().getFullYear()} EduGestão Pro · Feito com ❤️ para a educação
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
