import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRootAuth } from '../../contexts/RootAuthContext';

// ============================================================
// RootLogin
// Tela de acesso exclusiva para o backoffice.
// Design minimalista e discreto — sem qualquer referência
// ao site público ou ao sistema do cliente.
// ============================================================
export const RootLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { operador, user: rootUser } = useRootAuth();

  // Se já estiver logado e autorizado, redireciona
  React.useEffect(() => {
    if (operador) {
      navigate('/ops/dashboard', { replace: true });
    }
  }, [operador, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (authError || !data.session) {
        const msg = authError?.message || 'Erro desconhecido';
        if (msg.includes('Email not confirmed')) {
          setErro('E-mail não confirmado.');
        } else if (msg.includes('Invalid login credentials')) {
          setErro('E-mail ou senha inválidos.');
        } else {
          setErro(`Erro técnico: ${msg}`);
        }
        setCarregando(false);
        return;
      }
      
      // Quando logar com sucesso, o RootAuthContext vai detectar a sessão via onAuthStateChange,
      // fazer a verificação na tabela root_admins e preencher a variável 'operador'.
      // Se não preencher, significa que ele não tem acesso. Apenas esperamos.
      // Definimos um timeout de segurança caso ele não seja admin (para não ficar girando infinito).
      setTimeout(() => {
        setCarregando(false);
        // Se após 3 segundos o operador não for preenchido (o useEffect acima não rodar),
        // avisamos que não tem acesso e deslogamos.
        supabase.from('root_admins').select('id').eq('id', data.session.user.id).single().then(({ data: adminData }) => {
           if (!adminData) {
             setErro('Acesso negado: Sem permissão no Backoffice.');
             supabase.auth.signOut().catch(() => {});
           }
        });
      }, 3000);

    } catch (err) {
      setErro('Ocorreu um erro inesperado.');
      setCarregando(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1e] flex items-center justify-center p-4 transition-colors duration-500">

      {/* Gradiente sutil de fundo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-400/20">
            <GraduationCap size={32} className="text-gray-900" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">EduGestão Pro</h1>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold tracking-widest uppercase mt-1">
            Acesso Restrito · BackOffice
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-8 shadow-xl dark:shadow-2xl transition-colors">

          {/* Mensagem de erro */}
          {erro && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 mb-5">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-300 leading-relaxed">{erro}</p>
            </div>
          )}

          <form id="form-root-login" onSubmit={handleLogin} className="flex flex-col gap-5">

            {/* E-mail */}
            <div>
              <label htmlFor="root-email" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                E-mail de acesso
              </label>
              <input
                id="root-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@sistema.com"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#141c2e] border border-gray-100 dark:border-[#1e2d4a] rounded-xl text-gray-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-sm focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all"
              />
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="root-senha" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  id="root-senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 bg-gray-50 dark:bg-[#141c2e] border border-gray-100 dark:border-[#1e2d4a] rounded-xl text-gray-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 text-sm focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botão de entrar */}
            <button
              id="btn-root-entrar"
              type="submit"
              disabled={carregando}
              className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 disabled:cursor-not-allowed text-gray-900 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 mt-1"
            >
              {carregando ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Acessar BackOffice
                </>
              )}
            </button>
          </form>
        </div>

        {/* Rodapé discreto */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-700 mt-6">
          Acesso restrito a operadores autorizados.
        </p>
      </div>
    </div>
  );
};
