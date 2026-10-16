#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
(cd backend && ./mvnw -B test spotless:check)
(cd frontend && npm ci && npm test && npm run build)
