FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY coordinator-service/package*.json ./coordinator-service/
COPY zone-node/package*.json ./zone-node/

# Install production dependencies
RUN cd coordinator-service && npm install --omit=dev
RUN cd zone-node && npm install --omit=dev

# Copy full service code
COPY coordinator-service ./coordinator-service
COPY zone-node ./zone-node
COPY start-all.js ./

# Railway dynamically assigns $PORT at runtime
ENV PORT=8080
EXPOSE 8080 8081 8082 8083

CMD ["node", "start-all.js"]
