# Skereal Backend

Express API server for Skereal.io — handles authentication, project/version management, image generation queue, and real-time status updates.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express 4
- **Database**: MongoDB 7 via Mongoose 8
- **Queue**: BullMQ + Redis 7
- **Real-time**: Socket.io 4
- **Auth**: Google OAuth 2.0 + JWT
- **AI**: Google Gemini 2.5 Flash
- **File Upload**: Multer (disk storage)

## Project Structure

```
src/
├── modules/
│   ├── auth/           # Google OAuth, JWT, user model
│   ├── project/        # Projects, versions, Gemini service
│   ├── gallery/        # Gallery endpoints
│   └── queue/          # BullMQ queue + image generation worker
├── shared/
│   ├── config/         # database.js, redis.js, socket.js
│   ├── middleware/      # error-handler.js, rate-limiter.js
│   └── utils/          # logger.js, validators.js, upload.js
├── app.js              # Express app setup
└── server.js           # HTTP server, startup, graceful shutdown
uploads/
├── projects/           # Uploaded sketch images
└── generated/          # AI-generated output images
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GEMINI_API_KEY` | Google Gemini API key |

### 3. Start MongoDB and Redis

```bash
# From the project root
docker-compose up -d
```

## Scripts

```bash
npm run dev       # Start with nodemon (auto-reload)
npm run start     # Production start
npm run lint      # Run ESLint
npm run format    # Run Prettier
```

## API Endpoints

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/google` | Exchange Google credential for JWT |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout (client-side token removal) |

### Projects

| Method | Path | Description |
|---|---|---|
| POST | `/api/projects` | Create project + queue generation |
| GET | `/api/projects` | List user's projects (paginated) |
| GET | `/api/projects/:id` | Get project by ID |
| DELETE | `/api/projects/:id` | Delete project and all its files |
| GET | `/api/projects/:id/versions` | List versions for a project |
| POST | `/api/projects/:id/versions` | Regenerate with new prompt |

### Gallery

| Method | Path | Description |
|---|---|---|
| GET | `/api/gallery/versions/:id` | Get a single version |

### Admin

| Path | Description |
|---|---|
| `/admin/queues` | Bull Board dashboard (development only) |

## Rate Limits

- General: 100 requests / 15 minutes
- Auth: 10 requests / 1 hour
- Generation: 5 requests / 1 minute

## Socket Events

The server emits events to `user:{userId}` rooms:

| Event | Payload | Description |
|---|---|---|
| `generation:status` | `{ versionId, progress, message }` | Progress update |
| `generation:complete` | `{ versionId, afterImage }` | Generation finished |
| `generation:error` | `{ versionId, error }` | Generation failed |

Clients join rooms by emitting:
- `join:user` with `userId`
- `join:project` with `projectId`
