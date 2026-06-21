export const mascararCPF = (cpf: string): string => {
  if (!cpf) return '';
  // Formato original: 123.456.789-01
  // Formato mascarado: ***.456.789-**
  const limpo = cpf.replace(/[^\d]/g, '');
  if (limpo.length !== 11) return cpf; // Se não for um CPF válido em tamanho, retorna como está

  return `***.${limpo.substring(3, 6)}.${limpo.substring(6, 9)}-**`;
};

export const mascararEmail = (email: string): string => {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  
  const nome = parts[0];
  const dominio = parts[1];
  
  if (nome.length <= 2) {
    return `${nome[0]}***@${dominio}`;
  }
  
  return `${nome.substring(0, 2)}***${nome.substring(nome.length - 1)}@${dominio}`;
};
