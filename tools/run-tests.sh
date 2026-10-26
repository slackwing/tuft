#!/usr/bin/env bash
#
# Run every test under tests/js/ and tests/ui/. Each test file is a standalone Node
# script that exits non-zero on failure. We run them sequentially and
# stop on the first failure (set -e).

set -e

cd "$(dirname "$0")/.."

shopt -s nullglob
files=(tests/js/test-*.js tests/ui/test-*.js)
shopt -u nullglob

if [ ${#files[@]} -eq 0 ]; then
    echo "No test files found." >&2
    exit 1
fi

for f in "${files[@]}"; do
    echo "== $f =="
    node "$f"
    echo
done

echo "All ${#files[@]} test file(s) passed."
