import fs from 'fs/promises'
import path from 'path'

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

// Configuration
const dataDir = path.join(__dirname, '../../.auth')
const authFile = path.join(dataDir, 'auth.json')

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(dataDir, { recursive: true })
  } catch (error) {
    console.error('Error creating auth directory:', error)
  }
}

async function get(
  provider: string = 'anthropic',
): Promise<OAuthCredentials | null> {
  try {
    await ensureDataDir()
    const data = await fs.readFile(authFile, 'utf8')
    const auth: AuthData = JSON.parse(data)
    return auth[provider] || null
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
  }
}

async function set(
  provider: string,
  credentials: OAuthCredentials,
): Promise<boolean> {
  try {
    await ensureDataDir()

    let auth: AuthData = {}
    try {
      const existing = await fs.readFile(authFile, 'utf8')
      auth = JSON.parse(existing)
    } catch (error) {
      // File doesn't exist yet
    }

    auth[provider] = credentials

    await fs.writeFile(authFile, JSON.stringify(auth, null, 2))
    await fs.chmod(authFile, 0o600)

    return true
  } catch (error) {
    console.error('Error saving auth:', error)
    throw error
  }
}

async function remove(provider: string): Promise<boolean> {
  try {
    const auth = await getAll()
    delete auth[provider]

    await fs.writeFile(authFile, JSON.stringify(auth, null, 2))
    await fs.chmod(authFile, 0o600)

    return true
  } catch (error) {
    console.error('Error removing auth:', error)
    throw error
  }
}

async function getAll(): Promise<AuthData> {
  try {
    await ensureDataDir()
    const data = await fs.readFile(authFile, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {}
    }
    throw error
  }
}

async function refreshToken(
  provider: string,
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

    await set(provider, newCredentials)

    return data.access_token
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

async function getAccessToken(
  provider: string = 'anthropic',
): Promise<string | null> {
  const credentials = await get(provider)
  if (!credentials || credentials.type !== 'oauth') {
    return null
  }

  // Check if token is expired
  if (credentials.expires && credentials.expires > Date.now()) {
    console.log('Token is valid', credentials.access)
    return credentials.access
  }

  // Token is expired, need to refresh
  if (credentials.refresh) {
    console.log('Token is expired, need to refresh')
    return await refreshToken(provider, credentials)
  }

  return null
}

export { get, set, remove, getAll, getAccessToken }
