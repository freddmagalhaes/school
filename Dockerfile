# Estágio 1: Build (Compilação) usando Node 20
FROM node:20-alpine as build
WORKDIR /app

# Copia apenas os arquivos de dependência primeiro para otimizar o cache do Docker
COPY package.json package-lock.json* ./

# Instala as dependências (preferência para ci se houver package-lock.json)
RUN npm ci || npm install

# Copia o restante do código
COPY . .

# Faz o build de produção do React/Vite
RUN npm run build

# Estágio 2: Produção (Servidor Nginx)
FROM nginx:alpine

# Remove as configurações padrões do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia nossa configuração de roteamento SPA para o Nginx
COPY nginx.conf /etc/nginx/conf.d/

# Copia a pasta gerada pelo build para o Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Expõe a porta 80 internamente
EXPOSE 80

# Inicia o servidor
CMD ["nginx", "-g", "daemon off;"]