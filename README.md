# ZCC Scientific Calculator

A full-featured scientific calculator embedded app for the **Zoom Contact Center Agent Desktop**.

Built as a Cloudflare Worker + static HTML/JS/CSS widget, designed to be registered as a Zoom Marketplace General App and embedded in the ZCC Agent Desktop side panel.

## Features

### Scientific Functions
- **Arithmetic**: +, −, ×, ÷, mod, parentheses
- **Trigonometric**: sin, cos, tan and their inverses (DEG/RAD toggle)
- **Logarithmic**: log₁₀, ln, eˣ, 10ˣ
- **Powers & Roots**: x², x³, xʸ, √x, ∛x
- **Combinatorics**: x!, nPr, nCr
- **Constants**: π, e
- **Utility**: |x|, 1/x, %, ±, random, floor, ceil, ANS
- **Memory**: MC, MR, MS, M+, M−

### Unit Conversions
Length, Weight/Mass, Temperature, Speed, Area, Volume, Pressure, Energy, Data Storage, Time

### Base-N Conversions
Decimal ↔ Hexadecimal ↔ Octal ↔ Binary with hex keypad

### UX
- Dark theme matching Zoom Agent Desktop
- Calculation history with recall
- Full keyboard support
- Responsive layout for side-panel embedding

## Architecture

```
zcc-scientific-calculator/
├── public/
│   ├── index.html          # Calculator UI
│   ├── styles.css           # Zoom-themed dark CSS
│   └── calculator.js        # Full calculator engine
├── src/
│   └── worker.js            # Cloudflare Worker (OAuth, health API)
├── zoom-app-manifest.json   # Zoom Marketplace app manifest
├── wrangler.jsonc            # Cloudflare deployment config
├── package.json
└── README.md
```

## Zoom Marketplace Registration

### Required Scopes
| Scope | Purpose |
|-------|---------|
| `contact_center:read:admin` | Read agent desktop context |
| `contact_center:write:admin` | Embedded app registration |

### App Configuration
1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/) → Develop → Build App
2. Choose **General App**
3. Set **App Name**: `ZCC Scientific Calculator`
4. Under **Surface** → select **Contact Center** → **Agent Desktop**
5. Configure OAuth redirect URL: `https://zcc-scientific-calculator.<your-cf-subdomain>.workers.dev/auth/zoom/callback`
6. Add the scopes listed above
7. Set the **Home URL** to your deployed Cloudflare Workers URL
8. Activate the app for development testing

### OAuth Credentials
Store these as Cloudflare Worker secrets (never in code):
```bash
wrangler secret put ZOOM_CLIENT_ID
wrangler secret put ZOOM_CLIENT_SECRET
```

## Cloudflare Deployment

### Prerequisites
- Node.js ≥ 20
- Cloudflare account with Workers enabled
- `wrangler` CLI authenticated (`npx wrangler login`)

### Deploy
```bash
npm install
npm run deploy
```

### Local Development
```bash
npm run dev
```

## Testing in ZCC Agent Desktop

1. Deploy to Cloudflare Workers
2. Register the app in Zoom Marketplace (development mode)
3. Add the app to your Zoom account
4. Open Zoom Contact Center → Agent Desktop
5. The Scientific Calculator appears in the embedded apps panel
6. Test all scientific functions, unit conversions, and base-N conversions

## Security

- OAuth secrets stored as Cloudflare Worker secrets (environment variables)
- CORS headers configured for ZCC Agent Desktop embedding
- No external dependencies in the calculator UI (fully self-contained)
- CSP-compliant: no inline event handlers, no eval in the UI layer
