-- Passo 6 (b), teste COMO VISITANTE (anon). Não grava nada (cada tentativa é desfeita).
-- Esperado:
--   enviar contato (formulário público) ... PERMITIDO
--   criar assinatura pendente (checkout) .. PERMITIDO
--   ler escolas ........................... NEGADO (permission denied)
--   ler notas ............................. NEGADO
--   limpar (TRUNCATE) a tabela notas ...... NEGADO
create or replace function pg_temp.teste_visitante() returns table(tentativa text, resultado text)
language plpgsql as $$
declare r text;
begin
  set local role anon;

  begin insert into public.contatos (nome, email, mensagem) values ('teste', 'teste@teste', 'teste'); raise exception 'ok';
  exception when others then r := case when sqlerrm = 'ok' then 'PERMITIDO' else 'NEGADO: ' || sqlerrm end; end;
  tentativa := 'enviar contato'; resultado := r; return next;

  begin insert into public.assinaturas (nome, email, nome_escola, plano, ciclo, metodo_pgto, valor_total)
        values ('t', 't@t', 'Esc', 'basico', 'mensal', 'pix', 1); raise exception 'ok';
  exception when others then r := case when sqlerrm = 'ok' then 'PERMITIDO' else 'NEGADO: ' || sqlerrm end; end;
  tentativa := 'criar assinatura pendente'; resultado := r; return next;

  begin perform count(*) from public.escolas; raise exception 'ok';
  exception when others then r := case when sqlerrm = 'ok' then 'PERMITIDO' else 'NEGADO: ' || sqlerrm end; end;
  tentativa := 'ler escolas'; resultado := r; return next;

  begin perform count(*) from public.notas; raise exception 'ok';
  exception when others then r := case when sqlerrm = 'ok' then 'PERMITIDO' else 'NEGADO: ' || sqlerrm end; end;
  tentativa := 'ler notas'; resultado := r; return next;

  begin truncate public.notas; raise exception 'ok';
  exception when others then r := case when sqlerrm = 'ok' then 'PERMITIDO (!)' else 'NEGADO: ' || sqlerrm end; end;
  tentativa := 'limpar a tabela notas (TRUNCATE)'; resultado := r; return next;
end $$;
select * from pg_temp.teste_visitante();
