FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

COPY prisma ./prisma/

RUN npm install

COPY . .
RUN npx prisma generate

CMD ["npm", "run", "dev"]


# # Etapa 1: Build
# FROM node:20-alpine AS builder

# RUN npm install -g npm@10.9.3

# WORKDIR /app

# COPY package.json ./

# RUN npm install

# COPY . .

# EXPOSE 3001

# RUN npx prisma generate

# # RUN npx prisma migrate

# CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]

# Gera Prisma Client durante build
# RUN npx prisma generate

# # Compila projeto TypeScript
# RUN npm run build


# # Etapa 2: Produção
# FROM node:20-alpine

# WORKDIR /app

# COPY --from=builder /app/package*.json ./
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/.env .env
# COPY --from=builder /app/prisma ./prisma
# COPY --from=builder /app/dist ./dist

# # Copia também os arquivos gerados do Prisma Client
# COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# EXPOSE 3000

# # Remove o "npx prisma generate" do CMD
# CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
