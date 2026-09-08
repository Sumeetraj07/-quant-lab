// Cloudflare Worker Router for QuantLab (*.workers.dev)
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Proxy API endpoints (/api/v1/*) to backend engine
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = new URL(url.pathname + url.search, env.BACKEND_URL || 'https://quantlab.onrender.com');
      const modifiedRequest = new Request(backendUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
      });
      return fetch(modifiedRequest);
    }

    // Serve React SPA static assets for all client routes
    return env.ASSETS.fetch(request);
  }
};
