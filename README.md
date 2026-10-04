# ArcanInk ✏️

**Real-time collaborative drawing — draw together, instantly, from anywhere.**

ArcanInk is a multiplayer canvas app where multiple users can sketch simultaneously on a shared board with low-latency synchronization. Think of it as a lightweight Excalidraw clone, built from scratch with a production-grade monorepo architecture.

> 📂 **[Report a Bug](https://github.com/ajaykumar-br/arcanInk/issues)**

## ✨ Features

- **Real-time multi-user canvas** — multiple users draw simultaneously with sub-100ms sync via WebSocket
- **Low-latency stroke streaming** — drawing events are broadcast instantly to all connected clients
- **Select tool (default)** — click to select, drag to move, `Delete` to remove; double-click empty space to type text, double-click text to edit it
- **Freehand pen** — smoothed, pressure-sensitive strokes (pen, touch and mouse)
- **Zoom & pan** — buttons or `Ctrl/⌘ + wheel` / pinch to zoom, wheel or empty-space drag to pan
- **Undo / redo** — `Ctrl/⌘ + Z`, `Ctrl/⌘ + Shift + Z`
- **Dark / light mode** — dark by default
- **Persistent room state** — canvas state is maintained across reconnections
- **Responsive UI** — works across desktop and tablet viewports
- **Monorepo architecture** — frontend and backend share utilities via a Turborepo workspace

---

## 🏗️ Architecture

ArcanInk is structured as a **Turborepo monorepo** with separate frontend and backend apps sharing a common packages layer.

```
arcanInk/
├── apps/
│   ├── web/          # Next.js frontend — canvas UI, WebSocket client
│   └── server/       # Node.js + WebSocket server — room & broadcast logic
├── packages/
│   ├── ui/           # Shared React component library (@ajaykumar_br/ui)
│   ├── eslint-config/ # Shared ESLint rules
│   └── typescript-config/ # Shared tsconfig
└── Docker/           # Dockerfiles for containerized deployment (see docker-compose.yml)
```

### How real-time sync works

1. A user draws a stroke on the canvas — the client captures pointer events and converts them to serialized shape data.
2. The stroke is sent over a **WebSocket connection** to the server.
3. The server broadcasts the stroke to all other clients in the same room.
4. Each receiving client renders the incoming stroke on their local canvas in real time.

This approach keeps the server stateless per-stroke while still enabling seamless multi-user collaboration.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, CSS |
| Real-time | WebSocket (ws) |
| Backend | Node.js |
| Monorepo | Turborepo, pnpm workspaces |
| Containerization | Docker |
| Language | TypeScript (100% across all packages) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Clone the repo
git clone https://github.com/ajaykumar-br/arcanInk.git
cd arcanInk

# Install dependencies across all workspaces
pnpm install
```

### Development

```bash
# Run all apps in development mode
pnpm dev
```

This starts both the Next.js frontend and the WebSocket server concurrently via Turborepo's task pipeline.

### Production Build

```bash
pnpm build
```

### Docker

```bash
cp .env.example .env     # then set JWT_SECRET (openssl rand -hex 32)
docker compose up --build
```

This starts Postgres, applies the Prisma migrations, then runs the HTTP API (`:3001`), the
WebSocket server (`:8080`) and the web app (`:3000`). Open http://localhost:3000.

### Free deployment

There is no CI/CD pipeline (nothing here consumes GitHub Actions minutes). To run it for free,
use an always-free VM and the same compose file:

1. Create an **Oracle Cloud Always Free** VM (Ubuntu, Ampere A1) and install Docker.
2. `git clone` the repo, `cp .env.example .env`, and set `JWT_SECRET` (required) plus
   `NEXT_PUBLIC_HTTP_BACKEND_URL` / `NEXT_PUBLIC_WS_URL` to the VM's public address.
3. `docker compose up -d --build`, and open ports 3000, 3001 and 8080 in the VM's firewall.

If the site is served over HTTPS (needed on most free domains), browsers block plain `ws://`;
put a TLS reverse proxy such as Caddy in front and use `wss://` / `https://` URLs.

---

## 📁 Monorepo Design

ArcanInk uses **Turborepo** to manage the build pipeline across multiple apps and shared packages. Key benefits:

- **Shared UI components** — the `@ajaykumar_br/ui` package is consumed by both apps, eliminating duplicated component logic
- **Unified linting and TypeScript config** — consistent code standards enforced across all workspaces
- **Parallel task execution** — Turborepo runs builds, type checks, and lint in parallel, cutting CI time significantly
- **Remote caching ready** — configured to support Vercel Remote Cache for faster team builds

---

## 🗺️ Roadmap

- [ ] Persistent canvas storage (save/load boards)
- [ ] User cursors with name labels
- [ ] Shape tools (rectangles, circles, arrows)
- [ ] Export canvas as PNG/SVG
- [ ] Authentication and private rooms

---

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.

---

## 🤝 Author

**Ajay Kumar B R** · [LinkedIn](https://linkedin.com/in/Ajay-Kumar-BR) · [GitHub](https://github.com/ajaykumar-br)
