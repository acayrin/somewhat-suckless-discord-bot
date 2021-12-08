#!/bin/bash
VERSION=v16.13.1

curl -O https://nodejs.org/dist/v16.13.1/node-$VERSION-linux-x64.tar.xz
tar xf node-$VERSION-linux-x64.tar.xz 
mv node-$VERSION-linux-x64 node
rm node-$VERSION-linux-x64.tar.xz 

echo 'language = "nodejs"
run = "npm i && npm run build && cp config.json dist/ && node/bin/node dist/index.js"' >> .replit

exit 1