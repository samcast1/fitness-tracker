# Personal Fitness Tracker

A customized exercise progress tracker for monitoring workouts, dietary habits, sleep, and overall fitness.

## Features

- Workout logging with customizable exercises
- Progress tracking and visualization
- Sleep and diet monitoring
- Personal fitness dashboard
- Local hosting on home network

## Requirements

- Podman
- Podman Compose
- Python 3.11+

## Getting Started

1. Clone this repository
2. Run the start script:

```
./scripts/start.sh
```
3. Access the web interface at http://localhost:8000

## Development

To run in development mode with hot reloading:

```
podman-compose up
```

## Structure

- `/app` - Main application code
- `/data` - Data storage and persistence
- `/scripts` - Utility scripts