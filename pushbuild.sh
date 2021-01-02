#!/usr/bin/bash
set -x
git add .
git commit -m "quick commit. $1"
git push
npm run build
