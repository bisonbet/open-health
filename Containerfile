FROM node:lts-alpine
LABEL authors="OpenHealth"

# Install dependencies
RUN apk add -U graphicsmagick ghostscript vips-dev fftw-dev build-base libpng libpng-dev poppler-utils

WORKDIR /app

# Copy package.json and prisma schema first to leverage Docker cache
COPY package.json prisma/ ./

# Install npm packages
RUN npm install && \
    npm install --save-dev @types/node

# Copy the rest of the application code
COPY . .

# Set build arguments
ARG OLLAMA_URL
ARG DOCLING_URL

# Debug: Print build arguments
RUN echo "Build ARG OLLAMA_URL: ${OLLAMA_URL}"
RUN echo "Build ARG DOCLING_URL: ${DOCLING_URL}"

# Check if OLLAMA_URL is using the default value
RUN if [ "${OLLAMA_URL}" = "http://ollama:11434" ]; then \
    echo "WARNING: Using default OLLAMA_URL value. This might not be what you want."; \
    echo "To use a different OLLAMA_URL:"; \
    echo "1. Unset the environment variable: unset OLLAMA_URL"; \
    echo "2. Set the correct value in your .env file"; \
    echo "3. Rebuild with: docker compose -f docker-compose.yaml --env-file .env build --no-cache app"; \
    exit 1; \
fi

# Set environment variables from build arguments with explicit default values
ENV OLLAMA_URL=${OLLAMA_URL:-http://ollama:11434}
ENV DOCLING_URL=${DOCLING_URL:-http://docling-serve:5001}

# Debug: Print environment variables
RUN echo "ENV OLLAMA_URL: ${OLLAMA_URL}"
RUN echo "ENV DOCLING_URL: ${DOCLING_URL}"

# Debug: Print the actual environment variable value
RUN env | grep OLLAMA_URL
RUN env | grep DOCLING_URL

# Build the application, create user, and set permissions
RUN npm run build && \
    adduser --disabled-password ohuser && \
    chown -R ohuser .

# Switch to the non-root user
USER ohuser

# Expose the application port
EXPOSE 3000

# Use shell command directly
CMD /bin/sh -c '\
    echo "Container starting..." && \
    echo "Current OLLAMA_URL from environment: [$OLLAMA_URL]" && \
    echo "Current DOCLING_URL from environment: [$DOCLING_URL]" && \
    echo "---" && \
    echo "Contents of prisma/data/llm-provider.json BEFORE substitution:" && \
    cat prisma/data/llm-provider.json || echo "Warning: prisma/data/llm-provider.json not found or cat command failed." && \
    echo "---" && \
    echo "Attempting to substitute placeholder in prisma/data/llm-provider.json with OLLAMA_URL: [$OLLAMA_URL]" && \
    sed -i "s|\"apiURL\": \"\${OLLAMA_URL}\"|\"apiURL\": \"$OLLAMA_URL\"|g" prisma/data/llm-provider.json && \
    echo "Substitution command executed." && \
    echo "---" && \
    echo "Contents of prisma/data/llm-provider.json AFTER substitution:" && \
    cat prisma/data/llm-provider.json || echo "Warning: cat command failed after sed." && \
    echo "---" && \
    echo "Running Prisma commands..." && \
    npx prisma generate && \
    npx prisma db push --accept-data-loss && \
    npx prisma db seed && \
    echo "---" && \
    echo "Starting application (npm start)..." && \
    npm start'
