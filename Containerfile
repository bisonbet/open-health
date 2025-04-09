FROM node:lts-alpine
LABEL authors="OpenHealth"

ARG OLLAMA_BUILD

RUN apk add -U graphicsmagick ghostscript vips-dev fftw-dev build-base libpng libpng-dev poppler-utils

WORKDIR /app

COPY package.json prisma/ .

RUN npm install

COPY . .

RUN npm run build && \
    adduser --disabled-password ohuser && \
    chown -R ohuser .

USER ohuser
EXPOSE 3000
CMD source .env && \
    echo $OLLAMA_URL > /tmp/ollama_url && \
    OLLAMA_URL=$(cat /tmp/ollama_url) && \
    if [ -z "$OLLAMA_URL" ]; then \
        OLLAMA_URL="http://ollama:11434"; \
    fi && \
    echo "Updating prisma/data/llm-provider.json with OLLAMA_URL: $OLLAMA_URL" && \
    sed -i "s|\\\"url\\\": \\\".*\\\"|\\\"url\\\": \\\"$OLLAMA_URL\\\"|g" prisma/data/llm-provider.json && \
    npx prisma db push --accept-data-loss && \
    npx prisma db seed && \
    npm start