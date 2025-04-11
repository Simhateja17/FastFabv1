# Fixing Seller OTP Failure (Azure Frontend / AWS Backend)

This guide provides steps to troubleshoot and fix the "Failed to send OTP" error for the Seller Signup/Signin flow when the frontend is hosted on Azure App Service and the backend Seller Service is hosted on an AWS EC2 instance.

**Assumptions:**
*   Your main Next.js application is hosted on Azure App Service (`coutureservicesprivatelimited-h9cvf...`).
*   Your Seller Service backend (Node.js) is hosted on AWS EC2 (`ec2-3-86-195-193.compute-1.amazonaws.com`).
*   The User OTP flow (non-seller) is working correctly in production.
*   The Seller OTP flow works correctly when running the main application locally.

**Problem:** The Azure App Service cannot successfully communicate with the AWS EC2 Seller Service backend in the production environment.

---

## Step 1: Verify Seller Service Status & Port on AWS EC2

**Goal:** Ensure the Seller Service Node.js application is running on the EC2 instance and listening publicly on the correct port.

1.  **Connect to EC2 via SSH:**
    ```bash
    # Replace <username> with ec2-user or ubuntu
    # Replace /path/to/your-key.pem with the correct path
    ssh -i /path/to/your-key.pem <username>@ec2-3-86-195-193.compute-1.amazonaws.com
    ```

2.  **Check if Process is Running:**
    *   If using PM2: `pm2 list` (Check status is `online`). Note the `pid`.
    *   If using Node directly: `ps aux | grep node` (Look for your server script, e.g., `index.js`). Note the `PID`.
    *   **If not running:** Navigate to the service directory (`cd /path/to/seller-Service-2-main`) and start it (e.g., `pm2 start ecosystem.config.js` or `node index.js &`).

3.  **Check Listening Port and IP:**
    *   Run: `sudo netstat -tulnp | grep <PID>` (Replace `<PID>` with the process ID from step 1.2, or try `grep node`).
    *   **Look for a line like:** `tcp 0 0 0.0.0.0:8000 0.0.0.0:* LISTEN <PID>/node`
        *   **Confirm the Port:** Is it `8000` (from `.env` file) or `3000` (as you suspected)? **Use this correct port number in the following steps.**
        *   **Confirm the IP:** It **MUST** be `0.0.0.0:<PORT>`. If it shows `127.0.0.1:<PORT>`, the service is only listening locally. You need to modify your Node.js `app.listen()` call to use host `0.0.0.0` or ensure the `HOST` env var isn't `127.0.0.1`, then restart the service.

---

## Step 2: Configure AWS EC2 Security Group

**Goal:** Allow incoming network traffic from Azure (and the internet, for testing) to reach the Seller Service port on your EC2 instance.

1.  Go to the **AWS Management Console** (aws.amazon.com).
2.  Navigate to **EC2**.
3.  Click **Instances** (in the left menu).
4.  Select the `fast&fab` instance (`i-07c6e9a1533652568`).
5.  In the details pane below, click the **Security** tab.
6.  Click the link under **Security groups** (e.g., `sg-xxxxxxxx`).
7.  In the Security Group details, click the **Inbound rules** tab.
8.  Click **Edit inbound rules**.
9.  Click **Add rule**.
10. Configure the new rule:
    *   **Type:** `Custom TCP`
    *   **Protocol:** `TCP`
    *   **Port range:** Enter the **correct port** identified in Step 1.3 (e.g., `8000` or `3000`).
    *   **Source:** Select `Anywhere-IPv4` (which results in `0.0.0.0/0`). *Note: For better security later, you can restrict this to Azure's outbound IP ranges.*
11. Click **Save rules**.

---

## Step 3: Configure Azure App Service Environment Variable

**Goal:** Tell your main Next.js application (on Azure) the correct HTTP address of your Seller Service (on AWS).

1.  Go to the **Azure Portal** (portal.azure.com).
2.  Navigate to your main App Service resource (`coutureservicesprivatelimited-h9cvf...`).
3.  In the left menu, go to **Settings** -> **Configuration**.
4.  Click the **Application settings** tab.
5.  Find the setting named `SELLER_SERVICE_URL` (or `NEXT_PUBLIC_SELLER_SERVICE_URL` - check which name your API route code actually uses: `process.env.SELLER_SERVICE_URL`).
    *   If it exists, click **Edit** (the pencil icon).
    *   If it doesn't exist, click **+ New application setting**.
6.  Set the **Name** to `SELLER_SERVICE_URL` (or the correct name used by your code).
7.  Set the **Value** to the **HTTP address** including the correct port:
    *   Example using port 8000: `http://ec2-3-86-195-193.compute-1.amazonaws.com:8000`
    *   Example using port 3000: `http://ec2-3-86-195-193.compute-1.amazonaws.com:3000`
    *   **Make sure to use `http` and the correct port number confirmed in Step 1.3.**
8.  Click **OK**.
9.  Click **Save** at the top of the Configuration page to apply all changes.

---

## Step 4: Restart Azure App Service

**Goal:** Ensure the Azure App Service picks up the updated environment variable.

1.  While on the Azure Portal page for your App Service (`coutureservicesprivatelimited-h9cvf...`), go to the **Overview** page.
2.  Click the **Restart** button at the top. Confirm if prompted.

---

## Step 5: Test

**Goal:** Verify the Seller OTP flow now works in production.

1.  Open your Azure application URL in your browser (e.g., `https://coutureservicesprivatelimited-h9cvf....azurewebsites.net/seller/signup`).
2.  Enter a phone number and attempt to send the OTP.
3.  Check if the "Failed to send OTP" error is gone and if you receive the OTP via WhatsApp.

---

## If Still Failing:

*   **Check Seller Service Logs on AWS:** Connect via SSH again (Step 1.1) and `tail -f` the log file for your Seller Service while you attempt the OTP flow on Azure. Look for any incoming request logs or error messages happening within the Seller Service itself (e.g., problems connecting to Gupshup).
*   **Check Azure Logs:** Check the "Log stream" for your Azure App Service during the OTP attempt to see if the error message has changed.
*   **Consider HTTPS:** Using HTTP is insecure. The long-term solution is to configure a web server (like Nginx) and SSL certificate (like Let's Encrypt) on the EC2 instance to handle HTTPS, then update the Azure `SELLER_SERVICE_URL` to use `https://...` (without the port number, as HTTPS uses port 443 by default). 