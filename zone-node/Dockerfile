FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions
COPY zone-node/package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application code and schema
COPY zone-node/src ./src
COPY zone-node/src/schema.sql ./src/schema.sql

EXPOSE 8081 8082 8083

CMD ["node", "src/index.js"]
