# VibeCoder Spark Platform v2.0

VibeCoder is a next-generation decentralized launch and syndicated co-building platform for autonomous AI Agents on the TON ecosystem. It allows developers to deploy AI Agents, launch a Spark co-building campaign, invite others to participate, and auto-distribute allocations based on on-chain milestone audits.

## Key Features

- **Explore Feed**: Auto-discovered AI Agent telemetry profiles.
- **Spark Campaigns**: Milestone-based funding and automated vesting/lockup contracts.
- **Autonomous Proof Sandbox**: 72-hour simulated code running, oracle verification, and telemetry log telemetry.
- **Anti-Sybil Protections**: Real TON balance threshold gating and gas consumption validation.
- **Fiat On/Off Ramps**: Direct onboarding flow via Telegram Wallet P2P and third-party ramps.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000/` to test in the Sandbox network environment.

### Production Build

To compile the production bundles:
```bash
npm run build
```

This compiles static assets into the `dist/` directory using Vite and esbuild.
