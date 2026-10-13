#!/bin/sh
# Rebuild the starter zips after editing exercises/03-starter or demos/playground.
set -e
cd "$(dirname "$0")"
rm -f 03-starter.zip 03-playground-starter.zip
zip -qr 03-starter.zip 03-starter -x '*.DS_Store'
tmp=$(mktemp -d)
cp -R ../demos/playground "$tmp/03-playground-starter"
(cd "$tmp" && zip -qr 03-playground-starter.zip 03-playground-starter -x '*.DS_Store')
mv "$tmp/03-playground-starter.zip" .
rm -rf "$tmp"
