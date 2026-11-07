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

    const { escola_id, nome, email, cpf, papel, tipo_vinculo, metadata, aluno_ids, parentesco } = await req.json();

    if (!escola_id || !nome || !email || !papel) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: escola_id, nome, email, papel' }), {
        status: 400, headers: corsHeaders
      });
    }

    // perfis.cpf é NOT NULL e varchar(14): confere ANTES de criar a conta no Auth (senão ela ficaria pela metade)
    if (typeof cpf !== 'string' || cpf.trim() === '' || cpf.length > 14) {
      return new Response(JSON.stringify({ error: 'Informe o CPF (até 14 caracteres)' }), { status: 400, headers: corsHeaders });
    }
    if (String(nome).length > 255) {
      return new Response(JSON.stringify({ error: 'Nome longo demais (máximo 255 caracteres)' }), { status: 400, headers: corsHeaders });
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

    const PAPEIS_VALIDOS = ['Admin', 'Diretor', 'Subdiretor', 'Secretaria', 'Professor', 'Aluno', 'Responsavel'];
    if (!PAPEIS_VALIDOS.includes(papel)) {
      return new Response(JSON.stringify({ error: 'Papel inválido' }), { status: 400, headers: corsHeaders });
    }

    // Responsável precisa acompanhar ao menos um aluno desta escola (confere ANTES de criar qualquer coisa)
    let alunosVinculados: string[] = [];
    if (papel === 'Responsavel') {
      alunosVinculados = Array.isArray(aluno_ids) ? [...new Set(aluno_ids as string[])] : [];
      if (alunosVinculados.length === 0) {
        return new Response(JSON.stringify({ error: 'Informe ao menos um aluno para o responsável' }), { status: 400, headers: corsHeaders });
      }
      const { data: alunosOk } = await supabaseAdmin
        .from('membros_escola')
        .select('user_id')
        .eq('escola_id', escola_id)
        .eq('papel', 'Aluno')
        .in('user_id', alunosVinculados);
      if ((alunosOk || []).length !== alunosVinculados.length) {
        return new Response(JSON.stringify({ error: 'Há aluno que não pertence a esta escola' }), { status: 400, headers: corsHeaders });
      }
    }

    // Secretaria não pode criar Diretor, Subdiretor ou Secretaria
    const papeisSoAdmin = ['Diretor', 'Subdiretor', 'Secretaria', 'Admin'];
    if (membroCaller?.papel === 'Secretaria' && papeisSoAdmin.includes(papel)) {
      return new Response(JSON.stringify({ error: 'Secretaria não pode criar este tipo de usuário' }), {
        status: 403, headers: corsHeaders
      });
    }

    // A mesma pessoa pode atuar em várias escolas (ex.: professor na A, vice-diretor na B): o login e o perfil
    // são UM só, e cada escola tem o seu vínculo (membros_escola). Se o CPF já existe, só acrescenta o vínculo,
    // desde que o e-mail confira. Mensagem genérica de propósito: quem cadastra não descobre dados de outra escola.
    const conflitoGenerico = () => new Response(JSON.stringify({
      error: 'Não foi possível cadastrar com este e-mail e CPF. Confira os dados; se a pessoa já usa o sistema em outra escola, informe exatamente o mesmo e-mail e CPF dela.',
    }), { status: 409, headers: corsHeaders });

    let newUserId: string;
    let usuarioNovo = true;

    const { data: perfilExistente } = await supabaseAdmin.from('perfis').select('id').eq('cpf', cpf).maybeSingle();
    if (perfilExistente) {
      const { data: existente } = await supabaseAdmin.auth.admin.getUserById(perfilExistente.id);
      if (!existente?.user || (existente.user.email || '').toLowerCase() !== String(email).toLowerCase()) {
        return conflitoGenerico();
      }
      newUserId = perfilExistente.id;
      usuarioNovo = false;
    } else {
      // Cria o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,   // E-mail confirmado automaticamente
        user_metadata: { nome, cpf, ...metadata },
        // Sem senha definida → Supabase enviará link de redefinição ao usuário
      });

      if (authError || !authData.user) {
        // E-mail já usado por outra pessoa (CPF diferente): mesma resposta genérica
        if (/already|registered|exists/i.test(authError?.message || '')) return conflitoGenerico();
        return new Response(JSON.stringify({ error: authError?.message || 'Erro ao criar usuário no Auth' }), {
          status: 400, headers: corsHeaders
        });
      }

      newUserId = authData.user.id;

      // Cria o perfil
      const { error: perfilError } = await supabaseAdmin
        .from('perfis')
        .upsert({ id: newUserId, nome, cpf, metadata: metadata || {} }, { onConflict: 'id' });

      if (perfilError) {
        // Rollback: deleta o usuário criado no Auth
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        return new Response(JSON.stringify({ error: 'Erro ao criar perfil: ' + perfilError.message }), {
          status: 500, headers: corsHeaders
        });
      }
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
      // Só apaga o login se ele acabou de ser criado aqui; uma pessoa que já existia nunca é apagada.
      if (usuarioNovo) await supabaseAdmin.auth.admin.deleteUser(newUserId);
      if (!usuarioNovo && vinculoError.code === '23505') {
        return new Response(JSON.stringify({ error: 'Esta pessoa já está cadastrada nesta escola com este papel.' }), {
          status: 409, headers: corsHeaders
        });
      }
      return new Response(JSON.stringify({ error: 'Erro ao vincular à escola: ' + vinculoError.message }), {
        status: 500, headers: corsHeaders
      });
    }

    // Vincula o responsável aos alunos
    if (papel === 'Responsavel') {
      const { error: respError } = await supabaseAdmin
        .from('responsaveis_alunos')
        .insert(alunosVinculados.map((aluno_id) => ({
          escola_id, responsavel_id: newUserId, aluno_id, parentesco: parentesco || null,
        })));
      if (respError) {
        if (usuarioNovo) await supabaseAdmin.auth.admin.deleteUser(newUserId);
        else await supabaseAdmin.from('membros_escola').delete().eq('escola_id', escola_id).eq('user_id', newUserId).eq('papel', papel);
        return new Response(JSON.stringify({ error: 'Erro ao vincular aos alunos: ' + respError.message }), {
          status: 500, headers: corsHeaders
        });
      }
    }

    // Pessoa que já tem login: só ganhou o vínculo nesta escola; não recebe e-mail de primeiro acesso.
    if (!usuarioNovo) {
      return new Response(JSON.stringify({ success: true, user_id: newUserId, vinculado_existente: true, email_enviado: null }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Envia o e-mail de primeiro acesso. (generateLink só GERA o link, não envia nada:
    // resetPasswordForEmail é quem dispara o e-mail para o usuário definir a senha.)
    // O endereço do link vem do site que fez o pedido (cabeçalho Origin, enviado pelo navegador), assim
    // funciona igual em localhost e em produção. SITE_URL fica como alternativa. O Supabase ainda confere
    // o endereço contra a lista "Redirect URLs"; se não estiver nela, usa a "Site URL" do painel.
    const origem = req.headers.get('origin');
    const origemValida = origem && /^https?:\/\/[^\s/]+$/.test(origem) ? origem : null;
    const siteUrl = origemValida ?? Deno.env.get('SITE_URL');
    const { error: emailError } = await supabaseAdmin.auth.resetPasswordForEmail(
      email,
      siteUrl ? { redirectTo: `${siteUrl.replace(/\/$/, '')}/reset-password` } : undefined,
    );
    if (emailError) {
      // O usuário foi criado; só o e-mail falhou. A secretaria pode reenviar por "Esqueci minha senha".
      return new Response(JSON.stringify({ success: true, user_id: newUserId, email_enviado: false, aviso: emailError.message }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserId, email_enviado: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500, headers: corsHeaders
    });
  }
});
