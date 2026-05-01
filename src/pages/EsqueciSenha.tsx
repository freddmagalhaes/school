import React, { useState } from 'react';
import { GraduationCap, ArrowLeft, MailCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const EsqueciSenha: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const form = e.target as HTMLFormElement;
    const email = form.email.value;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError('Ocorreu um erro ao tentar enviar o e-mail: ' + error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-indigo-600 p-3 rounded-xl shadow-lg">
            <GraduationCap className="text-white h-10 w-10" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Recuperar Senha
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enviaremos as instruções para o seu e-mail
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          
          {success ? (
            <div className="text-center space-y-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100">
                <MailCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">E-mail enviado!</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Verifique sua caixa de entrada e siga as instruções enviadas para redefinir sua senha.
                </p>
              </div>
              <div className="pt-4">
                <Link to="/login" className="w-full flex justify-center py-2 px-4 border border-indigo-600 rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Voltar para o Login
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-mail institucional
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
                  <ArrowLeft size={16} /> Voltar
                </Link>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
                >
                  {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
