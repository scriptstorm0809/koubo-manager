#!/bin/bash
# prebuild.sh — 确保 data/口播词 在构建前有内容
# 本地开发: 从 ../口播文案/口播词 复制（如果源存在）
# Vercel CI: data/口播词 已在 repo 里，跳过

set -e

DATA_DIR="data/口播词"
SOURCE_DIR="../口播文案/口播词"

# 如果本地源目录存在且 data/口播词 为空或不存在，执行复制
if [ -d "$SOURCE_DIR" ] && [ ! "$(ls -A $DATA_DIR 2>/dev/null)" ]; then
  echo "[prebuild] 从 $SOURCE_DIR 复制口播词到 $DATA_DIR"
  mkdir -p "$DATA_DIR"
  # 按日期目录结构复制
  for dir in "$SOURCE_DIR"/*/; do
    if [ -d "$dir" ]; then
      dirname=$(basename "$dir")
      mkdir -p "$DATA_DIR/$dirname"
      cp -r "$dir"*.md "$DATA_DIR/$dirname/" 2>/dev/null || true
    fi
  done
elif [ ! "$(ls -A $DATA_DIR 2>/dev/null)" ]; then
  echo "[prebuild] 警告: $DATA_DIR 为空且找不到源目录 $SOURCE_DIR"
  echo "[prebuild] 请确保 data/口播词/ 目录有内容后再构建"
fi

echo "[prebuild] 完成，当前 data/口播词 内容:"
ls "$DATA_DIR" 2>/dev/null || echo "(空)"
