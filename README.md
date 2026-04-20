# Remote Production System — Visual Workflow Builder

A full-stack application for visually designing and simulating remote production workflows. Built with React Flow, Node.js/Express, MongoDB, and Socket.io.

## Architecture

```text
packages/
  shared/     — TypeScript types, enums, and WorkflowValidator (used by both FE & BE)
  server/     — Express REST API, MongoDB persistence, Socket.io, Simulation Engine
  client/     — React + React Flow visual canvas, real-time state sync
```

## Quick Start

### Prerequisites
- **Node.js >= 20 strictly required** (Using Node 18 will cause setup/build errors)
- **MongoDB Atlas** account (free tier)

### 1. Install dependencies
```bash
npm install
```

### 2. Build shared types
```bash
npm run build -w packages/shared
```

### 3. Configure MongoDB
Create an `.env` file in `packages/server/.env` and add your Atlas connection string:
```bash
MONGODB_URI=your_db_connection_url
PORT=4000
```

### 4. Run development servers (in separate terminals)

**Terminal 1 — Server:**
```bash
cd packages/server
npx ts-node-dev --respawn --transpile-only src/index.ts
```

**Terminal 2 — Client:**
```bash
cd packages/client
npm run dev
```

Then visit **http://localhost:5173/** in your browser.

## Node Types

| Type | Description | Constraints |
|------|-------------|-------------|
| Input Source | Camera, SRT Ingest, NDI | Outgoing connections only |
| Encoder | H.264, HEVC, AV1 compression | Only accepts input from Input Source |
| Transport | SRT, RIST, RTP network pipe | Must receive input from Encoder |
| Studio Processing | Mixing, Graphics, Audio | Must receive input from Transport |
| Distribution Output | YouTube, Twitch, CDN, TV | Must receive input from Studio Processing |

## Validation Rules

1. **DAG Enforcement** — No cycles allowed. Media must flow in one direction.
2. **Mandatory Endpoints** — At least 1 Input Source and 1 Distribution Output.
3. **Rigid Pipeline Sequence** — The flow must strictly be:
   **Input Source ➡️ Encoder ➡️ Transport ➡️ Studio Processing ➡️ Distribution Output**

## Simulation Model
- Each node has a configurable `failureProbability` (0–100%) and `processingDelay` (ms).
- On **Start**: An async BFS traversal simulating a state-machine kicks off. Each node resolves based on upstream tasks completing.
- On **Failure (Halt & Block)**: If a node sporadically fails based on its probability, the system immediately triggers the *Blocked* state for all downstream nodes.
- **Immediate Re-Sync**: Changing any property of a node instantly syncs over WebSocket so long operations persist accurately.

## API Documentation

Follows a pure REST approach on collection `workflows`:
`POST /api/v1/workflows`, `GET /api/v1/workflows`, `GET /api/v1/workflows/:id`, `PUT /api/v1/workflows/:id`, `DELETE /api/v1/workflows/:id`, `POST /api/v1/workflows/:id/execute`

Standard Response envelope (for easy JSON consumption):
```json
{ "success": true, "data": {}, "metadata": { "timestamp": "...", "version": "1.0.0" }, "error": null }
```

