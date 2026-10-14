FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions
COPY coordinator-service/package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application code
COPY coordinator-service/src ./src

EXPOSE 8080

CMD ["node", "src/index.js"]
