FROM node:18-slim

# Install Python and other dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python-is-python3 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Set environment variable to skip binary download (optional)
ENV YOUTUBE_DL_SKIP_BINARY_DOWNLOAD=1

# Install dependencies
RUN npm ci

# Copy app source
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "run", "start:prod"]