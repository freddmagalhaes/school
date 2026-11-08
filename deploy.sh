#!/bin/bash
# =============================================================
# deploy.sh — Script de deploy do EduGestão Pro na AWS EC2
# =============================================================
# Uso: ./deploy.sh <IP_DA_EC2> <CAMINHO_CHAVE_PEM>
# Exemplo: ./deploy.sh 54.234.12.99 ~/.ssh/edugestao.pem
#
# Publicação sem site fora do ar: o build novo é enviado para uma pasta ao lado
# e só então trocado pela atual. A versão anterior fica em <APP_DIR>.prev.
# Reverter:  ssh ... 'cd /var/www/edugestao && mv school bad && mv school.prev school && rm -rf bad'
# =============================================================

set -e  # Para se qualquer comando falhar

EC2_IP="${1:-ec2-52-2-205-190.compute-1.amazonaws.com}"
CHAVE_PEM="${2:-~/.ssh/key-server.pem}"
EC2_USER="${3:-ubuntu}"        # Padrão Ubuntu AMI; use 'ec2-user' para Amazon Linux
APP_DIR="/var/www/edugestao/school"   # Pasta onde os arquivos serão servidos pelo Nginx
DOMAIN="${4:-}"
CERTBOT_EMAIL="${5:-admin@${DOMAIN}}"

# Verifica argumentos
if [ -z "$EC2_IP" ]; then
  echo "❌ Uso: ./deploy.sh <IP_DA_EC2> [CAMINHO_CHAVE_PEM] [EC2_USER] [DOMINIO] [EMAIL_CERTBOT]"
  echo "   Exemplo: ./deploy.sh 52.2.205.190 ~/.ssh/key-server.pem ubuntu example.com admin@example.com"
  echo "   O domínio é opcional; se for informado, o script tentará configurar HTTPS com Certbot."
  exit 1
fi

echo "======================================================"
echo "   🚀 EduGestão Pro — Deploy para AWS EC2"
echo "   Servidor: $EC2_USER@$EC2_IP"
echo "======================================================"

# 0. O build embute a URL e a chave pública do Supabase: sem elas o site sobe "em branco".
if [ -z "${VITE_SUPABASE_URL:-}" ] && ! grep -qsE '^VITE_SUPABASE_URL=.+' .env .env.local .env.production .env.production.local 2>/dev/null; then
  echo "❌ VITE_SUPABASE_URL não está definida (variável de ambiente ou .env.production/.env.local)."
  echo "   Sem ela o build não conversa com o Supabase. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
  exit 1
fi

# 1. Build de produção local (o build roda tsc -b: erro de tipo aborta o deploy, de propósito)
echo ""
echo "📦 [1/4] Gerando build de produção..."
npm run build
[ -f dist/index.html ] || { echo "❌ dist/index.html não existe: build falhou."; exit 1; }
echo "✅ Build concluído: pasta dist/ gerada"

# 2. Prepara o servidor (instala Nginx se necessário)
echo ""
echo "🔧 [2/4] Preparando servidor remoto..."
ssh -i "$CHAVE_PEM" -o StrictHostKeyChecking=accept-new "$EC2_USER@$EC2_IP" << 'ENDSSH'
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
  sudo mkdir -p /var/www/edugestao/school
  sudo chown -R $USER:$USER /var/www/edugestao
ENDSSH
echo "✅ Servidor preparado"

# 3. Upload dos arquivos de build para o servidor
echo ""
echo "📤 [3/4] Enviando arquivos para o servidor..."
# Envia para uma pasta nova; o site atual continua no ar durante o upload.
ssh -i "$CHAVE_PEM" "$EC2_USER@$EC2_IP" "rm -rf '$APP_DIR.new' && mkdir -p '$APP_DIR.new'"
scp -i "$CHAVE_PEM" -r dist/* "$EC2_USER@$EC2_IP:$APP_DIR.new/"
# Troca (rápida) e guarda a versão anterior para reverter.
ssh -i "$CHAVE_PEM" "$EC2_USER@$EC2_IP" "rm -rf '$APP_DIR.prev'; if [ -d '$APP_DIR' ]; then mv '$APP_DIR' '$APP_DIR.prev'; fi; mv '$APP_DIR.new' '$APP_DIR'"
echo "✅ Upload concluído (versão anterior em $APP_DIR.prev)"

# 4. Configura o Nginx e reinicia
echo ""
echo "⚙️  [4/4] Configurando Nginx e reiniciando serviços..."
ssh -i "$CHAVE_PEM" "$EC2_USER@$EC2_IP" << ENDSSH
  # Não sobrescreve a configuração se o Certbot já a alterou (isso derrubaria o HTTPS a cada deploy).
  if grep -qs 'managed by Certbot' /etc/nginx/sites-available/edugestao; then
    echo "  → Config do Nginx já tem HTTPS (Certbot): mantida."
  else
  sudo tee /etc/nginx/sites-available/edugestao > /dev/null << 'NGINX_CONF'
server {
    listen 80;
    server_name _;

    root /var/www/edugestao/school;
    index index.html;

    # Security Headers para Producao
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    # CSP só em modo relatório: observe o console por alguns dias antes de trocar para Content-Security-Policy.
    add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.qrserver.com; frame-ancestors 'self'" always;

    # Garante que os MIME types sejam carregados corretamente
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Necessário para que as rotas do React Router funcionem
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache para assets estáticos com MIME types corretos
    location ~* \.(js|mjs)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        types { application/javascript js mjs; }
    }

    location ~* \.(css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Compressão gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
NGINX_CONF
  fi

  # Ativa o site e remove o default
  sudo ln -sf /etc/nginx/sites-available/edugestao /etc/nginx/sites-enabled/edugestao
  sudo rm -f /etc/nginx/sites-enabled/default

  # Testa e recarrega o Nginx
  sudo nginx -t
  sudo systemctl reload nginx
  echo "✅ Nginx reconfigurado e recarregado"

  if [ -n "$DOMAIN" ]; then
    echo "🔐 Configurando HTTPS para $DOMAIN..."
    if ! command -v certbot >/dev/null 2>&1; then
      sudo apt-get install -y certbot python3-certbot-nginx
    fi
    sudo certbot --nginx --non-interactive --agree-tos --redirect --email "$CERTBOT_EMAIL" -d "$DOMAIN" || true
    echo "✅ HTTPS configurado para $DOMAIN (se o domínio estiver apontando para o servidor)."
  fi
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
