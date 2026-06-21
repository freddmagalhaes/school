import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_KEY';

// We need to read the env vars from .env.local
import fs from 'fs';
import dotenv from 'dotenv';
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: perfis, error } = await supabase.from('perfis').select('*');
  console.log('Perfis:', perfis, error);
}

run();
