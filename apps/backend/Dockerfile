# multi-stage build for nestjs backend

# stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

# copy root package files for workspace setup
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# install dependencies
RUN npm ci

# copy backend source code
COPY apps/backend ./apps/backend

# build backend
WORKDIR /app/apps/backend
RUN npm run build

# stage 2: production
FROM node:20-alpine AS production

WORKDIR /app

# copy root package files
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

# install only production dependencies
RUN npm ci --omit=dev

# copy built files from builder stage
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# set working directory to backend
WORKDIR /app/apps/backend

# expose backend port
EXPOSE 3001

# run migrations and start application
CMD ["sh", "-c", "npm run migration:run:prod && npm run start:prod"]
