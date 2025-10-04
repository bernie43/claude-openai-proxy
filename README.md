# 🚀  Claude to OpenAI Proxy

Use your Claude Pro/Max subscription anywhere that supports OpenAI-compatible endpoints.

### This project
- Handles login to your Claude account with Oauth and receives an API key for your Claude Pro/Max subscription
- Runs a proxy server that provides an OpenAI API-compatible endpoint
- The proxy then sends the requests to the Anthropic API, using the API key from Oauth

### Get started
- Run `npm install`
- Run `npm run build`
- Run `npm start` -> Proxy server running at http://localhost:4000
- Open http://localhost:4000 and follow the instructions to log in to your Claude account
