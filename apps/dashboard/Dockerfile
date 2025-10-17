# multi-stage build for nextjs dashboard

# stage 1: dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# copy root package files for workspace setup
COPY package*.json ./
COPY apps/dashboard/package*.json ./apps/dashboard/

# install dependencies
RUN npm ci

# stage 2: builder
FROM node:20-alpine AS builder

WORKDIR /app

# copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# copy dashboard source code
COPY apps/dashboard ./apps/dashboard
COPY package*.json ./

# set working directory to dashboard
WORKDIR /app/apps/dashboard

# build next.js application
RUN npm run build

# stage 3: production
FROM node:20-alpine AS production

WORKDIR /app

# copy root package files
COPY package*.json ./
COPY apps/dashboard/package*.json ./apps/dashboard/

# install only production dependencies
RUN npm ci --omit=dev

# copy built files from builder
COPY --from=builder /app/apps/dashboard/.next ./apps/dashboard/.next
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=builder /app/apps/dashboard/next.config.js ./apps/dashboard/

# set working directory to dashboard
WORKDIR /app/apps/dashboard

# expose dashboard port
EXPOSE 3000

# start next.js in production mode
CMD ["npm", "run", "start"]
