#!/bin/sh
set -e

node scripts/generate-config.js
exec node server.js
