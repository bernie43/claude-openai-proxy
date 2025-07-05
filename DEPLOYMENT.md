# 🚀 Deployment Guide - Cursor Claude Connector

This guide will help you connect Cursor with your Claude subscription using this proxy.

## 📋 Prerequisites

1. **Server** with:

   - Public IP address
   - Port 9095 available (or custom port)

2. **Active Claude subscription** (Pro or Max)

3. **Cursor IDE** installed on your local machine

## 🔧 Quick Setup

### 1. Install Bun

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### 2. Clone and start the project

```bash
# Clone the repository
git clone https://github.com/Maol-1997/cursor-claude-connector.git
cd cursor-claude-connector

# Run the start script (default port: 9095)
./start.sh

# Or with a custom port:
PORT=3000 ./start.sh
```

The script will:

- Install dependencies automatically
- Build the project
- Start the server on port 9095 (or your custom port)

## 🔐 Claude Authentication

### 1. Access the web interface

Open your browser and navigate to:

```
http://your-server-ip:9095/
```

Or if using a custom port:

```
http://your-server-ip:YOUR_PORT/
```

![Login Interface](images/login.webp)

### 2. Authentication process

1. Click **"Connect with Claude"**

   ![Claude OAuth Step 1](images/claude-oauth-1.webp)

2. A Claude window will open for authentication
3. Sign in with your Claude account (Pro/Max)
4. Authorize the application

   ![Claude OAuth Step 2](images/claude-oauth-2.webp)

5. You'll be redirected to a page with a code
6. Copy the ENTIRE code (it includes a # in the middle)
7. Paste it in the web interface field
8. Click **"Submit Code"**

### 3. Verify authentication

If everything went well, you'll see the message: **"You are successfully authenticated with Claude"**

![Logged In](images/logged-in.webp)

## 🖥️ Cursor Configuration

### 1. Open Cursor settings

1. In Cursor, press `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)
2. Go to the **"Models"** section
3. Look for the **"Override OpenAI Base URL"** option

### 2. Configure the endpoint

1. Enable **"Override OpenAI Base URL"**
2. In the URL field, enter:

   ```
   http://your-server-ip:9095/v1
   ```

   Or with custom port:

   ```
   http://your-server-ip:YOUR_PORT/v1
   ```

   For example:

   ```
   http://54.123.45.67:9095/v1
   http://54.123.45.67:3000/v1
   ```

![Cursor Custom URL Configuration](images/cursor-custom-url.webp)

### 3. Verify the connection

1. In the models list, you should see the available Claude models:

   - claude-3.7-sonnet
   - claude-4-opus
   - claude-4-sonnet
   - gpt-4.1
   - o3
   - o4-mini
   - And more...

2. Select your preferred model
3. Try typing something in Cursor's chat

## ✅ That's it!

You're now using Claude's full power directly in Cursor IDE. The proxy will handle all the communication between Cursor and Claude using your subscription.

## 🔍 Quick Troubleshooting

- **Can't connect?** Make sure the server is running (check the terminal where you ran `./start.sh`)
- **Authentication failed?** Try visiting `http://your-server-ip:PORT/auth/logout` and authenticate again
- **Models not showing?** Restart Cursor and make sure the URL ends with `/v1`
- **Using custom port?** Make sure to use the same port in both the server and Cursor configuration

---

Enjoy coding with Claude in Cursor! 🎉
