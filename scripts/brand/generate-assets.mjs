// 由 scripts/brand/source/yiye.png 生成站点用到的全部图标与品牌标记。
// 这台机器上没有 ImageMagick / potrace，所以这里只用 node 内置的 zlib 自己解码、合成、编码。
// 换 logo 或调底板颜色后重跑：pnpm brand:assets
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = join(ROOT, "scripts/brand/source/yiye.png");

/** 图标底板：一道 135° 的深青渐变，白叶压在上面才有足够对比 */
const PLATE_TOP = [0x3d, 0x9b, 0x86];
const PLATE_BOTTOM = [0x16, 0x53, 0x4b];

/**
 * 站点图标一律满幅不透明，不做圆角。
 *
 * 做过圆角的一版在浏览器标签页、书签和桌面上，圆角后面是一圈黑 —— 透明像素在
 * 那些位置没有被合成到页面底色上。留白交给浏览器与系统自己加圆角，
 * 这也是各家应用图标的通行做法（iOS 会自己套 mask）。
 */
const PLATE_RADIUS_RATIO = 0;

/** 叶子在底板里占的边长比例，留出呼吸空间 */
const LEAF_RATIO_TILE = 0.62;
const LEAF_RATIO_APPLE = 0.66;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  // 每行前面加一个 filter 字节；用 filter 0（不过滤），图片小，不值得为几 KB 增加解码复杂度
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour + alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function decodePng(buffer) {
  if (buffer.readUInt32BE(0) !== 0x89504e47) throw new Error("不是 PNG");
  let cursor = 8;
  let ihdr = null;
  const idat = [];
  while (cursor < buffer.length) {
    const length = buffer.readUInt32BE(cursor);
    const type = buffer.toString("latin1", cursor + 4, cursor + 8);
    if (type === "IHDR") ihdr = buffer.subarray(cursor + 8, cursor + 8 + length);
    else if (type === "IDAT") idat.push(buffer.subarray(cursor + 8, cursor + 8 + length));
    else if (type === "IEND") break;
    cursor += 12 + length;
  }

  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const [depth, colorType, , , interlace] = [ihdr[8], ihdr[9], ihdr[10], ihdr[11], ihdr[12]];
  if (depth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(
      `只处理 8bit RGBA 非隔行 PNG，当前 depth=${depth} colorType=${colorType} interlace=${interlace}`,
    );
  }

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const data = new Uint8Array(stride * height);
  let prev = new Uint8Array(stride);
  let cursor2 = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor2];
    cursor2 += 1;
    const line = new Uint8Array(stride);
    line.set(raw.subarray(cursor2, cursor2 + stride));
    cursor2 += stride;

    if (filter === 1) {
      for (let x = bpp; x < stride; x += 1) line[x] = (line[x] + line[x - bpp]) & 255;
    } else if (filter === 2) {
      for (let x = 0; x < stride; x += 1) line[x] = (line[x] + prev[x]) & 255;
    } else if (filter === 3) {
      for (let x = 0; x < stride; x += 1) {
        const a = x >= bpp ? line[x - bpp] : 0;
        line[x] = (line[x] + ((a + prev[x]) >> 1)) & 255;
      }
    } else if (filter === 4) {
      for (let x = 0; x < stride; x += 1) {
        const a = x >= bpp ? line[x - bpp] : 0;
        const b = prev[x];
        const c = x >= bpp ? prev[x - bpp] : 0;
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        line[x] = (line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }

    data.set(line, y * stride);
    prev = line;
  }

  return { width, height, data };
}

const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));

/** 面积平均缩放。按预乘 alpha 平均，否则边缘会泛出黑边。 */
function resizeBox(src, width, height) {
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.floor((y * src.height) / height);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * src.height) / height));
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.floor((x * src.width) / width);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * src.width) / width));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let sy = y0; sy < y1; sy += 1) {
        for (let sx = x0; sx < x1; sx += 1) {
          const o = (sy * src.width + sx) * 4;
          const alpha = src.data[o + 3] / 255;
          r += src.data[o] * alpha;
          g += src.data[o + 1] * alpha;
          b += src.data[o + 2] * alpha;
          a += alpha;
          count += 1;
        }
      }
      const o = (y * width + x) * 4;
      out[o + 3] = clamp((a / count) * 255);
      if (a > 0) {
        out[o] = clamp(r / a);
        out[o + 1] = clamp(g / a);
        out[o + 2] = clamp(b / a);
      }
    }
  }
  return { width, height, data: out };
}
function insideRounded(px, py, size, radius) {
  const cx = Math.min(Math.max(px, radius), size - radius);
  const cy = Math.min(Math.max(py, radius), size - radius);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/** 圆角底板 + 135° 对角渐变 */
function plate(size, radiusRatio) {
  const radius = size * radiusRatio;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (radiusRatio > 0 && !insideRounded(x + 0.5, y + 0.5, size, radius)) continue;
      const t = (x + y) / (2 * size - 2);
      const o = (y * size + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        data[o + c] = clamp(PLATE_TOP[c] + (PLATE_BOTTOM[c] - PLATE_TOP[c]) * t);
      }
      data[o + 3] = 255;
    }
  }
  return { width: size, height: size, data };
}

function over(base, top) {
  const out = new Uint8Array(base.data.length);
  for (let i = 0; i < base.data.length; i += 4) {
    const alpha = top.data[i + 3] / 255;
    for (let c = 0; c < 3; c += 1) {
      out[i + c] = clamp(top.data[i + c] * alpha + base.data[i + c] * (1 - alpha));
    }
    out[i + 3] = 255;
  }
  return { width: base.width, height: base.height, data: out };
}

/** 叶子的不透明包围盒，用来把叶形摆到视觉中心 */
function opaqueBounds(image) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] < 8) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/**
 * 底板图标：以 4 倍超采样绘制再缩下来，圆角与叶缘的锯齿就交给面积平均处理。
 * 叶子只取轮廓染白——16px 的标签页上，带内部渐变的叶子会糊成一团。
 */
function tileIcon(size, { radiusRatio, leafRatio, opaque }) {
  const scale = 4;
  const big = size * scale;
  const base = plate(big, opaque ? 0 : radiusRatio);
  const bounds = opaqueBounds(source);
  const leafSide = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const factor = (leafRatio * big) / leafSide;
  const leaf = new Uint8Array(big * big * 4);

  for (let y = 0; y < big; y += 1) {
    for (let x = 0; x < big; x += 1) {
      const sx = Math.round((x - big / 2) / factor + bounds.cx);
      const sy = Math.round((y - big / 2) / factor + bounds.cy);
      if (sx < 0 || sy < 0 || sx >= source.width || sy >= source.height) continue;
      const so = (sy * source.width + sx) * 4;
      const o = (y * big + x) * 4;
      leaf[o] = 255;
      leaf[o + 1] = 255;
      leaf[o + 2] = 255;
      leaf[o + 3] = source.data[so + 3];
    }
  }

  const composed = over(base, { width: big, height: big, data: leaf });
  return resizeBox(composed, size, size);
}

function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry[0] = image.size >= 256 ? 0 : image.size;
    entry[1] = image.size >= 256 ? 0 : image.size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += image.png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

function write(path, buffer) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buffer);
  console.log(`${path.replace(`${ROOT}/`, "")}  ${(buffer.length / 1024).toFixed(1)} KB`);
}

const source = decodePng(readFileSync(SOURCE));
const bounds = opaqueBounds(source);
console.log(
  `源图 ${source.width}×${source.height}，叶形包围盒 ${bounds.maxX - bounds.minX}×${bounds.maxY - bounds.minY}\n`,
);

for (const size of [64, 128, 256]) {
  write(
    join(ROOT, `public/brand/leaf-${size}.png`),
    encodePng(size, size, resizeBox(source, size, size).data),
  );
}

write(
  join(ROOT, "src/app/icon.png"),
  encodePng(
    256,
    256,
    tileIcon(256, { radiusRatio: PLATE_RADIUS_RATIO, leafRatio: LEAF_RATIO_TILE, opaque: false })
      .data,
  ),
);

write(
  join(ROOT, "src/app/apple-icon.png"),
  encodePng(
    180,
    180,
    tileIcon(180, { radiusRatio: 0, leafRatio: LEAF_RATIO_APPLE, opaque: true }).data,
  ),
);

write(
  join(ROOT, "src/app/favicon.ico"),
  ico(
    [16, 32, 48].map((size) => ({
      size,
      png: encodePng(
        size,
        size,
        tileIcon(size, {
          radiusRatio: PLATE_RADIUS_RATIO,
          leafRatio: LEAF_RATIO_TILE,
          opaque: false,
        }).data,
      ),
    })),
  ),
);

// 分享卡片有文字排版，纯 Node 画不了，交给无头 Chrome 截图。没装 Chrome 就跳过并提醒。
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (existsSync(CHROME)) {
  const output = join(ROOT, "src/app/opengraph-image.png");
  const result = spawnSync(
    CHROME,
    [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=1200,630",
      `--screenshot=${output}`,
      `file://${join(ROOT, "scripts/brand/opengraph.html")}`,
    ],
    { stdio: "ignore" },
  );
  if (result.status === 0)
    console.log(`src/app/opengraph-image.png  ${(statSync(output).size / 1024).toFixed(1)} KB`);
  else console.warn("opengraph-image.png 渲染失败，跳过");
} else {
  console.warn("没找到 Chrome，跳过 src/app/opengraph-image.png");
}
