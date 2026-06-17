# ArcanInk ✏️

**Real-time collaborative drawing — draw together, instantly, from anywhere.**

ArcanInk is a multiplayer canvas app where multiple users can sketch simultaneously on a shared board with low-latency synchronization. Think of it as a lightweight Excalidraw clone, built from scratch with a production-grade monorepo architecture.

> 📂 **[Report a Bug](https://github.com/ajaykumar-br/arcanInk/issues)**

## ✨ Features

- **Real-time multi-user canvas** — multiple users draw simultaneously with sub-100ms sync via WebSocket
- **Low-latency stroke streaming** — drawing events are broadcast instantly to all connected clients
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
├── Docker/           # Dockerfiles for containerized deployment
└── .github/workflows/ # CI/CD pipeline via GitHub Actions
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
| CI/CD | GitHub Actions |
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
# Build and run with Docker
docker compose -f Docker/docker-compose.yml up --build
```

---

## ⚙️ CI/CD

This project uses **GitHub Actions** for automated builds and deployments. On every push to `main`:

- Dependencies are installed via pnpm
- All packages are type-checked and linted
- Build artifacts are generated across the monorepo

See `.github/workflows/` for the full pipeline configuration.

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
