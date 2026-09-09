FROM node:22-alpine AS deps
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /workspace
COPY --from=deps /workspace/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY web /workspace/web
COPY api/src /workspace/api/src
RUN npm run build

FROM node:22-alpine AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /workspace
COPY --from=build --chown=node:node /workspace/package.json /workspace/package-lock.json ./
COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/web/.next ./web/.next
COPY --from=build --chown=node:node /workspace/api /workspace/api
RUN npm prune --omit=dev && npm cache clean --force
USER node
CMD ["npm","start"]
