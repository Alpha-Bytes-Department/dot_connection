FROM node:22-alpine

WORKDIR /app

RUN corepack enable
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN pnpm prisma:generate

# Compile TypeScript
RUN pnpm build

EXPOSE 5009

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/server.js"]