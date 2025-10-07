# Docker Deployment Guide

This document provides comprehensive instructions for deploying the Courselit application using Docker in production environments, including CI/CD setup and VPS deployment.

## Project Architecture

The project consists of:

- **Web App**: Next.js application (`apps/web`)
- **Queue Service**: Express.js service for background jobs (`apps/queue`)
- **Redis**: For caching and job queues
- **MongoDB**: Primary database

## Prerequisites

- Docker and Docker Compose installed on VPS
- Git repository access
- SSH access to VPS

## Local Development Setup

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd uyren-courselit-my
   ```

2. **Start development environment**

   ```bash
   cd docker
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Install dependencies and run locally**
   ```bash
   pnpm install
   pnpm dev
   ```

## Production Deployment

### 1. Environment Configuration

1. **Copy environment template**

   ```bash
   cd docker
   cp env.prod.template .env.prod
   ```

2. **Edit environment variables**

   ```bash
   nano .env.prod
   ```

   Update all values with your production credentials.

### 2. Deploy to Production

1. **Build and start services**

   ```bash
   cd docker
   docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

2. **Check service status**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   docker-compose -f docker-compose.prod.yml logs -f
   ```

## CI/CD Pipeline Setup

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.4.1

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build applications
        run: pnpm build

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /path/to/your/project
            git pull origin main
            cd docker
            docker-compose -f docker-compose.prod.yml --env-file .env.prod down
            docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
            docker system prune -f
```

### Required Secrets

Add these secrets to your GitHub repository:

- `VPS_HOST`: Your VPS IP address or domain
- `VPS_USERNAME`: SSH username
- `VPS_SSH_KEY`: Private SSH key for authentication

## VPS Setup Instructions

### 1. Initial Server Setup

1. **Update system**

   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Docker**

   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **Install Docker Compose**
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

### 2. Project Deployment

1. **Clone repository**

   ```bash
   git clone <your-repo-url>
   cd uyren-courselit-my
   ```

2. **Setup environment**

   ```bash
   cd docker
   cp env.prod.template .env.prod
   # Edit .env.prod with your values
   ```

3. **Deploy**
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

## Monitoring and Maintenance

### 1. Service Status

- **Services**: Check Docker container status
- **Database**: MongoDB connection health

### 2. Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f queue
```

### 3. Backup Strategy

1. **Database backup**

   ```bash
   docker exec courselit-mongo-prod mongodump --out /backup/$(date +%Y%m%d_%H%M%S)
   ```

2. **Volume backup**
   ```bash
   docker run --rm -v courselit_mongo_data:/data -v $(pwd):/backup alpine tar czf /backup/mongo_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
   ```

### 4. Updates and Rollbacks

1. **Update application**

   ```bash
   git pull origin main
   docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

2. **Rollback** (if needed)
   ```bash
   git checkout <previous-commit>
   docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 3001, 27017, 6379 are available
2. **Memory issues**: Monitor container resource usage
3. **Database connection**: Verify MongoDB credentials and network connectivity

### Debug Commands

```bash
# Check container status
docker ps -a

# Inspect container
docker inspect <container_name>

# Execute commands in container
docker exec -it <container_name> /bin/sh

# View resource usage
docker stats
```

## Security Considerations

1. **Firewall setup**: Configure UFW or iptables
2. **Regular updates**: Keep Docker images updated
3. **Secret management**: Use environment variables, never commit secrets
4. **Network isolation**: Use Docker networks for service communication

---
**Tip for Windows PowerShell users:**

To set environment variables `FAIZULLIN` and `UYREN_COURSELIT` inline and run Docker Compose in a single command:

```powershell
$env:FAIZULLIN="your_faizullin_value"; $env:UYREN_COURSELIT="your_uyren_courselit_value"; docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Replace the values as needed for your deployment.
## Performance Optimization

1. **Resource limits**: Set appropriate memory and CPU limits
2. **Caching**: Utilize Redis effectively
3. **Database indexing**: Optimize MongoDB queries
4. **Load balancing**: Scale horizontally if needed

## Support

For deployment issues:

1. Check Docker logs
2. Verify environment variables
3. Ensure all services are healthy
4. Check network connectivity
5. Review security group/firewall settings
