#!/bin/bash

# Navigate to the project root
cd "$(dirname "$0")/.."

echo "Ensuring any old containers are stopped and removed..."
podman-compose down 2>/dev/null || true

echo "Creating a podman network if it doesn't exist..."
podman network inspect fitness-tracker_default >/dev/null 2>&1 || podman network create fitness-tracker_default

echo "Building the application image..."
podman-compose build

echo "Starting the containers..."
podman-compose up -d

echo "Containers started! Access the application at: http://localhost:8000"
echo "To view logs: podman-compose logs -f"

# Exit cleanly
exit 0