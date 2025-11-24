# Install dependencies and build
FROM node:20-bookworm AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image
FROM node:20-bookworm
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y \
    && apt-get install -y openssl libssl3 \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
RUN npx prisma generate
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
