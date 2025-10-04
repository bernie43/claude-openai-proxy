import express, { Request, Response } from 'express'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getAccessToken } from './auth/oauth-manager'
import {
  login as oauthLogin,
  logout as oauthLogout,
  generateAuthSession,
  handleOAuthCallback,
} from './auth/oauth-flow'
import {
  createConverterState,
  processChunk,
  convertNonStreamingResponse,
} from './utils/anthropic-to-openai-converter'
import { corsPreflightHandler, corsMiddleware } from './utils/cors-bypass'
import {
  isCursorKeyCheck,
  createCursorBypassResponse,
} from './utils/cursor-byok-bypass'
import type {
  AnthropicRequestBody,
  AnthropicResponse,
  ErrorResponse,
  SuccessResponse,
  ModelsListResponse,
  ModelInfo,
} from './types'

const app = express()

// Parse JSON bodies
app.use(express.json())

// Handle CORS preflight requests for all routes
app.options('*', corsPreflightHandler)

// Also add CORS headers to all responses
app.use('*', corsMiddleware)

const indexHtmlPath = join(process.cwd(), 'public', 'index.html')
let cachedIndexHtml: string | null = null

const getIndexHtml = async () => {
  if (!cachedIndexHtml) {
    cachedIndexHtml = await readFile(indexHtmlPath, 'utf-8')
  }
  return cachedIndexHtml
}

// Root route is handled by serving public/index.html directly
app.get('/', async (req: Request, res: Response) => {
  const html = await getIndexHtml()
  res.setHeader('Content-Type', 'text/html')
  res.send(html)
})

app.get('/index.html', async (req: Request, res: Response) => {
  const html = await getIndexHtml()
  res.setHeader('Content-Type', 'text/html')
  res.send(html)
})

// New OAuth start endpoint for UI
app.post('/auth/oauth/start', async (req: Request, res: Response) => {
  try {
    const { authUrl, sessionId } = await generateAuthSession()
    res.json({
      success: true,
      authUrl,
      sessionId,
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start OAuth flow',
      message: (error as Error).message,
    } as ErrorResponse)
  }
})

// New OAuth callback endpoint for UI
app.post('/auth/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.body
    if (!code) {
      res.status(400).json({
        error: 'Missing OAuth code',
        message: 'OAuth code is required',
      } as ErrorResponse)
      return
    }

    // Extract verifier from code if it contains #
    const splits = code.split('#')
    const verifier = splits[1] || ''

    await handleOAuthCallback(code, verifier)

    res.json({
      success: true,
      message: 'OAuth authentication successful',
    } as SuccessResponse)
  } catch (error) {
    res.status(500).json({
      error: 'OAuth callback failed',
      message: (error as Error).message,
    } as ErrorResponse)
  }
})

app.post('/auth/login/start', async (req: Request, res: Response) => {
  try {
    console.log('\n Starting OAuth authentication flow...')
    const result = await oauthLogin()
    if (result) {
      res.json({
        success: true,
        message: 'OAuth authentication successful',
      } as SuccessResponse)
    } else {
      res.status(401).json({
        success: false,
        message: 'OAuth authentication failed',
      } as SuccessResponse)
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    } as SuccessResponse)
  }
})

app.get('/auth/logout', async (req: Request, res: Response) => {
  try {
    await oauthLogout()
    res.json({
      success: true,
      message: 'Logged out successfully',
    } as SuccessResponse)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message,
    } as SuccessResponse)
  }
})

app.get('/auth/status', async (req: Request, res: Response) => {
  try {
    const token = await getAccessToken()
    res.json({ authenticated: !!token })
  } catch (error) {
    res.json({ authenticated: false })
  }
})

app.get('/v1/models', async (req: Request, res: Response) => {
  try {
    // Fetch models from models.dev
    const response = await fetch('https://models.dev/api.json', {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': '@anthropic-ai/sdk 1.2.12 node/22.13.1',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('API Error:', error)
      res.status(response.status).setHeader('Content-Type', 'text/plain').send(error)
      return
    }

    const modelsData = (await response.json()) as any

    // Extract Anthropic models and format them like OpenAI's API would
    const anthropicProvider = modelsData.anthropic
    if (!anthropicProvider || !anthropicProvider.models) {
      res.json({
        object: 'list',
        data: [],
      } as ModelsListResponse)
      return
    }

    // Convert models to OpenAI's format
    const models: ModelInfo[] = Object.entries(anthropicProvider.models).map(
      ([modelId, modelData]: [string, any]) => {
        // Convert release date to Unix timestamp
        const releaseDate = modelData.release_date || '1970-01-01'
        const created = Math.floor(new Date(releaseDate).getTime() / 1000)

        return {
          id: modelId,
          object: 'model' as const,
          created: created,
          owned_by: 'anthropic',
        }
      },
    )

    // Sort models by created timestamp (newest first)
    models.sort((a, b) => b.created - a.created)

    const response_data: ModelsListResponse = {
      object: 'list',
      data: models,
    }

    res.json(response_data)
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({
      error: 'Proxy error',
      details: (error as Error).message,
    } as ErrorResponse)
  }
})

const messagesFn = async (req: Request, res: Response) => {
  let headers: Record<string, string> = req.headers as Record<string, string>
  headers.host = 'api.anthropic.com'

  const body: AnthropicRequestBody = req.body
  const isStreaming = body.stream === true

  const apiKey = req.headers.authorization?.split(' ')?.[1]
  if (apiKey && apiKey !== process.env.API_KEY) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please authenticate use the API key from the .env file',
    })
    return
  }

  // Bypass cursor enable openai key check
  if (isCursorKeyCheck(body)) {
    res.json(createCursorBypassResponse())
    return
  }

  try {
    let transformToOpenAIFormat = false
    if (
      !body.system?.[0]?.text?.includes(
        "You are Claude Code, Anthropic's official CLI for Claude.",
      ) && body.messages
    ) {
      const systemMessages = body.messages.filter((msg: any) => msg.role === 'system')
      body.messages = body.messages?.filter((msg: any) => msg.role !== 'system')
      transformToOpenAIFormat = true // not claude-code, need to transform to openai format

      if (!body.system) {
        body.system = []
      }

      body.system.unshift({
        type: 'text',
        text: "You are Claude Code, Anthropic's official CLI for Claude.",
      })

      for (const sysMsg of systemMessages) {
        body.system.push({
          type: 'text',
          text: sysMsg.content || ''
        })
      }

      if (body.model.includes('opus')) {
        body.max_tokens = 32_000
      }
      if (body.model.includes('sonnet')) {
        body.max_tokens = 64_000
      }
    }

    const oauthToken = await getAccessToken()
    if (!oauthToken) {
      res.status(401).json({
        error: 'Authentication required',
        message:
          'Please authenticate using OAuth first. Visit /auth/login for instructions.',
      } as ErrorResponse)
      return
    }

    headers = {
      'content-type': 'application/json',
      authorization: `Bearer ${oauthToken}`,
      'anthropic-beta':
        'oauth-2025-04-20,fine-grained-tool-streaming-2025-05-14',
      'anthropic-version': '2023-06-01',
      'user-agent': '@anthropic-ai/sdk 1.2.12 node/22.13.1',
      accept: isStreaming ? 'text/event-stream' : 'application/json',
      'accept-encoding': 'gzip, deflate',
    }

    if (transformToOpenAIFormat) {
      if (!body.metadata) {
        body.metadata = {}
      }
      if (!body.system) {
        body.system = []
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('API Error:', error)
      if (response.status === 401) {
        res.status(401).json({
          error: 'Authentication failed',
          message:
            'OAuth token may be expired. Please re-authenticate using /auth/login/start',
          details: error,
        } as ErrorResponse)
        return
      }
      res.status(response.status).setHeader('Content-Type', 'text/plain').send(error)
      return
    }

    if (isStreaming) {
      response.headers.forEach((value, key) => {
        if (
          key.toLowerCase() !== 'content-encoding' &&
          key.toLowerCase() !== 'content-length' &&
          key.toLowerCase() !== 'transfer-encoding'
        ) {
          res.setHeader(key, value)
        }
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      const converterState = createConverterState()
      const enableLogging = false

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })

          if (transformToOpenAIFormat) {
            if (enableLogging) {
              console.log('🔄 [TRANSFORM MODE] Converting to OpenAI format')
            }
            const results = processChunk(converterState, chunk, enableLogging)
            for (const result of results) {
              if (result.type === 'chunk') {
                const dataToSend = `data: ${JSON.stringify(result.data)}\n\n`
                if (enableLogging) {
                  console.log('✅ [SENDING] OpenAI Chunk:', dataToSend)
                }
                res.write(dataToSend)
              } else if (result.type === 'done') {
                res.write('data: [DONE]\n\n')
              }
            }
          } else {
            res.write(chunk)
          }
        }
      } catch (error) {
        console.error('Stream error:', error)
      } finally {
        reader.releaseLock()
        res.end()
      }
    } else {
      const responseData = (await response.json()) as AnthropicResponse

      if (transformToOpenAIFormat) {
        const openAIResponse = convertNonStreamingResponse(responseData)
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() !== 'content-encoding') {
            res.setHeader(key, value)
          }
        })
        res.json(openAIResponse)
        return
      }

      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'content-encoding') {
          res.setHeader(key, value)
        }
      })
      res.json(responseData)
    }
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({
      error: 'Proxy error',
      details: (error as Error).message,
    } as ErrorResponse)
  }
}

app.post('/v1/chat/completions', messagesFn)
app.post('/v1/messages', messagesFn)

const port = process.env.PORT || 9095

// Export app for Vercel
export default app

// Server is started differently for local development vs Vercel