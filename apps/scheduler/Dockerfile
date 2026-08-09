FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @tg-bot/database exec prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
CMD ["pnpm", "--filter", "@tg-bot/scheduler", "start"]
