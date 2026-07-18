FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM base AS release
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY package.json server.tsx prisma.config.ts custom-routes.ts ./
COPY prisma ./prisma

ENV NODE_ENV=production
EXPOSE 8080

CMD ["bun", "run", "server.tsx"]
