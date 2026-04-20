import React from 'react';
import { GraduationCap, ArrowRight, BookOpen, ShieldCheck, PieChart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header NavBar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <GraduationCap className="text-white h-6 w-6" />
              </div>
              <span className="font-bold text-xl text-gray-900 tracking-tight">EduGestão <span className="text-indigo-600">Pro</span></span>
            </div>
            <nav className="hidden md:flex gap-8">
              <a href="#funcionalidades" className="text-sm font-medium text-gray-600 hover:text-indigo-600">Funcionalidades</a>
              <a href="#planos" className="text-sm font-medium text-gray-600 hover:text-indigo-600">Planos</a>
              <a href="#contato" className="text-sm font-medium text-gray-600 hover:text-indigo-600">Contato</a>
            </nav>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Entrar</Link>
              <Link to="/login" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm hidden sm:block">
                Assinar Agora
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-indigo-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
           <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
              <defs><pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 40V0h40v40H0z" fill="none"/><path d="M0 39h40V0" stroke="currentColor" strokeWidth="1"/></pattern></defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern)"/>
           </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            A revolução na <span className="text-indigo-400">gestão escolar</span>.
          </h1>
          <p className="mt-4 text-xl text-indigo-100 max-w-2xl mx-auto mb-10">
            Administre RH, Diários de Classe e Fluxo Financeiro com nossa plataforma Multi-tenant construída para Secretarias e Diretorias de excelência.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/login" className="bg-white text-indigo-900 px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-100 transition-all flex items-center gap-2">
              Acessar o Sistema <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Tudo que sua escola precisa</h2>
            <p className="mt-4 text-gray-500">Módulos integrados criados por quem entende de rotina escolar.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Visão Multi-tenant</h3>
              <p className="text-gray-600">Alterne entre várias escolas na mesma conta. Os dados são blindados evitando qualquer mistura de informações.</p>
            </div>
            
            <div className="p-6 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <BookOpen size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Gestão Acadêmica</h3>
              <p className="text-gray-600">Enturmação rápida com geração de PDF nativa para Atas de Expulsão e Termos de Transferência em um clique!</p>
            </div>

            <div className="p-6 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                <PieChart size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Painel de RH & Financeiro</h3>
              <p className="text-gray-600">Filtros dinâmicos para contratos Designados vs Efetivos e alertas automáticos de vencimento de contrato de professores.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer minimalista */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} EduGestão Pro. Todos os direitos reservados.</p>
        <p className="mt-2 flex items-center justify-center gap-1">Feito com <span className="text-red-500">❤</span> para a educação.</p>
      </footer>
    </div>
  );
};
