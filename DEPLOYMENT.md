# PDCP Platform Deployment Guide

This guide covers the deployment of the Post-Dispatch Consolidation Platform across different environments.

## Prerequisites

### System Requirements
- **Server:** Ubuntu 20.04+ or CentOS 8+
- **RAM:** Minimum 8GB (16GB recommended for production)
- **Storage:** Minimum 100GB SSD
- **CPU:** 4+ cores recommended

### Software Dependencies
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Nginx (for production)

## Environment Setup

### 1. Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd pdcp-platform

# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start development servers
npm run dev
```

### 2. Staging Environment

```bash
# Set environment variables
export NODE_ENV=staging
export DB_HOST=staging-db.pdcp.com
export REDIS_HOST=staging-redis.pdcp.com

# Build applications
npm run build

# Start services
docker-compose -f docker/docker-compose.staging.yml up -d
```

### 3. Production Environment

#### Database Setup
```bash
# PostgreSQL setup
sudo apt update
sudo apt install postgresql-15 postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE pdcp_prod;
CREATE USER pdcp_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE pdcp_prod TO pdcp_user;
```

#### Redis Setup
```bash
# Install Redis
sudo apt install redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf
# Set: bind 127.0.0.1
# Set: requirepass your_redis_password
# Set: maxmemory 2gb
# Set: maxmemory-policy allkeys-lru

sudo systemctl restart redis-server
```

#### Application Deployment
```bash
# Build for production
npm run build:backend
npm run build:frontend

# Set up environment variables
cp backend/.env.example backend/.env.production
cp frontend/.env.example frontend/.env.production

# Edit production environment files with actual values
nano backend/.env.production
nano frontend/.env.production

# Start production services
docker-compose -f docker/docker-compose.prod.yml up -d
```

## Configuration

### Environment Variables

#### Backend (.env.production)
```env
NODE_ENV=production
PORT=3001
DB_HOST=your-db-host
DB_PASSWORD=your-secure-db-password
JWT_SECRET=your-super-secure-jwt-secret
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
REDIS_PASSWORD=your-redis-password
SHADOW_MODE=false
```

#### Frontend (.env.production)
```env
VITE_API_BASE_URL=https://api.pdcp.com
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_FIREBASE_API_KEY=your-firebase-api-key
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/pdcp
server {
    listen 80;
    server_name pdcp.com www.pdcp.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pdcp.com www.pdcp.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;

    # Frontend
    location / {
        root /var/www/pdcp/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Blockchain Network Deployment

### 1. Generate Certificates
```bash
cd blockchain/network
./scripts/generate-crypto.sh
```

### 2. Start Blockchain Network
```bash
docker-compose -f blockchain/network/docker-compose.yml up -d
```

### 3. Deploy Chaincode
```bash
./scripts/deploy-chaincode.sh
```

### 4. Verify Network
```bash
docker exec cli peer channel list
docker exec cli peer chaincode list --installed
```

## Monitoring and Logging

### 1. Application Monitoring
```bash
# Install PM2 for process management
npm install -g pm2

# Start backend with PM2
cd backend
pm2 start dist/main.js --name "pdcp-backend"

# Monitor processes
pm2 monit
```

### 2. Log Management
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/pdcp

/var/log/pdcp/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 pdcp pdcp
    postrotate
        systemctl reload nginx
    endscript
}
```

### 3. Health Checks
```bash
# Backend health check
curl https://api.pdcp.com/health

# Database connection check
curl https://api.pdcp.com/health/db

# Redis connection check
curl https://api.pdcp.com/health/redis
```

## Security Configuration

### 1. Firewall Setup
```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. SSL Certificate
```bash
# Using Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d pdcp.com -d www.pdcp.com
```

### 3. Database Security
```bash
# PostgreSQL security
sudo nano /etc/postgresql/15/main/postgresql.conf
# Set: listen_addresses = 'localhost'

sudo nano /etc/postgresql/15/main/pg_hba.conf
# Configure authentication methods
```

## Backup and Recovery

### 1. Database Backup
```bash
# Create backup script
cat > /opt/pdcp/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/pdcp/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U pdcp_user pdcp_prod > $BACKUP_DIR/pdcp_backup_$DATE.sql
find $BACKUP_DIR -name "pdcp_backup_*.sql" -mtime +7 -delete
EOF

chmod +x /opt/pdcp/backup-db.sh

# Schedule with cron
echo "0 2 * * * /opt/pdcp/backup-db.sh" | crontab -
```

### 2. Application Backup
```bash
# Backup application files
tar -czf /opt/pdcp/backups/app_backup_$(date +%Y%m%d).tar.gz \
    /var/www/pdcp \
    /opt/pdcp/config
```

## Scaling Considerations

### 1. Horizontal Scaling
- Use load balancer (HAProxy/Nginx)
- Deploy multiple backend instances
- Implement Redis clustering
- Use PostgreSQL read replicas

### 2. Vertical Scaling
- Monitor resource usage
- Scale CPU/RAM based on load
- Optimize database queries
- Implement caching strategies

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check connection
   psql -h localhost -U pdcp_user -d pdcp_prod
   ```

2. **Redis Connection Failed**
   ```bash
   # Check Redis status
   sudo systemctl status redis-server
   
   # Test connection
   redis-cli ping
   ```

3. **Google Maps API Errors**
   - Verify API key is valid
   - Check API quotas and billing
   - Ensure required APIs are enabled

4. **WebSocket Connection Issues**
   - Check firewall rules
   - Verify proxy configuration
   - Monitor connection logs

### Log Locations
- Backend logs: `/var/log/pdcp/backend.log`
- Nginx logs: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- PostgreSQL logs: `/var/log/postgresql/postgresql-15-main.log`
- Redis logs: `/var/log/redis/redis-server.log`

## Performance Optimization

### 1. Database Optimization
```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_parcels_status ON parcels(status);
CREATE INDEX idx_parcels_carrier ON parcels(carrier_name);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_location ON vehicles(current_lat, current_lng);
```

### 2. Caching Strategy
- Implement Redis caching for frequently accessed data
- Cache Google Maps API responses
- Use CDN for static assets

### 3. API Optimization
- Implement request rate limiting
- Use compression (gzip)
- Optimize database queries
- Implement pagination

## Maintenance

### Regular Tasks
1. **Daily**
   - Monitor system resources
   - Check application logs
   - Verify backup completion

2. **Weekly**
   - Update system packages
   - Review performance metrics
   - Clean up old logs

3. **Monthly**
   - Security updates
   - Database maintenance
   - Performance review

### Update Procedure
```bash
# 1. Backup current version
./scripts/backup.sh

# 2. Pull latest changes
git pull origin main

# 3. Install dependencies
npm run install:all

# 4. Run migrations
cd backend && npm run migration:run

# 5. Build applications
npm run build

# 6. Restart services
pm2 restart all
sudo systemctl reload nginx
```

This deployment guide ensures a robust, secure, and scalable deployment of the PDCP platform across different environments.