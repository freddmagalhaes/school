// GeradorBoletos.ts
// Este módulo simula a comunicação com gateways de pagamento (ex: Asaas, Stripe, Pagar.me)

export interface DadosCobranca {
  id_aluno: string;
  nome_responsavel: string;
  telefone_responsavel: string;
  valor_pendente: number;
  mes_referencia: string;
}

export interface FaturaGerada {
  linha_digitavel: string;
  qr_code_pix: string;
  chave_pix_copia_cola: string;
  link_pagamento: string;
}

export class GeradorBoletos {
  /**
   * Simula a geração de um boleto / PIX numa API bancária.
   */
  public static async gerarCobranca(dados: DadosCobranca): Promise<FaturaGerada> {
    // Simular delay de rede (0.5s)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock de dados bancários
    return {
      linha_digitavel: '34191.09008 00000.000000 00000.000000 1 00000000000000',
      qr_code_pix: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=simulacaoPixEduGestao',
      chave_pix_copia_cola: `00020101021126580014br.gov.bcb.pix0136${crypto.randomUUID()}5204000053039865405${dados.valor_pendente}5802BR5909EduGestao6008BRASILIA62070503***6304C2E4`,
      link_pagamento: `https://pag.ae/simulacao-fatura/${crypto.randomUUID().substring(0,8)}`
    };
  }

  /**
   * Gera o link do WhatsApp para envio imediato da cobrança.
   */
  public static formatarMensagemWhatsApp(dados: DadosCobranca, fatura: FaturaGerada): string {
    const telefoneNumeros = dados.telefone_responsavel.replace(/\D/g, '');
    
    // Se não tiver DDD válido ou número, tenta usar um mock pra teste
    const numeroFinal = telefoneNumeros.length >= 10 ? `55${telefoneNumeros}` : '5511999999999';

    const mensagem = `Olá, ${dados.nome_responsavel}! Tudo bem?\n\n`
      + `Sou da secretaria da escola e estou entrando em contato pois identificamos uma pendência financeira referente ao mês de *${dados.mes_referencia}* no valor de *R$ ${dados.valor_pendente.toFixed(2)}*.\n\n`
      + `Para facilitar a regularização, você pode pagar via PIX copiando o código abaixo:\n\n`
      + `\`${fatura.chave_pix_copia_cola}\`\n\n`
      + `Ou acessando a fatura digital: ${fatura.link_pagamento}\n\n`
      + `Caso já tenha efetuado o pagamento, por favor desconsidere esta mensagem. Qualquer dúvida, estou à disposição!`;

    const textoEncode = encodeURIComponent(mensagem);
    return `https://wa.me/${numeroFinal}?text=${textoEncode}`;
  }
}
