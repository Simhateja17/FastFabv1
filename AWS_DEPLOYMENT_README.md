# AWS EC2 Deployment for Seller Service

This document describes how to deploy the Seller Service backend to AWS EC2 and set up CI/CD with GitHub Actions.

## Manual Deployment Steps

1. **Connect to your EC2 instance**:
   ```bash
   ssh -i "C:\Users\mg875\Downloads\Backend.pem" ec2-user@35.173.220.158
   ```

2. **Set up the deployment**:
   ```bash
   # Clone the repository
   git clone https://github.com/couture-Services-Pvt-Ltd/seller-Service-2-main.git
   cd seller-Service-2-main

   # Make the deployment script executable
   chmod +x deploy_aws.sh

   # Run the deployment script
   ./deploy_aws.sh
   ```

3. **Verify the service is running**:
   ```bash
   pm2 status
   curl http://localhost:8000/health
   ```

## CI/CD Setup with GitHub Actions

To enable automated deployments with GitHub Actions:

1. Add the following secrets to your GitHub repository:
   - `SSH_PRIVATE_KEY`: The contents of your EC2 instance's private key
   - `EC2_HOST`: Your EC2 instance's public IP (35.173.220.158)
   - `EC2_USER`: The EC2 username (ec2-user)

2. Update your repository's main branch to trigger deployments.

3. For manual deployments, use the "Run workflow" button in the Actions tab.

## Setting Up SSH Keys on EC2

For GitHub Actions to connect to your EC2 instance, you need to set up SSH keys:

1. Generate a new SSH key pair or use your existing one:
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/github-actions
   ```

2. Add the public key to your EC2 instance's authorized_keys:
   ```bash
   cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

3. Add the private key content to your GitHub repository secrets as `SSH_PRIVATE_KEY`.

## Security Considerations

1. Configure your EC2 security group to allow only necessary connections:
   - SSH (port 22) from your IP address
   - HTTP/HTTPS (ports 80/443) from anywhere
   - Application port (8000) from your frontend application's server

2. Set up AWS CloudWatch for monitoring your EC2 instance.

3. Consider using an Elastic IP address for your EC2 instance to keep the IP stable.

## Troubleshooting

If you encounter issues with the deployment:

1. Check the application logs:
   ```bash
   pm2 logs seller-service
   ```

2. Verify the environment variables:
   ```bash
   cat /home/ec2-user/seller-service/.env
   ```

3. Check if all required ports are open:
   ```bash
   sudo netstat -tulpn | grep LISTEN
   ``` 