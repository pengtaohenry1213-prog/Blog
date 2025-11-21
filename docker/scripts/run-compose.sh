#!/usr/bin/env bash
set -e
/Users/taopeng/Desktop/Blog/docker/scripts/load-images.sh || true
cd /Users/taopeng/Desktop/Blog/docker
docker-compose up -d --build