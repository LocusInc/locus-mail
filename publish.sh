#!/bin/bash

set -euo pipefail

# npm publish invokes the publish lifecycle after uploading. Only the explicit
# npm run publish command (or direct script invocation) should start a release.
if [[ "${npm_command:-}" == "publish" ]]; then
  exit 0
fi

usage() {
  echo "Usage: ./publish.sh [patch|minor|major]"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ $# -gt 1 ]]; then
  usage >&2
  exit 1
fi

BUMP_TYPE="${1:-patch}"
case "$BUMP_TYPE" in
  patch|minor|major) ;;
  *)
    echo "Invalid bump type: $BUMP_TYPE" >&2
    usage >&2
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

npm version "$BUMP_TYPE" --no-git-tag-version
# npm publish runs the package's prepack build before uploading.
npm publish
NEW_VERSION=$(node -p 'require("./package.json").version')
echo "Successfully published @locus-ui/mail@$NEW_VERSION"
