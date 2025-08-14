# --------- STAGE 1: BUILD ---------
FROM node:20-alpine AS build
WORKDIR /app

# libs úteis
RUN apk add --no-cache openssl

# Copia manifestos primeiro (cache de deps)
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci

# Copia código
COPY . .

# Gera Prisma Client e faz build TS
RUN npx prisma generate
RUN npm run build

# Remove devDeps e deixa só prod (mantendo o client gerado)
RUN npm prune --omit=dev


# --------- STAGE 2: RUNTIME ---------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Copia somente o necessário do build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

EXPOSE 8080

# Importante: as migrações precisam do schema.prisma (está em /prisma)
# e do DATABASE_URL (injetado via docker-compose).
# Executa migrações, depois seed (idempotente), e sobe o servidor.
CMD sh -c "npx prisma migrate deploy || true && node dist/server.js"
