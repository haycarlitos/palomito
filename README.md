## ENS Offchain Subnames + Privy Starter Kit

A Next.js starter kit demonstrating the integration of Namespace Offchain Subnames with Privy authentication. Create and manage ENS subnames with a clean, production-ready UX: wallet auth, identity resolution, username creation, and avatar uploads.

- Repository: [`thenamespace/ens-subnames-privy-template`](https://github.com/thenamespace/ens-subnames-privy-template)

### Features

- Privy auth with embedded wallets and Wagmi
- Offchain subname creation via secure API routes
- Preferred identity resolution (subname → ENS → truncated address)
- Account modal with username creation and avatar upload
- Clean hooks for fetching and updating Namespace data

## Use this as a template

Use GitHub’s template feature:

1. Open: [`thenamespace/ens-subnames-privy-template`](https://github.com/thenamespace/ens-subnames-privy-template)
2. Click “Use this template” → “Create a new repository”
3. Clone your new repository locally

Or clone directly:

```bash
git clone https://github.com/thenamespace/ens-subnames-privy-template.git
cd ens-subnames-privy-template
pnpm install
```

## Prerequisites

- Node.js v18+
- An ENS name you control (e.g. `namespace.eth`)
- Namespace API key from the Dev Portal (`https://dev.namespace.ninja`)
- Privy App ID and Client ID (`https://dashboard.privy.io`)

## Environment variables

Create a `.env.local` in the project root with the following values:

```env
# Privy (public; required)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_PRIVY_CLIENT_ID=your_privy_client_id

# ENS name (public; required)
NEXT_PUBLIC_ENS_NAME=namespace.eth

# Namespace API key (server; required)
NAMESPACE_API_KEY=your_namespace_api_key

# Network/env (public; optional if not testnet)
NEXT_PUBLIC_NETWORK=mainnet

# Avatar service + SIWE
NEXT_PUBLIC_SIWE_DOMAIN=localhost:3000 # Change to your app domain
NEXT_PUBLIC_SIWE_URI=http://localhost:3000 # Change to your app uri
NEXT_PUBLIC_AVATAR_SERVICE_URL=https://metadata.namespace.ninja
NEXT_PUBLIC_SIWE_CHAIN_ID=1

```

Notes:

- Do not expose server-only secrets in client code. The API key is used only server-side.
- If you change domains or networks, update the SIWE values accordingly.

## Configure your ENS name

1. Visit the Namespace Dev Portal (`https://dev.namespace.ninja`)
2. Point your ENS name’s resolver to Namespace’s resolver
3. Generate your Namespace API key
4. Add the API key to `.env.local`

## Run the app

```bash
pnpm dev
```

Open http://localhost:3000 to see the app.

## Architecture

- `src/providers/providers.tsx`: Privy + Wagmi + React Query providers
- `src/lib/namespace.ts`: Server-side Namespace client, configured with `NAMESPACE_API_KEY`
- `src/lib/namespace-client.ts`: Client-side read-only Namespace client (no API key)
- `src/app/api/subname/create/route.ts`: Secure subname creation API (server)
- `src/app/api/subname/avatar/route.ts`: Update avatar text record API (server)
- `src/hooks/use-subnames.ts`: Fetch subnames and build preferred identity
- `src/hooks/use-identity.ts`: Combine ENS with preferred identity
- `src/hooks/use-upload-avatar.ts`: SIWE + upload avatar to the avatar service; updates text record
- `src/hooks/use-update-ens-avatar.ts`: Helper to update avatar via server API
- `src/components/ui/account-modal.tsx`: Account modal (create username, upload avatar)
- `src/components/ui/profile-button.tsx`: Connect flow + opens account modal

## Key flows

### Authentication (Privy)

- Configured in `src/providers/providers.tsx` via `NEXT_PUBLIC_PRIVY_APP_ID` and `NEXT_PUBLIC_PRIVY_CLIENT_ID`
- Embedded wallets enabled for a smooth onboarding experience

### Subname creation

- Client calls `POST /api/subname/create` with validated inputs
- Server uses `src/lib/namespace.ts` with `NAMESPACE_API_KEY` to create the subname

### Identity resolution

- `use-subnames.ts` picks the best display name (offchain subname → ENS → truncated address)

### Avatar upload

- `use-upload-avatar.ts` signs a SIWE message, uploads to `NEXT_PUBLIC_AVATAR_SERVICE_URL`, then updates the ENS text record via server API

## Security

- Never expose `NAMESPACE_API_KEY` to the client
- All write operations happen in API routes or server-side code only
- Validate input on API routes (already included)

## References

- GitHub repository: [`thenamespace/ens-subnames-privy-template`](https://github.com/thenamespace/ens-subnames-privy-template)
- Namespace docs: [`https://docs.namespace.ninja/`](https://docs.namespace.ninja/)
- Offchain Manager SDK: [`https://docs.namespace.ninja/developer-guide/sdks/offchain-manager`](https://docs.namespace.ninja/developer-guide/sdks/offchain-manager)
- Privy docs: [`https://docs.privy.io/`](https://docs.privy.io/)
- Wagmi: [`https://wagmi.sh/`](https://wagmi.sh/)

## License

MIT
