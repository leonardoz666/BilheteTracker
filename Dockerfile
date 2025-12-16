FROM node:20-alpine

# Diretório de trabalho
WORKDIR /app


# Copia os arquivos package.json e package-lock.json
COPY package.json ./
COPY package-lock.json ./


# Instala dependências
RUN npm install --frozen-lockfile

# Copia o restante do código
COPY . .


# Build (caso necessário)
RUN npm run build || echo "Nenhum script de build definido"


# Porta padrão (ajuste se necessário)
EXPOSE 3000


# Comando para iniciar a aplicação
CMD ["npm", "start"]
