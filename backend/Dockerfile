# Use Node.js 18 Alpine image for smaller size and better compatibility
FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache make gcc g++ python3

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Clean install to ensure fresh native bindings
RUN npm ci --only=production

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start the application
CMD ["node", "index.js"]
