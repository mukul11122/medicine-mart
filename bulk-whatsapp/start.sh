#!/bin/bash
cd "$(dirname "$0")"
echo "Installing dependencies (first run only, needs internet)..."
npm install
echo "Starting server..."
(xdg-open http://localhost:3000 || open http://localhost:3000) &
node server.mjs
