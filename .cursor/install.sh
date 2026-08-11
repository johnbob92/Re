#!/usr/bin/env bash
set -euo pipefail

# Install dependencies exactly from the lockfile.
npm ci

# HireFlow reads runtime config from .env.local (gitignored). Seed it from the
# committed example on first setup; leave any existing file untouched.
if [ ! -f .env.local ]; then
  cp .env.example .env.local
fi

# HireFlow defaults to USE_MEMORY_DB=true, which lazily downloads a mongod binary
# (~220MB) the first time the app connects. Warm it here so the first request in a
# fresh agent is fast and works offline. Idempotent: skips the download if cached.
node -e "import('mongodb-memory-server').then(async (m) => { const s = await m.MongoMemoryServer.create({ instance: { dbName: 'recruiter-system' } }); await s.stop(); console.log('mongod binary warmed'); }).catch((e) => { console.error('warm failed:', e); process.exit(1); });"
