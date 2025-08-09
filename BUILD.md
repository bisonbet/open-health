# Building OpenHealth for Development

This guide provides instructions for setting up a local development environment for OpenHealth. These steps are intended for developers who want to contribute to the project and need to run the application from source on their local machine.

For production-like deployments or to run the application without setting up a local toolchain, please refer to the Docker instructions in the [README.md](./README.md).

## Prerequisites

- **Node.js**: Version 20.x or later. We recommend using a version manager like [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm).
- **Package Manager**: This project uses `npm`. Ensure it's installed (it comes with Node.js).
- **Git**: For cloning the repository.
- **Docker/Podman** (Optional but Recommended): Even for local development, you will need the backend services (`Ollama` for LLMs and `Docling` for document parsing) to be running. The easiest way to run them is via the provided `docker-compose.yaml`.

## 1. Clone the Repository

```bash
git clone https://github.com/bisonbet/open-health.git
cd open-health
```

## 2. Set Up Backend Services

The OpenHealth frontend requires backend services for AI models and document parsing. You can run these using Docker Compose.

```bash
# Start the backend services (Ollama and Docling)
docker compose -f docker-compose.yaml --profile ollama,docling up -d
```

> **Note:** On the first run, this will download the required AI models, which may take some time.

## 3. Configure Environment Variables

Copy the example environment file and fill in the necessary values.

```bash
cp .env.example .env
```

You will need to edit `.env`. At a minimum, ensure the following are set correctly to point to your local services:

```dotenv
# URL for the Ollama service
OLLAMA_URL=http://localhost:11434

# URL for the Docling service
DOCLING_URL=http://localhost:5001

# Generate a unique encryption key
ENCRYPTION_KEY= # Run `echo $(head -c 32 /dev/urandom | base64)` and paste the output here
```

Refer to the `README.md` for more details on other environment variables.

## 4. Install Dependencies

Install the project's Node.js dependencies.

```bash
npm install
```

## 5. Run the Development Server

Start the Next.js development server.

```bash
npm run dev
```

The application should now be running at http://localhost:3000.

Happy coding!