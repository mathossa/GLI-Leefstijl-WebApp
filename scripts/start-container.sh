#!/bin/sh
# Single-instance deployment: schema migrations must finish before HTTP starts.
set -eu
cd /app
echo "[startup] Applying pending Prisma migrations"
./node_modules/.bin/prisma migrate deploy
echo "[startup] Prisma migration completed; starting Next.js"
exec node server.js
