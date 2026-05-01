// Supabase Edge Function: create-school-user
// Usa service_role key para criar usuário no Auth e vinculá-lo à escola
// Deploy: supabase functions deploy create-school-user

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase Admin Client (usa SERVICE_ROLE — nunca exponha no frontend)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Valida que o chamador é um membro autenticado com papel Admin ou Secretaria
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), { status: 401, headers: corsHeaders });
    }

    const { escola_id, nome, email, cpf, papel, tipo_vinculo, metadata } = await req.json();

    if (!escola_id || !nome || !email || !papel) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: escola_id, nome, email, papel' }), {
        status: 400, headers: corsHeaders
      });
    }

    // Verifica se o chamador tem permissão para criar usuários nesta escola
    const { data: membroCaller } = await supabaseAdmin
      .from('membros_escola')
      .select('papel')
      .eq('escola_id', escola_id)
      .eq('user_id', caller.id)
      .single();

    const isRoot = await supabaseAdmin
      .from('root_admins')
      .select('is_active')
      .eq('id', caller.id)
      .eq('is_active', true)
      .single();

    const podeGerenciar = isRoot.data || ['Admin', 'Secretaria'].includes(membroCaller?.papel || '');
    if (!podeGerenciar) {
      return new Response(JSON.stringify({ error: 'Permissão insuficiente para criar usuários' }), {
        status: 403, headers: corsHeaders
      });
    }

    // Secretaria não pode criar Diretor, Subdiretor ou Secretaria
    const papeisSoAdmin = ['Diretor', 'Subdiretor', 'Secretaria', 'Admin'];
    if (membroCaller?.papel === 'Secretaria' && papeisSoAdmin.includes(papel)) {
      return new Response(JSON.stringify({ error: 'Secretaria não pode criar este tipo de usuário' }), {
        status: 403, headers: corsHeaders
      });
    }

    // Cria o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,   // E-mail confirmado automaticamente
      user_metadata: { nome, cpf, ...metadata },
      // Sem senha definida → Supabase enviará link de redefinição ao usuário
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: authError?.message || 'Erro ao criar usuário no Auth' }), {
        status: 400, headers: corsHeaders
      });
    }

    const newUserId = authData.user.id;

    // Cria o perfil
    const { error: perfilError } = await supabaseAdmin
      .from('perfis')
      .upsert({ id: newUserId, nome, cpf: cpf || null, metadata: metadata || {} }, { onConflict: 'id' });

    if (perfilError) {
      // Rollback: deleta o usuário criado no Auth
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: 'Erro ao criar perfil: ' + perfilError.message }), {
        status: 500, headers: corsHeaders
      });
    }

    // Cria o vínculo na escola
    const { error: vinculoError } = await supabaseAdmin
      .from('membros_escola')
      .insert({
        escola_id,
        user_id: newUserId,
        papel,
        tipo_vinculo: tipo_vinculo || 'Efetivo',
      });

    if (vinculoError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: 'Erro ao vincular à escola: ' + vinculoError.message }), {
        status: 500, headers: corsHeaders
      });
    }

    // Envia o e-mail de primeiro acesso (magic link / reset de senha)
    await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500, headers: corsHeaders
    });
  }
});
