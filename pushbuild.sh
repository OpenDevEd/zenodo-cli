#!/bin/sh
set -x
git add .
git commit -m "intermediate version"
git push
npm run build