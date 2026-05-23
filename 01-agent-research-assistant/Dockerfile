FROM node:20-alpine AS builder
WORKDIR /app/server
COPY server/package.json ./
RUN npm install
COPY server/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app/server
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/package.json ./
COPY --from=builder /app/server/node_modules ./node_modules
RUN mkdir -p /app/server/data
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/server/data/agent.db
EXPOSE 3000
CMD ["node", "dist/index.js"]
