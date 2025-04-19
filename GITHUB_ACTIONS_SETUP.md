# Setting Up GitHub Actions CI/CD for AWS Deployment

This guide will help you set up continuous integration and continuous deployment (CI/CD) for your seller-service application using GitHub Actions.

## Prerequisites

1. Your code is hosted on GitHub
2. You have an AWS EC2 instance running (IP: 35.173.220.158)
3. You have SSH access to your EC2 instance

## Step 1: Prepare Your EC2 Instance for GitHub Actions

First, you need to create an SSH key pair that GitHub Actions will use to access your EC2 instance:

1. Connect to your EC2 instance:
   ```bash
   ssh -i "C:\Users\mg875\Downloads\Backend.pem" ec2-user@35.173.220.158
   ```

2. Create a directory for your GitHub Actions SSH key:
   ```bash
   mkdir -p ~/.ssh
   ```

3. Generate a new SSH key pair (without passphrase):
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/github-actions
   ```

4. Add the public key to authorized_keys:
   ```bash
   cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

5. Display the private key to copy:
   ```bash
   cat ~/.ssh/github-actions
   ```
   Copy the entire output including the BEGIN and END lines.

## Step 2: Add Secrets to Your GitHub Repository

1. Go to your GitHub repository
2. Navigate to "Settings" > "Secrets and variables" > "Actions"
3. Add the following secrets:
   - Name: `SSH_PRIVATE_KEY`
     Value: The private key you copied in step 1.5
   - Name: `EC2_HOST`
     Value: `35.173.220.158`
   - Name: `EC2_USER`
     Value: `ec2-user`

## Step 3: Update Your Repository Structure

Ensure your repository has the following files:

1. `.github/workflows/deploy.yml`: GitHub Actions workflow file
2. `deploy_aws.sh`: Deployment script
3. `nginx.conf`: Nginx configuration

## Step 4: Push Changes to Trigger Deployment

1. Commit and push changes to your repository's main branch:
   ```bash
   git add .
   git commit -m "Add CI/CD configuration"
   git push
   ```

2. Check the Actions tab in your GitHub repository to monitor the deployment progress.

## Step 5: Manual Deployment

If you want to manually trigger the deployment:

1. Go to your GitHub repository
2. Navigate to the "Actions" tab
3. Select the "Deploy to AWS EC2" workflow
4. Click "Run workflow" > "Run workflow"

## Troubleshooting

If you encounter issues with the GitHub Actions deployment:

1. Check if the workflow is failing at a specific step
2. Verify your secrets are correctly set in GitHub
3. Check the SSH access from GitHub Actions to your EC2 instance
4. Test the deployment script manually on your EC2 instance

## Securing Your Deployment

For production environments, consider these additional security measures:

1. Use AWS IAM roles instead of SSH keys
2. Configure HTTPS with Let's Encrypt
3. Use AWS Secrets Manager for sensitive environment variables
4. Implement network security groups to restrict access to your EC2 instance 