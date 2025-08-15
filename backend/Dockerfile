FROM node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

RUN npm prune --omit=dev


FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

EXPOSE 8080

CMD sh -c "npx prisma migrate deploy || true && node dist/server.js"
