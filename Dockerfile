FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
# `prepare` needs git and the message files, and the build compiles messages anyway.
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
# A Session gate may redirect `/`, so a redirect is as healthy as a page.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/`, { redirect: 'manual' }).then((r) => process.exit(r.status < 400 ? 0 : 1), () => process.exit(1))"]
CMD ["node", ".output/server/index.mjs"]
