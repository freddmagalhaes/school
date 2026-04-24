import { createClient } from '@supabase/supabase-js';

// Aqui a gente pega as configurações lá do arquivo .env
// O prefixo VITE_ é importante pro Vite conseguir ler essas variáveis no frontend
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Uma verificação simples pra ajudar a gente se esquecer de configurar o .env
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Atenção: As chaves do Supabase não foram encontradas no arquivo .env');
}

// Criando a conexão única com o banco de dados
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storageKey: 'edugestao-backoffice-auth', // Chave única para evitar conflito de travas
      persistSession: true,
      autoRefreshToken: true
    }
  }
);
