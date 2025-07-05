# 🚀 Cursor-Claude Connector

> **The best of both worlds**: Combine Cursor's powerful IDE with Claude's unlimited potential

## 🚀 Why combine Cursor IDE with Claude's full power?

Based on discussions on Reddit and developer communities, here's what you get:

### 💡 **Get Claude's highest quality output**

- Direct access to Claude's full capabilities
- Better context understanding without compression
- Access to the latest Claude models and features

### 🧠 **Direct model access without limitations**

- **No context compression**: Cursor compresses context to save tokens, which can degrade quality
- **No artificial limits**: No 250-line file restrictions like in Cursor
- **Full model**: Access to Claude's full power without intermediate layers

### 💰 **Significant savings**

- Cursor Pro: $20/month + additional usage costs
- Claude Max: $100-200/month (5x-20x more usage than Pro)
- **This project**: Use your Claude Max subscription in Cursor = Best value

### 🎯 **Better for complex tasks**

- Handle larger context windows and longer conversations
- Work with complex documents without hitting size restrictions
- Maintain context throughout extended coding sessions

## 🔧 How does this project work?

This proxy allows you to use your Claude Max subscription directly in Cursor, combining:

- ✅ Cursor's familiar and productive interface
- ✅ Claude's full power without limitations
- ✅ No additional costs beyond your Claude subscription

### Architecture

```mermaid
graph LR
    A[Cursor IDE] -->|Requests| B[Proxy Server]
    B -->|Authenticated| C[Claude Web Interface]
    C -->|Response| B
    B -->|Full Context| A
```

## 🚀 Quick Installation

### 📖 Complete Setup Guide

For detailed instructions with screenshots on how to deploy and configure this proxy, please see our **[Deployment Guide](DEPLOYMENT.md)**.

### Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/cursor-claude-connector.git
   cd cursor-claude-connector
   ```

2. **Run the start script**

   ```bash
   ./start.sh
   ```

3. **Authenticate with Claude**

   - Open `http://your-server-ip:9095/` in your browser
   - Follow the authentication process

4. **Configure Cursor**
   - Go to Settings → Models
   - Enable "Override OpenAI Base URL"
   - Enter: `http://your-server-ip:9095/v1`

## 🎉 Advantages of this solution

| Feature        | Cursor Alone  | Claude Code | **This Project** |
| -------------- | ------------- | ----------- | ---------------- |
| IDE Interface  | ✅            | ❌ Terminal | ✅               |
| Full Context   | ❌ Compressed | ✅          | ✅               |
| Monthly Cost   | $20 + usage   | $100-200    | Claude Max only  |
| Code Quality   | ⭐⭐⭐        | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐       |
| Change Control | ✅            | ⚠️          | ✅               |

## 🛡️ Security

- No API keys needed - uses your existing Claude session
- Local connection between Cursor and the proxy
- Open source code for auditing

## 🤝 Contributions

Contributions are welcome! If you find any issues or have suggestions, please open an issue or PR.

## 📄 License

MIT - Use this project however you want

---

**Note**: This project is not affiliated with Anthropic or Cursor. It's a community tool to improve the development experience.
