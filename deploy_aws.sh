#!/bin/bash
# AWS EC2 Deployment Script for seller-Service-2-main
set -e

# Variables
SERVICE_NAME="seller-service"
REPO_URL="https://github.com/couture-Services-Pvt-Ltd/seller-Service-2-main.git"  # Updated repo URL
DEPLOY_PATH="/home/ec2-user/$SERVICE_NAME"
NODE_VERSION="18"

echo "=== Starting deployment for $SERVICE_NAME ==="

# Update system packages
echo "Updating system packages..."
sudo yum update -y

# Install required dependencies
echo "Installing dependencies..."
sudo yum install -y git curl wget

# Install Node.js
echo "Installing Node.js $NODE_VERSION..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
source ~/.nvm/nvm.sh
nvm install $NODE_VERSION
nvm use $NODE_VERSION
nvm alias default $NODE_VERSION

# Install PM2 globally
echo "Installing PM2..."
npm install -g pm2

# Install Nginx
echo "Installing Nginx..."
sudo amazon-linux-extras install nginx1 -y
sudo systemctl enable nginx
sudo systemctl start nginx

# Install PostgreSQL client tools (for database migrations)
echo "Installing PostgreSQL client tools..."
sudo yum install -y postgresql15

# Set up the application directory
echo "Setting up application directory..."
mkdir -p $DEPLOY_PATH
cd $DEPLOY_PATH

# Clone the repository (or pull if exists)
if [ -d ".git" ]; then
  echo "Updating existing repository..."
  git pull
else
  echo "Cloning repository..."
  git clone $REPO_URL .
fi

# Install dependencies
echo "Installing npm dependencies..."
npm ci


# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Start the application with PM2
echo "Starting application with PM2..."
pm2 stop $SERVICE_NAME || true
pm2 delete $SERVICE_NAME || true
pm2 start src/server.js --name $SERVICE_NAME --env production

# Save PM2 process list and configure to start on reboot
echo "Configuring PM2 for startup..."
pm2 save
sudo env PATH=$PATH:/home/ec2-user/.nvm/versions/node/v$NODE_VERSION/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

# Configure Nginx
echo "Configuring Nginx as reverse proxy..."
sudo cp nginx.conf /etc/nginx/conf.d/seller-service.conf
sudo systemctl restart nginx

# Configure firewall to allow Nginx
echo "Configuring firewall..."
sudo yum install -y firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload

echo "=== Deployment completed successfully ==="
echo "Service is running on port 8000"
echo "Nginx reverse proxy is configured to forward requests from port 80 to 8000"
echo "You can access your application at http://35.173.220.158" 