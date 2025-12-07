import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForTokens,
  fetchValyuUserInfo,
  fetchValyuApiKeyInfo,
  validateCallback,
  retrieveCodeVerifier,
  OAuthError,
} from '@/lib/valyu-oauth';

/**
 * Valyu OAuth 2.1 Callback Handler
 *
 * This route handles the OAuth callback from Valyu after user authorization.
 * It exchanges the authorization code for tokens using PKCE verification.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors from the authorization server
  if (error) {
    console.error('[Valyu OAuth] Authorization error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/?error=valyu_auth_failed&message=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Validate callback parameters (checks state for CSRF)
  // Note: State validation happens client-side since state is stored in sessionStorage
  if (!code) {
    console.error('[Valyu OAuth] No authorization code received');
    return NextResponse.redirect(`${origin}/?error=valyu_auth_failed&message=no_code`);
  }

  // Build redirect URL for token exchange
  const redirectUri = `${origin}/auth/valyu/callback`;

  // We need to pass data to the client to complete the flow
  // Since PKCE verifier is in sessionStorage (client-side), we redirect to a client page
  // that will complete the token exchange
  const clientCallbackUrl = new URL(`${origin}/auth/valyu/complete`);
  clientCallbackUrl.searchParams.set('code', code);
  clientCallbackUrl.searchParams.set('state', state || '');

  return NextResponse.redirect(clientCallbackUrl.toString());
}
