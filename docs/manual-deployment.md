# Manual Deployment Guide

Simple steps for manual deployment: build locally, push to registry, pull on VPS.

## Quick Commands

### Windows (PowerShell)
```powershell
# Set variables
$env:DOCKER_USERNAME="your-username"
$env:DOCKER_IMAGE_NAME="uyren-courselit" 
$env:IMAGE_TAG="latest"

# Build & Push
docker login
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual build web
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual push web
```

### Linux/Mac (Bash)
```bash
# Set variables
export DOCKER_USERNAME=your-username
export DOCKER_IMAGE_NAME=courselit
export IMAGE_TAG=latest

# Build & Push
docker login
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual build web
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual push web
```

### VPS Deploy (Both)
```bash
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual pull
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual up -d
```

## Prerequisites

1. Copy env template: `cp env.prod-manual.template .env.prod-manual`
2. Edit `.env.prod-manual` with your actual values
3. Set Docker credentials:
   ```bash
   export DOCKER_USERNAME=your-username
   export DOCKER_IMAGE_NAME=courselit
   export IMAGE_TAG=latest
   ```

## Local Build & Push

### 1. Login to Docker Hub
```bash
docker login -u your-username
```

### 2. Build Images
```bash
# Web service
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual build web

# Queue service (optional)
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual build queue
```

### 3. Push Images
```bash
# Push web
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual push web

# Push queue (if built)
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual push queue
```

## VPS Deployment

### 1. On VPS - Setup
```bash
# Clone repo
git clone your-repo-url courselit
cd courselit/docker

# Copy and edit env file
cp env.prod-manual.template .env.prod-manual
nano .env.prod-manual
```

### 2. On VPS - Deploy
```bash
# Pull latest images
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual pull

# Start services
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual up -d

# Check status
docker compose -f docker-compose.prod-manual.yml ps
```

## Update Deployment

### Local
```bash
# Build new version with new tag
export IMAGE_TAG=v1.0.1
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual build web
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual push web
```

### VPS
```bash
# Update env file with new tag
echo "IMAGE_TAG=v1.0.1" >> .env.prod-manual

# Pull and restart
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual pull
docker compose -f docker-compose.prod-manual.yml --env-file .env.prod-manual up -d
```

## Useful Commands

```bash
# View logs
docker compose -f docker-compose.prod-manual.yml logs -f

# Stop services
docker compose -f docker-compose.prod-manual.yml down

# Clean up
docker system prune -f
```
