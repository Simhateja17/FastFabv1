# PowerShell script to transfer deployment files to EC2

# EC2 connection details
$EC2_IP = "35.173.220.158"
$EC2_USER = "ec2-user"
$PEM_PATH = "C:\Users\mg875\Downloads\Backend.pem"

Write-Host "=== Transferring deployment files to EC2 ===" -ForegroundColor Green

# Create a temporary directory to hold deployment files
New-Item -Path "deployment_files" -ItemType Directory -Force
Copy-Item -Path "deploy_aws.sh" -Destination "deployment_files\"
Copy-Item -Path "nginx.conf" -Destination "deployment_files\"
Copy-Item -Path ".github\workflows\deploy.yml" -Destination "deployment_files\"
Copy-Item -Path "AWS_DEPLOYMENT_README.md" -Destination "deployment_files\"
Copy-Item -Path "GITHUB_ACTIONS_SETUP.md" -Destination "deployment_files\"

# Transfer files to EC2
Write-Host "Transferring files to EC2..." -ForegroundColor Cyan
scp -i $PEM_PATH -r deployment_files\* "${EC2_USER}@${EC2_IP}:/home/${EC2_USER}/"

# Make the deploy script executable
Write-Host "Making deploy script executable..." -ForegroundColor Cyan
ssh -i $PEM_PATH "${EC2_USER}@${EC2_IP}" "chmod +x /home/${EC2_USER}/deploy_aws.sh"

# Clean up
Remove-Item -Path "deployment_files" -Recurse -Force

Write-Host "=== Files transferred successfully ===" -ForegroundColor Green
Write-Host ""
Write-Host "You can now connect to your EC2 instance and run the deployment script:"
Write-Host "ssh -i `"$PEM_PATH`" ${EC2_USER}@${EC2_IP}"
Write-Host "./deploy_aws.sh" 