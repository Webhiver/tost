#!/bin/bash

set -e

GITHUB_TOKEN="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"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BUMP="$1"
NOTES="$2"
VALID_BUMPS=("major" "minor" "patch")
VALID_REVISIONS=("breadboard-dht" "breadboard-sht" "case-dht" "case-sht")

if [[ -z "$BUMP" ]]; then
    echo "Usage: $0 <bump> [notes]"
    echo ""
    echo "  bump:  ${VALID_BUMPS[*]}"
    echo "  notes: optional release description (auto-generated if omitted)"
    echo ""
    echo "Example: $0 patch"
    echo "Example: $0 minor \"Added SHT sensor support\""
    exit 1
fi

valid=false
for b in "${VALID_BUMPS[@]}"; do
    if [[ "$b" == "$BUMP" ]]; then
        valid=true
        break
    fi
done
if [[ "$valid" != true ]]; then
    echo "Error: Invalid bump type '$BUMP'"
    echo "Valid bump types: ${VALID_BUMPS[*]}"
    exit 1
fi

echo "Starting release build (bump: $BUMP) for ${#VALID_REVISIONS[@]} revisions..."
echo ""

first=true
for revision in "${VALID_REVISIONS[@]}"; do
    if [[ "$first" == true ]]; then
        # Bump version only on the first build (build.sh reads BUMP as $3)
        "$SCRIPT_DIR/build.sh" "$revision" "" "$BUMP"
        first=false
    else
        "$SCRIPT_DIR/build.sh" "$revision"
    fi
    echo ""
done

echo "Release complete! All revisions built."

# Read the bumped version
VERSION=$(grep -o '"[^"]*"' "$SCRIPT_DIR/src/version.py" | tr -d '"')
TAG="v$VERSION"

echo "Committing version bump..."
git -C "$SCRIPT_DIR" add "$SCRIPT_DIR/src/version.py"
git -C "$SCRIPT_DIR" commit -m "Bump version to $VERSION"
echo "Pushing to remote..."
git -C "$SCRIPT_DIR" push
echo ""

# Parse owner and repo name from remote URL (handles both SSH and HTTPS)
REMOTE_URL=$(git -C "$SCRIPT_DIR" remote get-url origin)
REPO_PATH=$(echo "$REMOTE_URL" | sed 's|.*github\.com[:/]\(.*\)\.git|\1|' | sed 's|.*github\.com[:/]\(.*\)|\1|')
OWNER=$(echo "$REPO_PATH" | cut -d'/' -f1)
REPO_NAME=$(echo "$REPO_PATH" | cut -d'/' -f2)

COMMIT_SHA=$(git -C "$SCRIPT_DIR" rev-parse HEAD)

echo "Creating GitHub release $TAG..."
if [[ -n "$NOTES" ]]; then
    RELEASE_PAYLOAD=$(jq -n --arg tag "$TAG" --arg sha "$COMMIT_SHA" --arg notes "$NOTES" \
        '{tag_name: $tag, target_commitish: $sha, name: $tag, body: $notes, draft: false, prerelease: false}')
else
    RELEASE_PAYLOAD=$(jq -n --arg tag "$TAG" --arg sha "$COMMIT_SHA" \
        '{tag_name: $tag, target_commitish: $sha, name: $tag, generate_release_notes: true, draft: false, prerelease: false}')
fi
RESPONSE=$(curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.github.com/repos/$OWNER/$REPO_NAME/releases" \
    -d "$RELEASE_PAYLOAD")

if echo "$RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
    echo "Error: GitHub release creation failed"
    echo "Response: $RESPONSE"
    exit 1
fi

UPLOAD_URL=$(echo $RESPONSE | jq -r '.upload_url' | sed 's/{?name,label}//')

echo "Release created: $TAG"
echo "Upload URL: $UPLOAD_URL"

echo "Uploading firmware assets..."
for revision in "${VALID_REVISIONS[@]}"; do
    FILENAME="firmware-${revision}-${VERSION}.tar.gz"
    FILEPATH="$SCRIPT_DIR/releases/$FILENAME"
    echo "  Uploading $FILENAME..."
    UPLOAD_RESPONSE=$(curl -s -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Content-Type: application/octet-stream" \
        "$UPLOAD_URL?name=$FILENAME" \
        --data-binary @"$FILEPATH")
    if ! echo "$UPLOAD_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
        echo "Error: Failed to upload $FILENAME"
        echo "Response: $UPLOAD_RESPONSE"
        exit 1
    fi
    echo "  Uploaded $FILENAME"
done

echo "All assets uploaded."
