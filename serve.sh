#!/bin/sh
set -eu
cd $(dirname $0)
exec ./node_modules/.bin/parcel serve ./src/index.html
