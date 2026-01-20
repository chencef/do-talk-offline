# Use Node.js 18 alpine for lightweight image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first to leverage cache
COPY package.json package-lock.json* ./

# Install dependencies (legacy-peer-deps to avoid conflicts)
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port 3000 (standard for Next.js)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
