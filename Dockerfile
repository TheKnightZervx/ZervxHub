FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY bot/package.json bot/package.json
COPY bot/index.js bot/index.js

RUN corepack enable \
    && corepack prepare pnpm@11.25.0 --activate \
    && pnpm install --prod --filter zervxhub-discord-bot --frozen-lockfile

USER node
CMD ["node", "bot/index.js"]
