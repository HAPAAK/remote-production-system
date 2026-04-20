# Remote Production System — Visual Workflow Builder

A full-stack application for visually designing and simulating remote production workflows. Built with React Flow, Node.js/Express, MongoDB, and Socket.io.

## Architecture

```
packages/
  shared/     — TypeScript types, enums, and WorkflowValidator (used by both FE & BE)
  server/     — Express REST API, MongoDB persistence, Socket.io, Simulation Engine
  client/     — React + React Flow visual canvas, real-time state sync
```

## Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB Atlas account (free tier)

### 1. Install dependencies
```bash
npm install
```

### 2. Build shared types
```bash
npm run build -w packages/shared
```

### 3. Configure MongoDB
Copy the example and add your Atlas connection string:
```bash
cp packages/server/.env.example packages/server/.env
# Edit .env with your MONGODB_URI
```

### 4. Run development servers
```bash
npm run dev
```
This starts both:
- **Server**: http://localhost:4000
- **Client**: http://localhost:5173 (proxies API to server)

## Node Types

| Type | Description | Constraints |
|------|-------------|-------------|
| Input Source | Camera, SRT Ingest, NDI | Outgoing connections only |
| Encoder | H.264, HEVC, AV1 compression | Must precede Transport |
| Transport | SRT, RIST, RTP network pipe | Requires Encoder upstream |
| Studio Processing | Mixing, Graphics, Audio | Many-to-One supported |
| Distribution Output | YouTube, Twitch, CDN, TV | Incoming connections only |

## Validation Rules

1. **DAG Enforcement** — No cycles allowed
2. **Mandatory Endpoints** — At least 1 Input Source and 1 Distribution Output
3. **Encoded Pipe Rule** — Transport must receive from an Encoder
4. **Handle Constraints** — Input Source: outgoing only; Distribution: incoming only

## Simulation

- Each node has configurable `failureProbability` (0–100%) and `processingDelay` (ms)
- On **Start**: BFS traversal from source nodes, each node runs after its delay
- On **Failure**: Halt & Block — all downstream nodes are immediately blocked
- On **Stop**: All running nodes halt
- On **Reset**: All nodes return to idle

## API

All endpoints: `POST /api/v1/workflows`, `GET /api/v1/workflows`, `GET /api/v1/workflows/:id`, `PUT /api/v1/workflows/:id`, `DELETE /api/v1/workflows/:id`, `POST /api/v1/workflows/:id/execute`

Response envelope:
```json
{ "success": true, "data": {}, "metadata": { "timestamp": "...", "version": "1.0.0" }, "error": null }
```

