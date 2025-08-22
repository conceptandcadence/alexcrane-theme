import fs from 'fs';
import path from 'path';
import url from 'url';
import { stringify } from 'csv-stringify';
import pLimit from 'p-limit';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const reportsDir = path.join(root, 'reports');
const configPath = path.join(root, 'config', 'image-sizes.config.json');

const CI = process.argv.includes('--ci');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function logToFile(lines) {
  fs.writeFileSync(path.join(reportsDir, 'log.txt'), lines.join('\n'), 'utf8');
}

function sizesString(entries) {
  // entries: [{ minWidth: number, px: number }], asc by minWidth
  return entries
    .map(({ minWidth, px: val }, i, arr) => {
      const v = `${Math.round(val)}px`;
      return minWidth === 0 ? v : `(min-width: ${minWidth}px) ${v}`;
    })
    .reverse()
    .join(', ');
}

function csvWrite(rows, outPath) {
  return new Promise((resolve, reject) => {
    stringify(rows, { header: true }, (err, data) => {
      if (err) reject(err);
      else {
        fs.writeFileSync(outPath, data, 'utf8');
        resolve();
      }
    });
  });
}

// Fingerprint an image into a "component selector"
function selectorFingerprint(img, document) {
  const cls = (img.className || '').toString().trim().replace(/\s+/g, '.');
  const parent =
    img.closest('[data-section-id]') ||
    img.closest('[id]') ||
    img.closest('[class]') ||
    document.body;

  const parentKey = parent.id
    ? `#${parent.id}`
    : parent.className
    ? '.' + parent.className.toString().trim().replace(/\s+/g, '.')
    : parent.tagName?.toLowerCase() || 'body';

  return `${parentKey} > img${cls ? '.' + cls : ''}`;
}

// Page-eval helper: collect visible <img[srcset]> widths
async function collectOnPage(page, { minWidthBucket }) {
  return page.evaluate(
    ({ minWidthBucket }) => {
      const bpBucket = minWidthBucket;

      const isVisible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none'
        );
      };

      const selectorFingerprint = (img) => {
        const cls = (img.className || '')
          .toString()
          .trim()
          .replace(/\s+/g, '.');
        const parent =
          img.closest('[data-section-id]') ||
          img.closest('[id]') ||
          img.closest('[class]') ||
          document.body;

        const parentKey = parent.id
          ? `#${parent.id}`
          : parent.className
          ? '.' + parent.className.toString().trim().replace(/\s+/g, '.')
          : parent.tagName?.toLowerCase() || 'body';

        return `${parentKey} > img${cls ? '.' + cls : ''}`;
      };

      const results = [];
      document.querySelectorAll('img[srcset]').forEach((img) => {
        if (!isVisible(img)) return;

        // ignore tiny tracking pixels
        const rect = img.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return;

        const key = selectorFingerprint(img);

        // parse srcset to find chosen candidate (rough heuristic by DPR)
        const srcset = img.getAttribute('srcset') || '';
        const candidates = srcset
          .split(',')
          .map((s) => s.trim())
          .map((s) => {
            const m = s.match(/\s+(\d+)w$/);
            return {
              src: s.replace(/\s+\d+w$/, ''),
              w: m ? parseInt(m[1], 10) : null,
            };
          })
          .filter((c) => !!c.w)
          .sort((a, b) => a.w - b.w);

        // Report actual CSS width and candidate list
        results.push({
          key,
          widthCss: Math.round(rect.width),
          candidates,
        });
      });

      return { bpBucket, items: results };
    },
    { minWidthBucket },
  );
}

async function scrollPage(page, steps = 8) {
  const h = await page.evaluate(() => document.body.scrollHeight);
  const step = Math.max(100, Math.round(h / steps));
  for (let y = 0; y <= h; y += step) {
    await page.evaluate((_y) => window.scrollTo(0, _y), y);
    await page.waitForTimeout(200);
  }
}

async function run() {
  ensureDir(reportsDir);
  const cfg = readJSON(configPath);

  const {
    baseUrl,
    urls,
    sitemapUrl,
    breakpoints,
    deviceScaleFactors,
    viewHeights,
    concurrency,
    requestBlocklist,
    maxPages,
    scrollSteps,
    waitUntil,
    timeoutMs,
    overserveTolerance,
    onlySelectors,
    ignoreSelectors,
    userAgent,
  } = cfg;

  const allUrls = new Set(
    (urls || []).map((u) =>
      u.startsWith('http') ? u : `${baseUrl.replace(/\/$/, '')}${u}`,
    ),
  );

  if (sitemapUrl) {
    // Optional: allow dynamic import of a URL list file dropped by sitemap-to-urls
    const listPath = path.join(reportsDir, 'urls-from-sitemap.txt');
    if (fs.existsSync(listPath)) {
      fs.readFileSync(listPath, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, maxPages || 9999)
        .forEach((u) => allUrls.add(u));
    }
  }

  const urlsArray = Array.from(allUrls).slice(0, maxPages || 9999);
  if (urlsArray.length === 0) {
    console.error(
      'No URLs to audit. Populate config.urls or generate from sitemap.',
    );
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const limit = pLimit(concurrency || 2);

  // stats: key -> { byBp: {bp: maxPx}, samples: number }
  const stats = new Map();

  // helper to upsert widths
  function record(key, bp, cssPx) {
    const v = stats.get(key) || { byBp: {}, samples: 0 };
    v.byBp[bp] = Math.max(v.byBp[bp] || 0, cssPx);
    v.samples += 1;
    stats.set(key, v);
  }

  const logs = [];
  logs.push(`Start ${new Date().toISOString()}`);
  logs.push(
    `URLs: ${urlsArray.length}, BPs: ${breakpoints.join(
      ',',
    )}, DSFs: ${deviceScaleFactors.join(',')}`,
  );

  // Crawl each URL at each breakpoint × deviceScaleFactor
  await Promise.all(
    urlsArray.map((href) =>
      limit(async () => {
        const context = await browser.newContext({
          userAgent: userAgent || 'ImageSizesAuditBot/1.0',
        });
        const page = await context.newPage();

        // Set default timeout
        page.setDefaultTimeout(timeoutMs || 45000);

        // Block large/static assets
        await page.route('**/*', (route) => {
          const url = route.request().url().toLowerCase();
          if (
            (requestBlocklist || []).some((pat) =>
              url.includes(pat.toLowerCase().replace('*', '')),
            )
          ) {
            return route.abort();
          }
          return route.continue();
        });

        try {
          for (const bp of breakpoints) {
            for (const dsf of deviceScaleFactors) {
              await page.setViewportSize({
                width: Math.max(360, bp === 0 ? 360 : bp), // ensure sane min width
                height: typeof viewHeights === 'number' ? viewHeights : 1400,
              });

              // Set device scale factor
              await context.addInitScript(`
                Object.defineProperty(window, 'devicePixelRatio', {
                  get() { return ${dsf}; }
                });
              `);

              await page.goto(href, {
                waitUntil: waitUntil || 'domcontentloaded',
              });

              // give lazy loaders time
              await page.waitForTimeout(800);
              await scrollPage(page, scrollSteps || 8);
              await page.waitForTimeout(300);

              const { bpBucket, items } = await collectOnPage(page, {
                minWidthBucket: bp,
              });

              for (const it of items) {
                const key = it.key;
                if ((ignoreSelectors || []).some((sel) => key.includes(sel)))
                  continue;
                if (
                  (onlySelectors || []).length &&
                  !(onlySelectors || []).some((sel) => key.includes(sel))
                )
                  continue;

                record(key, bpBucket, it.widthCss);
              }
            }
          }
          logs.push(`✓ ${href}`);
        } catch (err) {
          logs.push(`✗ ${href} — ${err.message}`);
        } finally {
          await context.close();
        }
      }),
    ),
  );

  await browser.close();

  // Prepare output
  const output = [];
  for (const [key, val] of stats.entries()) {
    const entries = Object.entries(val.byBp)
      .map(([bp, px]) => ({ minWidth: Number(bp), px }))
      .sort((a, b) => a.minWidth - b.minWidth);

    output.push({
      selector: key,
      samples: val.samples,
      widths: Object.fromEntries(entries.map((e) => [e.minWidth, e.px])),
      recommendation: sizesString(entries),
    });
  }
  output.sort((a, b) => a.selector.localeCompare(b.selector));

  // Write JSON
  ensureDir(reportsDir);
  const jsonPath = path.join(reportsDir, 'image-sizes.json');
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), 'utf8');

  // Write CSV
  const csvRows = output.map((row) => {
    return {
      selector: row.selector,
      samples: row.samples,
      recommendation: row.recommendation,
      ...row.widths,
    };
  });
  await csvWrite(csvRows, path.join(reportsDir, 'image-sizes.csv'));

  // Overserve check (optional in CI): compare recommended px to common srcset steps if present.
  let overserveFlags = 0;
  for (const row of output) {
    // If any width at a breakpoint exceeds 2000px we flag (tweak as needed)
    for (const [bp, val] of Object.entries(row.widths)) {
      if (val > 2000) {
        overserveFlags++;
        logs.push(
          `Overserve? ${row.selector} @${bp}px → ${val}px (consider capping srcset)`,
        );
      }
    }
  }

  logs.push(`Done ${new Date().toISOString()}`);
  logToFile(logs);

  // In CI, fail if overserve flags exceed tolerance logic (simple demo)
  if (CI && overserveFlags > 0) {
    console.error(
      `Overserve warnings: ${overserveFlags} (see reports/log.txt)`,
    );
    // Exit non-zero only if you want the pipeline to fail:
    // process.exit(1);
  } else {
    console.log(`Report written to ${jsonPath}`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
