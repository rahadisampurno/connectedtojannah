FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN corepack enable && pnpm install --no-frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
RUN corepack enable && pnpm install --prod --no-frozen-lockfile
COPY --from=build /app/dist ./dist
USER node
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node","dist/src/main.js"]
