/**
 * Cloudflare Worker for ZCC Scientific Calculator
 * 
 * Serves the static calculator UI from public/ via Cloudflare Assets.
 * Handles the Zoom OAuth install flow and provides a health/status API.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers for ZCC Agent Desktop embedding
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health endpoint
    if (url.pathname === '/api/health') {
      return Response.json(
        {
          status: 'ok',
          app: 'ZCC Scientific Calculator',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        },
        { headers: corsHeaders }
      );
    }

    // Zoom OAuth install redirect (Phase 2 — Marketplace registration)
    if (url.pathname === '/auth/zoom') {
      const clientId = env.ZOOM_CLIENT_ID;
      if (!clientId) {
        return Response.json(
          { error: 'ZOOM_CLIENT_ID not configured' },
          { status: 500, headers: corsHeaders }
        );
      }
      const redirectUri = `${url.origin}/auth/zoom/callback`;
      const zoomAuthUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      return Response.redirect(zoomAuthUrl, 302);
    }

    // OAuth callback handler
    if (url.pathname === '/auth/zoom/callback') {
      const code = url.searchParams.get('code');
      if (!code) {
        return Response.json(
          { error: 'Missing authorization code' },
          { status: 400, headers: corsHeaders }
        );
      }

      try {
        const tokenResponse = await fetch('https://zoom.us/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${btoa(`${env.ZOOM_CLIENT_ID}:${env.ZOOM_CLIENT_SECRET}`)}`,
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${url.origin}/auth/zoom/callback`,
          }),
        });

        if (!tokenResponse.ok) {
          return Response.json(
            { error: 'Token exchange failed' },
            { status: 502, headers: corsHeaders }
          );
        }

        // In production, store the token securely (KV, D1, etc.)
        return new Response(
          `<!DOCTYPE html><html><body><h2>✅ Zoom App Installed Successfully</h2>
           <p>You can close this window and return to the Zoom Agent Desktop.</p>
           <script>window.close();</script></body></html>`,
          { headers: { 'Content-Type': 'text/html', ...corsHeaders } }
        );
      } catch (err) {
        return Response.json(
          { error: 'OAuth exchange error' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // All other routes fall through to Cloudflare Assets (public/)
    return env.ASSETS.fetch(request);
  },
};
