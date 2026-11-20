# Shared community counter

This standalone Cloudflare Worker stores this explorer's visits and likes in its own SQLite-backed Durable Object. It does not use or change the workshop counter. It accepts `GET /v1/counts` and `POST /v1/visit` or `/v1/like` with JSON `{ "token": "..." }`; retrying the same token does not increment the count twice. Counts begin at zero on first deployment. The browser stores a session visit token and a persistent like token; these are approximate engagement counts, not verified unique people, and can be manipulated by direct API requests.

## Deploy

1. Install Node.js, sign in to the intended Cloudflare account with Wrangler (`npx wrangler login`), and enable a `workers.dev` subdomain if the account does not have one.
2. From this directory, run `npx wrangler deploy`. The configuration creates a new worker named `traction-inverter-counter` and an SQLite-backed Durable Object. Review Cloudflare's current pricing and quotas for Workers and Durable Objects before deployment.
3. The client expects `https://traction-inverter-counter.xinzelee.workers.dev/v1/`. If deployed under another account or worker name, set the repository Actions variable `VITE_COUNTER_API_URL` to the new worker URL ending in `/v1/`, then rebuild and deploy the site. Local development can set the same variable in an untracked `.env.local` file.
4. Check `GET https://<your-worker>.workers.dev/v1/counts` returns JSON such as `{ "visits": 0, "likes": 0 }`. Then open the explorer and check a visit and like from a browser.

CORS permits `https://xinzelee.github.io` and local development on `localhost` and `127.0.0.1`. If the site moves to a custom domain, add the precise origin in `src/index.js` before redeploying. CORS is not an anti-abuse mechanism; the endpoint is public.

See [Cloudflare's Durable Objects guide](https://developers.cloudflare.com/durable-objects/get-started/) for account setup and deployment, and [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) for current limits.
