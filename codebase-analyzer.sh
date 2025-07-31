#!/bin/bash

# Quick and dirty codebase size analyzer
# Excludes common directories that shouldn't be counted
# Also excludes design files, images, and binary assets

echo "🔍 Analyzing codebase size..."
echo "================================"
echo "ℹ️  Excluding: dependencies, build artifacts, images, design files, lock files, env files, docs, configs"
echo "💡 Also counting executable lines without comments"
echo ""

# Use find with -prune to properly exclude directories and design files
find . \( \
    -name "node_modules" -o \
    -name ".git" -o \
    -name ".next" -o \
    -name "dist" -o \
    -name "build" -o \
    -name "coverage" -o \
    -name "vendor" -o \
    -name ".vscode" -o \
    -name ".idea" -o \
    -name "target" -o \
    -name "__pycache__" -o \
    -name ".pytest_cache" -o \
    -name ".mypy_cache" -o \
    -name "logs" -o \
    -name "tmp" -o \
    -name ".DS_Store" -o \
    -name "designs" \
\) -prune -o -type f \( \
    ! -name "*.png" -a \
    ! -name "*.jpg" -a \
    ! -name "*.jpeg" -a \
    ! -name "*.gif" -a \
    ! -name "*.svg" -a \
    ! -name "*.ico" -a \
    ! -name "*.webp" -a \
    ! -name "*.bmp" -a \
    ! -name "go.mod" -a \
    ! -name "go.sum" -a \
    ! -name "package-lock.json" -a \
    ! -name "yarn.lock" -a \
    ! -name "pnpm-lock.yaml" -a \
    ! -name "Cargo.lock" -a \
    ! -name "Pipfile.lock" -a \
    ! -name "poetry.lock" -a \
    ! -name "composer.lock" -a \
    ! -name "Gemfile.lock" -a \
    ! -name "*.tsbuildinfo" -a \
    ! -name "coverage.out" -a \
    ! -name "*.log" -a \
    ! -name ".env" -a \
    ! -name ".env.*" -a \
    ! -name "*.tmp" -a \
    ! -name "*.temp" -a \
    ! -name "*.md" -a \
    ! -name "*.json" \
\) -print > /tmp/codebase_files.txt

# Count total files
echo "📁 Counting files..."
TOTAL_FILES=$(cat /tmp/codebase_files.txt | wc -l)
echo "Total files: $TOTAL_FILES"

# Count lines of code (only for source files)
echo ""
echo "📝 Counting lines of code..."
TOTAL_LINES=$(cat /tmp/codebase_files.txt | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
echo "Total lines (with comments): $TOTAL_LINES"

# Count lines without comments
echo ""
echo "🎯 Lines of code (excluding comments):"
echo "====================================="

# Count Go code without comments
GO_LINES_NO_COMMENTS=$(grep '\.go$' /tmp/codebase_files.txt | xargs cat 2>/dev/null | sed '/^\s*\/\//d; /^\s*\/\*/,/\*\//d; /^\s*$/d' | wc -l)
echo "Go (no comments):        $GO_LINES_NO_COMMENTS lines"

# Count TypeScript/JS without comments  
TS_LINES_NO_COMMENTS=$(grep -E '\.(ts|tsx|js|jsx)$' /tmp/codebase_files.txt | xargs cat 2>/dev/null | sed '/^\s*\/\//d; /^\s*\/\*/,/\*\//d; /^\s*$/d' | wc -l)
echo "TypeScript/JS (no comments): $TS_LINES_NO_COMMENTS lines"

# Count CSS without comments
CSS_LINES_NO_COMMENTS=$(grep -E '\.(css|scss|sass)$' /tmp/codebase_files.txt | xargs cat 2>/dev/null | sed '/^\s*\/\*/,/\*\//d; /^\s*$/d' | wc -l)
echo "CSS (no comments):       $CSS_LINES_NO_COMMENTS lines"

# Count YAML without comments
YAML_LINES_NO_COMMENTS=$(grep -E '\.(yaml|yml)$' /tmp/codebase_files.txt | xargs cat 2>/dev/null | sed '/^\s*#/d; /^\s*$/d' | wc -l)
echo "YAML (no comments):      $YAML_LINES_NO_COMMENTS lines"

# Total executable lines
TOTAL_NO_COMMENTS=$((GO_LINES_NO_COMMENTS + TS_LINES_NO_COMMENTS + CSS_LINES_NO_COMMENTS + YAML_LINES_NO_COMMENTS))
echo ""
echo "🚀 Total executable lines (no comments/blanks): $TOTAL_NO_COMMENTS"

# File type breakdown
echo ""
echo "🎯 File type breakdown:"
echo "======================"
cat /tmp/codebase_files.txt | sed 's/.*\.//' | sort | uniq -c | sort -nr | head -15

# Language-specific counts
echo ""
echo "📋 Source code files:"
echo "===================="
echo "Go files:        $(grep '\.go$' /tmp/codebase_files.txt | wc -l)"
echo "TypeScript/JS:   $(grep -E '\.(ts|tsx|js|jsx)$' /tmp/codebase_files.txt | wc -l)"
echo "CSS/SCSS:        $(grep -E '\.(css|scss|sass)$' /tmp/codebase_files.txt | wc -l)"
echo "Markdown:        $(grep '\.md$' /tmp/codebase_files.txt | wc -l)"
echo "YAML/JSON:       $(grep -E '\.(yaml|yml|json)$' /tmp/codebase_files.txt | wc -l)"
echo "Docker:          $(grep -E '(Dockerfile|\.dockerfile)' /tmp/codebase_files.txt | wc -l)"

# Size breakdown
echo ""
echo "💾 Size breakdown:"
echo "=================="
cat /tmp/codebase_files.txt | xargs ls -la 2>/dev/null | awk '{total += $5} END {printf "Total size: %.2f MB\n", total/1024/1024}'

# Directory breakdown
echo ""
echo "📂 Directory breakdown (top level):"
echo "=================================="
for dir in */; do
    if [[ "$dir" != "node_modules/" && "$dir" != ".git/" && "$dir" != "designs/" ]]; then
        count=$(find "$dir" \( \
            -name "node_modules" -o \
            -name ".git" -o \
            -name ".next" -o \
            -name "dist" -o \
            -name "build" -o \
            -name "coverage" \
        \) -prune -o -type f \( \
            ! -name "*.png" -a \
            ! -name "*.jpg" -a \
            ! -name "*.jpeg" -a \
            ! -name "*.gif" -a \
            ! -name "*.svg" -a \
            ! -name "*.ico" -a \
            ! -name "*.webp" -a \
            ! -name "*.bmp" -a \
            ! -name "go.mod" -a \
            ! -name "go.sum" -a \
            ! -name "package-lock.json" -a \
            ! -name "yarn.lock" -a \
            ! -name "pnpm-lock.yaml" -a \
            ! -name "*.tsbuildinfo" -a \
            ! -name "coverage.out" -a \
            ! -name "*.log" -a \
            ! -name ".env" -a \
            ! -name ".env.*" -a \
            ! -name "*.md" -a \
            ! -name "*.json" \
        \) -print | wc -l)
        echo "$dir: $count files"
    fi
done

# Cleanup
rm -f /tmp/codebase_files.txt

echo ""
echo "✅ Analysis complete!"
