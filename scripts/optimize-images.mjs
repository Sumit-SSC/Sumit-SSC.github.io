// scripts/optimize-images.mjs
// 
// Usage (run from repo root):
//   npm init -y          # once
//   npm install sharp    # once
//   node scripts/optimize-images.mjs
//
// This scans assets/images (excluding /optimized and /icons* folders),
// converts all PNG/JPG/JPEG files to WebP, and writes them under
// assets/images/optimized/ with the same relative path.
//
// Thumbnails (paths containing "thumb" or "thumbnail") are compressed a bit
// more aggressively (smaller file, still OK quality). Larger dashboard/gallery
// images keep higher quality.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..', '..');
const SRC_DIR = path.join(ROOT, 'assets', 'images');
const DEST_DIR = path.join(SRC_DIR, 'optimized');

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg']);

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function shouldSkipDir(fullPath) {
  const name = path.basename(fullPath).toLowerCase();
  if (name === 'optimized') return true;
  if (name.startsWith('icons')) return true; // keep icons as-is for now
  return false;
}

function getOptimizedPath(srcPath) {
  const rel = path.relative(SRC_DIR, srcPath); // e.g. projects/foo/01.jpg
  const parsed = path.parse(rel);
  const relWebp = path.join(parsed.dir, parsed.name + '.webp');
  return path.join(DEST_DIR, relWebp);
}

function isThumbnailPath(relPath) {
  const lower = relPath.toLowerCase();
  return lower.includes('thumb') || lower.includes('thumbnail');
}

async function convertImage(srcPath) {
  const relFromSrc = path.relative(SRC_DIR, srcPath);
  const destPath = getOptimizedPath(srcPath);
  await ensureDir(path.dirname(destPath));

  // Skip if already exists
  try {
    await fs.access(destPath);
    console.log('SKIP (exists):', path.relative(ROOT, destPath));
    return;
  } catch {
    // not found → proceed
  }

  console.log('OPTIMIZE:', path.relative(ROOT, srcPath), '→', path.relative(ROOT, destPath));

  const img = sharp(srcPath);
  const metadata = await img.metadata();

  // Thumbnails can be smaller/stronger compression
  const isThumb = isThumbnailPath(relFromSrc);
  const MAX_WIDTH = isThumb ? 600 : 1600;
  const quality = isThumb ? 70 : 80;

  let pipeline = img;
  if (metadata.width && metadata.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  await pipeline
    .webp({
      quality,
      effort: 4,
    })
    .toFile(destPath);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(full)) {
        console.log('SKIP DIR:', path.relative(ROOT, full));
        continue;
      }
      await walk(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTS.has(ext)) continue;
      await convertImage(full);
    }
  }
}

async function main() {
  console.log('Root   :', ROOT);
  console.log('Source :', SRC_DIR);
  console.log('Dest   :', DEST_DIR);
  await walk(SRC_DIR);
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

