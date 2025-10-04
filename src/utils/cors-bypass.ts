import { Request, Response, NextFunction } from 'express'

/**
 * Handles CORS preflight requests (OPTIONS method).
 * Sets necessary CORS headers and sends a 204 No Content response.
 */
export const corsPreflightHandler = (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Max-Age', '86400') // Max age for preflight cache (24 hours)
  res.sendStatus(204) // Sends 204 No Content and ends the response
}

/**
 * Middleware to add CORS headers to all responses for actual requests.
 * This should be applied after the preflight handler.
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  next() // Continues to the next middleware or route handler
}
