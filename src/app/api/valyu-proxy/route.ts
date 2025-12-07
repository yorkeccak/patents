import { NextRequest, NextResponse } from 'next/server';

/**
 * Internal Valyu Proxy Route
 *
 * This route proxies Valyu API calls through the Valyu platform's OAuth proxy.
 * It's used when a user is authenticated via "Sign in with Valyu" and we want
 * to use their credits instead of the server's API key.
 *
 * Flow:
 * 1. Client sends request with Valyu access token in header
 * 2. This route forwards to Valyu platform's OAuth proxy
 * 3. Valyu platform validates token and uses user's org API key
 * 4. Results returned to client
 *
 * This keeps the Valyu platform URL server-side only.
 *
 * Body:
 * {
 *   "path": "/v1/search",    // Valyu API path
 *   "method": "POST",        // HTTP method (default: POST)
 *   "body": { ... }          // Request body to forward
 * }
 */

const VALYU_OAUTH_PROXY_URL = process.env.VALYU_OAUTH_PROXY_URL ||
  `${process.env.NEXT_PUBLIC_VALYU_OAUTH_URL || 'https://platform.valyu.ai'}/api/oauth/proxy`;

export async function POST(request: NextRequest) {
  try {
    // Get the Valyu access token from the request
    const valyuToken = request.headers.get('x-valyu-token');

    if (!valyuToken) {
      return NextResponse.json(
        { error: 'missing_token', message: 'Valyu access token required' },
        { status: 401 }
      );
    }

    // Parse the request body
    const proxyRequest = await request.json();
    const { path, method = 'POST', body: requestBody } = proxyRequest;

    if (!path) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'path is required' },
        { status: 400 }
      );
    }

    // Forward to Valyu platform OAuth proxy
    const proxyResponse = await fetch(VALYU_OAUTH_PROXY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${valyuToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, method, body: requestBody }),
    });

    // Get response data (try JSON, fallback to text)
    const contentType = proxyResponse.headers.get('content-type');
    let responseData: unknown;

    if (contentType?.includes('application/json')) {
      responseData = await proxyResponse.json();
    } else {
      responseData = await proxyResponse.text();
    }

    // Return with same status code and content type
    if (typeof responseData === 'string') {
      return new NextResponse(responseData, {
        status: proxyResponse.status,
        headers: {
          'Content-Type': contentType || 'text/plain',
          'X-Proxy-Request-Id': proxyResponse.headers.get('X-Request-Id') || '',
        },
      });
    }

    return NextResponse.json(responseData, {
      status: proxyResponse.status,
      headers: {
        'X-Proxy-Request-Id': proxyResponse.headers.get('X-Request-Id') || '',
      },
    });
  } catch (error) {
    console.error('[Valyu Proxy] Error:', error);
    return NextResponse.json(
      { error: 'proxy_error', message: 'Failed to proxy request to Valyu' },
      { status: 500 }
    );
  }
}
