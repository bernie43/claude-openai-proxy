import * as fs from "fs";

interface OAuthCredentials {
  type: 'oauth'
  refresh: string
  access: string
  expires: number
}

interface AuthData {
  [provider: string]: OAuthCredentials
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

const configFile = '~/.claude-openai-proxy.json';

async function get(): Promise<OAuthCredentials | null> {
  try {
    const data = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    return data
  } catch (error) {
    console.error('Error reading config:', error)
    return null
  }
}

async function set(credentials: OAuthCredentials): Promise<boolean> {
  try {
    fs.writeFileSync(configFile, JSON.stringify(credentials, null, 2));
    return true
  } catch (error) {
    console.error('Error saving config:', error)
    throw error
  }
}

async function remove(): Promise<boolean> {
  try {
    fs.unlinkSync(configFile);
    return true
  } catch (error) {
    console.error('Error removing config:', error)
    throw error
  }
}

async function refreshToken(
  credentials: OAuthCredentials,
): Promise<string | null> {
  try {
    const CLIENT_ID =
      process.env.ANTHROPIC_OAUTH_CLIENT_ID ||
      '9d1c250a-e61b-44d9-88ed-5944d1962f5e'

    const response = await fetch(
      'https://console.anthropic.com/v1/oauth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: credentials.refresh,
          client_id: CLIENT_ID,
        }),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to refresh token: ${error}`)
    }

    const data = (await response.json()) as TokenResponse

    const newCredentials: OAuthCredentials = {
      type: 'oauth',
      refresh: data.refresh_token,
      access: data.access_token,
      expires: Date.now() + data.expires_in * 1000,
    }

    await set(newCredentials)

    return data.access_token
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

async function getAccessToken(): Promise<string | null> {
  const credentials = await get()
  if (!credentials || credentials.type !== 'oauth') {
    return null
  }

  // Check if token is expired
  if (credentials.expires && credentials.expires > Date.now()) {
    console.log('Token is valid')
    return credentials.access
  }

  // Token is expired, need to refresh
  if (credentials.refresh) {
    console.log('Token is expired, need to refresh')
    return await refreshToken(credentials)
  }

  return null
}

export { get, set, remove, getAccessToken }
