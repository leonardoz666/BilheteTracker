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


# Build (sempre do zero)
RUN rm -rf dist && npm run build


# Porta padrão (ajuste se necessário)
EXPOSE 3000


# Comando para iniciar a aplicação
CMD ["npm", "start"]
