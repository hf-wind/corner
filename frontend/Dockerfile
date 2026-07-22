FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/.nuxt \
    npx nuxt build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package*.json ./
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", ".output/server/index.mjs"]
