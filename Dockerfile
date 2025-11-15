# Use Debian-based Node image (NOT Alpine)
FROM node:18

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy Prisma files
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the backend
COPY . .

# Build TypeScript
RUN npm run build

# Expose port 4000 (Fly will map internally)
EXPOSE 4000

# Start server
CMD ["npm", "run", "start"]


