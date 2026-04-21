#!/bin/bash
# =============================================================
# deploy.sh — Script de deploy do EduGestão Pro na AWS EC2
# =============================================================
# Uso: ./deploy.sh <IP_DA_EC2> <CAMINHO_CHAVE_PEM>
# Exemplo: ./deploy.sh 54.234.12.99 ~/.ssh/edugestao.pem
# =============================================================

set -e  # Para se qualquer comando falhar

EC2_IP="${1}"
CHAVE_PEM="${2:-~/.ssh/id_rsa}"
EC2_USER="${3:-ubuntu}"        # Padrão Ubuntu AMI; use 'ec2-user' para Amazon Linux
APP_DIR="/var/www/edugestao"   # Pasta onde os arquivos serão colocados no servidor

# Verifica argumentos
if [ -z "$EC2_IP" ]; then
  echo "❌ Uso: ./deploy.sh <IP_DA_EC2> [CAMINHO_CHAVE_PEM] [EC2_USER]"
  echo "   Exemplo: ./deploy.sh 54.234.12.99 ~/.ssh/edugestao.pem ubuntu"
  exit 1
fi

echo "======================================================"
echo "   🚀 EduGestão Pro — Deploy para AWS EC2"
echo "   Servidor: $EC2_USER@$EC2_IP"
echo "======================================================"

# 1. Build de produção local
echo ""
echo "📦 [1/4] Gerando build de produção..."
npm run build
echo "✅ Build concluído: pasta dist/ gerada"

# 2. Prepara o servidor (instala Nginx se necessário)
echo ""
echo "🔧 [2/4] Preparando servidor remoto..."
ssh -i "$CHAVE_PEM" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << 'ENDSSH'
  # Atualiza pacotes e instala Nginx se ainda não estiver instalado
  if ! command -v nginx &> /dev/null; then
    echo "  → Instalando Nginx..."
    sudo apt-get update -y
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
  else
    echo "  → Nginx já instalado."
  fi

  # Cria o diretório da aplicação
  sudo mkdir -p /var/www/edugestao
  sudo chown -R $USER:$USER /var/www/edugestao
ENDSSH
echo "✅ Servidor preparado"

# 3. Upload dos arquivos de build para o servidor
echo ""
echo "📤 [3/4] Enviando arquivos para o servidor..."
# Remove arquivos antigos e faz upload do dist/
ssh -i "$CHAVE_PEM" "$EC2_USER@$EC2_IP" "rm -rf $APP_DIR/*"
scp -i "$CHAVE_PEM" -r dist/* "$EC2_USER@$EC2_IP:$APP_DIR/"
echo "✅ Upload concluído"

# 4. Configura o Nginx e reinicia
echo ""
echo "⚙️  [4/4] Configurando Nginx e reiniciando serviços..."
ssh -i "$CHAVE_PEM" "$EC2_USER@$EC2_IP" << ENDSSH
  # Copia o arquivo de configuração do Nginx
  sudo tee /etc/nginx/sites-available/edugestao > /dev/null << 'NGINX_CONF'
server {
    listen 80;
    server_name _;

    root /var/www/edugestao;
    index index.html;

    # Necessário para que as rotas do React Router funcionem
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Compressão gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
NGINX_CONF

  # Ativa o site e remove o default
  sudo ln -sf /etc/nginx/sites-available/edugestao /etc/nginx/sites-enabled/edugestao
  sudo rm -f /etc/nginx/sites-enabled/default

  # Testa e recarrega o Nginx
  sudo nginx -t
  sudo systemctl reload nginx
  echo "✅ Nginx reconfigurado e recarregado"
ENDSSH

echo ""
echo "======================================================"
echo "✅ Deploy concluído com sucesso!"
echo "   Site disponível em: http://$EC2_IP"
echo ""
echo "💡 Próximos passos recomendados:"
echo "   1. Aponte seu domínio para o IP: $EC2_IP"
echo "   2. Configure HTTPS com Certbot:"
echo "      sudo apt install certbot python3-certbot-nginx -y"
echo "      sudo certbot --nginx -d seudominio.com.br"
echo "======================================================"
