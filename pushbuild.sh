#!/bin/sh
set -x
git add .
git commit -m "quick commit - intermediate version for pair coding"
git push
npm run build