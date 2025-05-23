import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function GET() {
  try {
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    // Simple token-based protection for health checks
    const healthCheckToken = process.env.HEALTH_CHECK_TOKEN
    
    if (healthCheckToken && authHeader !== `Bearer ${healthCheckToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // More detailed health check for authorized requests
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    }, { status: 200 })
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}