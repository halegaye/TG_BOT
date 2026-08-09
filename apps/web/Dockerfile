FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @tg-bot/web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["pnpm", "--filter", "@tg-bot/web", "start"]
