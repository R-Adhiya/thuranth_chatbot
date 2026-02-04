#!/bin/bash

# PDCP Platform Setup Script
echo "🚀 Setting up PDCP Platform..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16 or higher) first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create environment files from examples
echo "📝 Creating environment files..."

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
else
    echo "⚠️  backend/.env already exists, skipping..."
fi

if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env"
else
    echo "⚠️  frontend/.env already exists, skipping..."
fi

# Install dependencies
echo "📦 Installing dependencies..."

# Root dependencies
npm install

# Backend dependencies
echo "Installing backend dependencies..."
cd backend && npm install && cd ..

# Frontend dependencies
echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Mobile dependencies (optional)
if [ -d "mobile" ]; then
    echo "Installing mobile dependencies..."
    cd mobile && npm install && cd ..
fi

echo "✅ Dependencies installed"

# Set up database
echo "🗄️  Setting up database..."

# Start PostgreSQL and Redis using Docker
docker-compose -f docker/docker-compose.dev.yml up -d postgres redis

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Run database migrations (if using TypeORM)
cd backend && npm run migration:run 2>/dev/null || echo "⚠️  No migrations to run" && cd ..

echo "✅ Database setup complete"

# Set up blockchain network (optional)
read -p "Do you want to set up the blockchain network? (y/n): " setup_blockchain

if [ "$setup_blockchain" = "y" ] || [ "$setup_blockchain" = "Y" ]; then
    echo "🔗 Setting up blockchain network..."
    
    cd blockchain/network
    
    # Generate crypto materials
    ./scripts/generate-crypto.sh
    
    # Start the blockchain network
    docker-compose up -d
    
    # Wait for network to be ready
    echo "Waiting for blockchain network to be ready..."
    sleep 30
    
    # Deploy chaincode
    ./scripts/deploy-chaincode.sh
    
    cd ../..
    
    echo "✅ Blockchain network setup complete"
fi

# Create initial data (optional)
read -p "Do you want to create sample data? (y/n): " create_sample_data

if [ "$create_sample_data" = "y" ] || [ "$create_sample_data" = "Y" ]; then
    echo "📊 Creating sample data..."
    
    cd backend && npm run seed 2>/dev/null || echo "⚠️  No seed script available" && cd ..
    
    echo "✅ Sample data created"
fi

echo ""
echo "🎉 PDCP Platform setup complete!"
echo ""
echo "Next steps:"
echo "1. Update the .env files with your actual API keys and configuration"
echo "2. Start the development servers:"
echo "   npm run dev"
echo ""
echo "3. Access the applications:"
echo "   - Frontend Dashboard: http://localhost:3000"
echo "   - Backend API: http://localhost:3001"
echo "   - API Documentation: http://localhost:3001/api/docs"
echo ""
echo "For more information, see the README.md file."