#!/usr/bin/env bash
set -e

load_if_missing() {
  local image=$1 tar=$2
  if ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "Image $image missing, loading $tar..."
    docker load -i "$tar" || {
      echo "Load failed, letting compose pull from registry." >&2
      return 1
    }
  fi
}

cd /Users/taopeng/Desktop/Blog/docker/backup
load_if_missing mysql:latest mysql-latest.tar
load_if_missing redis:latest redis-latest.tar
load_if_missing node:lts-alpine node-lts-alpine.tar
load_if_missing nginx:alpine nginx-alpine.tar