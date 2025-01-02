FROM oven/bun:latest AS base

WORKDIR /usr/src/app

FROM base AS prerelease

ENV NODE_ENV=production
COPY package.json bun.lockb .
RUN bun install --frozen-lockfile --production
COPY . .
RUN bun test
RUN bun run build

FROM base AS release

ENV NODE_ENV=production
COPY --from=prerelease /usr/src/app/dist/index.js .
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "index.js" ]
