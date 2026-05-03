/**
 * Health check endpoint for monitoring and load balancers
 * GET /api/health
 */

export async function GET() {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      firebase: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      googleCloud: !!process.env.GOOGLE_CLOUD_PROJECT,
    },
  };

  return Response.json(healthData, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}