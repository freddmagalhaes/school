import { createClient } from '@supabase/supabase-js';

// pegando a url e a chave do banco supabase lá do arquivo .env (import.meta.env é do Vite!)
// deixei um link de mock pra caso a gente esqueça de configurar o .env não quebrar a aplicação direto
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-key';

// instanciando o cliente aqui pra exportar pro resto do sistema poder usar. 
// achei melhor fazer assim pra ter só uma conexão e não criar o client em cada componente
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
