#!/bin/bash
# Script to help transfer deployment files to EC2

# EC2 connection details
EC2_IP="35.173.220.158"
EC2_USER="ec2-user"
PEM_PATH="C:\\Users\\mg875\\Downloads\\Backend.pem"

echo "=== Transferring deployment files to EC2 ==="

# Create a temporary directory to hold deployment files
mkdir -p deployment_files
cp deploy_aws.sh deployment_files/
cp nginx.conf deployment_files/
cp .github/workflows/deploy.yml deployment_files/
cp AWS_DEPLOYMENT_README.md deployment_files/

# Transfer files to EC2
echo "Transferring files to EC2..."
scp -i "$PEM_PATH" -r deployment_files/* $EC2_USER@$EC2_IP:/home/$EC2_USER/

# Make the deploy script executable
echo "Making deploy script executable..."
ssh -i "$PEM_PATH" $EC2_USER@$EC2_IP "chmod +x /home/$EC2_USER/deploy_aws.sh"

# Clean up
rm -rf deployment_files

echo "=== Files transferred successfully ==="
echo ""
echo "You can now connect to your EC2 instance and run the deployment script:"
echo "ssh -i \"$PEM_PATH\" $EC2_USER@$EC2_IP"
echo "./deploy_aws.sh" 