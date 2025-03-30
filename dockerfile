# Use Node.js as the base image
FROM node:18-bullseye

# Set the working directory
WORKDIR /app

# Install Python and other required dependencies
RUN apt-get update && \
    apt-get install -y python3 python-is-python3 ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create symbolic link for python (some tools expect 'python', not 'python3')
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Copy package.json and package-lock.json
COPY package*.json ./

# Skip the youtube-dl-exec binary download, we'll handle installation manually
ENV YOUTUBE_DL_SKIP_BINARY_DOWNLOAD=1

# Install dependencies
RUN npm ci

# Copy yt-dlp binary from GitHub release
RUN mkdir -p node_modules/youtube-dl-exec/bin && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o node_modules/youtube-dl-exec/bin/yt-dlp && \
    chmod +x node_modules/youtube-dl-exec/bin/yt-dlp

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:prod"]