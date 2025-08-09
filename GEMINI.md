# OpenHealth & Gemini: A Developer's Guide

This document provides a guide for developers on how to leverage and extend the OpenHealth platform, with a focus on its integration with Large Language Models (LLMs) like Google's Gemini. It covers the project's architecture, data processing pipelines, and AI integration points, offering a roadmap for contributors.

## Project Philosophy

OpenHealth is built on the principle of **data ownership and privacy**. It empowers users to take control of their health information by providing a private, locally-runnable AI assistant. The platform's architecture is designed to be modular, extensible, and secure, allowing for the integration of various data sources and LLM providers.

## Core Architecture

OpenHealth is a full-stack application built with Next.js 15 and TypeScript. Its architecture is divided into several key layers:

-   **Frontend**: A responsive and accessible user interface built with React, Tailwind CSS, and shadcn/ui.
-   **Backend**: Next.js API routes handle business logic, authentication, and data processing.
-   **Database**: PostgreSQL with Prisma ORM for type-safe database access.
-   **Authentication**: JWT-based authentication using NextAuth.js v5.
-   **AI Integration**: A flexible LLM integration layer supporting providers like Ollama, Anthropic, and Google Gemini through LangChain.

### Data Flow

The data processing pipeline is central to OpenHealth's functionality:

1.  **Data Ingestion**: Users upload health data from various sources (e.g., clinical records, lab results, wearable device data).
2.  **Parsing & Standardization**: The `docling` service parses these documents, extracts structured information, and converts it into a unified health data format.
3.  **LLM Processing**: The structured data is then used as context for LLM interactions, enabling personalized and informed conversations.
4.  **User Interaction**: Users engage with the AI assistant through a chat interface, asking questions and receiving insights based on their health data.

## Extending with Gemini

The platform's modular design makes it straightforward to integrate and extend its capabilities with Google's Gemini models. Here are some ways developers can contribute:

### 1. Enhancing Data Parsing with Gemini Vision

The current document parsing pipeline uses `docling` and a local vision model with Ollama. This can be extended to use the **Gemini Vision API** for more advanced document analysis.

-   **File**: `src/lib/health-data/parser/vision/index.ts` (conceptual)
-   **Task**: Implement a new vision parser that calls the Gemini Vision API to extract structured data from images and PDFs. This could involve:
    -   Creating a new function, `parseWithGeminiVision`, that takes a file buffer and sends it to the Gemini API.
    -   Mapping the Gemini API's response to the standardized `HealthData` schema.
    -   Updating the API route in `src/app/api/health-data-parser/visions/route.ts` to use the new Gemini-powered parser.

### 2. Advanced Conversational AI with Gemini Pro

The chat functionality can be enhanced by leveraging the advanced reasoning and conversational capabilities of **Gemini Pro**.

-   **File**: `src/lib/llm/index.ts` (conceptual)
-   **Task**: Integrate Gemini Pro as a new LLM provider for chat interactions.
    -   Add a new `GeminiLLM` class that implements the `BaseLLM` interface.
    -   Use the `@google/generative-ai` package to interact with the Gemini API.
    -   Update the chat room logic to allow users to select Gemini Pro as their assistant's language model.
    -   Explore using Gemini's function calling capabilities to create more interactive and tool-using agents.

### 3. Proactive Health Insights with Gemini

Leverage Gemini's analytical capabilities to provide proactive health insights and recommendations.

-   **Task**: Create a new service that periodically analyzes a user's health data and generates personalized insights.
    -   Develop a background job (e.g., using a service like Trigger.dev) that runs daily or weekly.
    -   In the job, fetch the user's latest health data and use Gemini to analyze trends, identify potential risks, and suggest preventative measures.
    -   Store these insights in the database and notify the user through the application's UI.

## Getting Started with Development

To contribute to OpenHealth, follow these steps:

1.  **Fork and Clone the Repository**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/open-health.git
    cd open-health
    ```

2.  **Set Up the Environment**:
    -   Copy the `.env.example` file to `.env` and populate it with your configuration, including API keys for any external services you wish to use (like the Gemini API).
    -   To generate an encryption key, run:
        ```bash
        echo $(head -c 32 /dev/urandom | base64)
        ```

3.  **Run the Application**:
    -   For a complete, self-contained setup with local LLM and document parsing, use Docker Compose:
        ```bash
        docker-compose -f docker-compose.yaml --env-file .env --profile ollama,docling up -d
        ```

4.  **Start Coding**:
    -   The application will be available at `https://localhost`.
    -   Familiarize yourself with the codebase, starting with the `src/app` directory for pages and API routes, and `src/lib` for business logic.

## Contribution Guidelines

-   **Follow the Code Style**: Adhere to the existing code style and conventions (ESLint and Prettier are enforced).
-   **Write Clear Commit Messages**: Your commit messages should be descriptive and follow conventional commit standards.
-   **Create Pull Requests**: Submit your changes via a pull request with a clear description of the work you've done.

By contributing to OpenHealth, you're helping to build a future where everyone can take control of their health data with the power of AI.
