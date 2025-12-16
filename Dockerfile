FROM node:20-alpine

# Diretório de trabalho
WORKDIR /app

# Copia os arquivos package.json e package-lock.json (ou pnpm-lock.yaml)
COPY package.json ./
COPY pnpm-lock.yaml ./

# Instala dependências
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copia o restante do código
COPY . .

# Build (caso necessário)
RUN pnpm run build || echo "Nenhum script de build definido"

# Porta padrão (ajuste se necessário)
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["pnpm", "start"]
