FROM oven/bun:latest AS base
WORKDIR /usr/src/app

FROM base AS prerelease
COPY package.json bun.lockb .
RUN bun install --frozen-lockfile --production
COPY . .
ENV NODE_ENV=production
RUN bun test
RUN bun run build

FROM base AS release
COPY --from=prerelease /usr/src/app/dist/index.js .

USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "index.js" ]
