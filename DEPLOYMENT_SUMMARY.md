# Complete AWS Deployment Guide for Seller Service

This document provides a comprehensive guide to deploying the Seller Service backend to AWS EC2 and setting up a CI/CD pipeline with GitHub Actions.

## Files Created

1. **deploy_aws.sh** - Main deployment script for the AWS EC2 instance that:
   - Installs necessary software (Node.js, PM2, Nginx, PostgreSQL client)
   - Sets up the application directory
   - Configures environment variables
   - Deploys the application with PM2
   - Sets up Nginx as a reverse proxy
   - Configures the firewall

2. **nginx.conf** - Configuration file for Nginx to set up a reverse proxy.

3. **.github/workflows/deploy.yml** - GitHub Actions workflow file for CI/CD.

4. **AWS_DEPLOYMENT_README.md** - Documentation for manual deployment steps.

5. **GITHUB_ACTIONS_SETUP.md** - Guide for setting up GitHub Actions CI/CD.

6. **setup_ec2.ps1** - PowerShell script to transfer files to the EC2 instance.

## Deployment Process

### Manual Deployment

1. **Connect to your EC2 instance**:
   ```powershell
   ssh -i "C:\Users\mg875\Downloads\Backend.pem" ec2-user@35.173.220.158
   ```

2. **Run the deployment script**:
   ```bash
   cd /home/ec2-user
   ./deploy_aws.sh
   ```

3. **Verify the deployment**:
   ```bash
   # Check if the service is running
   pm2 status
   
   # Check the health endpoint
   curl http://localhost:8000/health
   ```

### CI/CD Setup with GitHub Actions

1. **Prepare your EC2 instance for GitHub Actions**:
   - Generate SSH keys for GitHub Actions
   - Add public key to authorized_keys

2. **Add GitHub repository secrets**:
   - `SSH_PRIVATE_KEY`: Private key for EC2 access
   - `EC2_HOST`: Your EC2 instance's IP (35.173.220.158)
   - `EC2_USER`: EC2 username (ec2-user)

3. **Push changes to your repository**:
   - GitHub Actions will automatically deploy to EC2 when code is pushed to the main branch

## Server Configuration

The deployment sets up:

1. **Node.js application** running on port 8000 with PM2
2. **Nginx** as a reverse proxy listening on port 80
3. **PostgreSQL client** for database operations
4. **Firewall** configured to allow HTTP/HTTPS traffic

## Environment Variables

The application uses environment variables defined in `.env` file, including:

- Database connection string
- JWT secrets
- WhatsApp API credentials
- Payment gateway credentials
- Supabase configuration

## Security Considerations

1. **SSH access**:
   - Use key-based authentication only
   - Consider restricting SSH access to specific IPs

2. **Firewall**:
   - Allow only necessary ports (22, 80, 443)
   - Block other incoming connections

3. **HTTPS**:
   - Set up SSL/TLS with Let's Encrypt (not included in current setup)

4. **Secrets**:
   - Use AWS Secrets Manager for production credentials
   - Don't commit sensitive data to the repository

## Monitoring and Maintenance

1. **PM2**:
   - PM2 logs: `pm2 logs seller-service`
   - PM2 monitoring: `pm2 monit`

2. **Nginx**:
   - Logs: `/var/log/nginx/seller-service-access.log`
   - Error logs: `/var/log/nginx/seller-service-error.log`

3. **System logs**:
   - System logs: `journalctl -xe`
   - Application logs: `pm2 logs`

## Next Steps

1. **Set up SSL/TLS** with Let's Encrypt for HTTPS
2. **Configure a domain name** in AWS Route 53
3. **Set up CloudWatch** for monitoring
4. **Configure database backups** 
5. **Set up log rotation** and monitoring
6. **Implement auto-scaling** for production workloads 