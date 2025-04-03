#!/bin/bash

# Start Ollama in the background.
/bin/ollama serve &
# Record Process ID.
pid=$!

# Pause for Ollama to start.
sleep 5

echo "🔴 Retrieving necessary models..."
ollama pull gemma3:4b
ollama pull deepseek-r1:8b
echo "🟢 Done!"

# Wait for Ollama process to finish.
wait $pid
