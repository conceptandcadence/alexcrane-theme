import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const reportsDir = path.join(root, 'reports');
const configPath = path.join(root, 'config', 'image-sizes.config.json');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function fetchSitemap(sitemapUrl) {
  try {
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Failed to fetch sitemap: ${error.message}`);
    throw error;
  }
}

function parseSitemap(xml) {
  // Simple XML parsing for sitemap URLs
  const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g);
  if (!urlMatches) {
    return [];
  }

  return urlMatches
    .map((match) => match.replace(/<\/?loc>/g, ''))
    .filter((url) => url.trim().length > 0)
    .filter((url) => {
      // Filter out non-page URLs (images, PDFs, etc.)
      const lower = url.toLowerCase();
      return (
        !lower.includes('.xml') &&
        !lower.includes('.pdf') &&
        !lower.includes('.jpg') &&
        !lower.includes('.png') &&
        !lower.includes('.gif') &&
        !lower.includes('.svg')
      );
    });
}

async function run() {
  ensureDir(reportsDir);

  const cfg = readJSON(configPath);
  const { sitemapUrl, maxPages = 50, baseUrl } = cfg;

  if (!sitemapUrl) {
    console.log('No sitemapUrl configured in config/image-sizes.config.json');
    return;
  }

  console.log(`Fetching sitemap from: ${sitemapUrl}`);

  try {
    const xml = await fetchSitemap(sitemapUrl);
    const urls = parseSitemap(xml);

    console.log(`Found ${urls.length} URLs in sitemap`);

    // Filter to same domain if baseUrl is set
    let filteredUrls = urls;
    if (baseUrl) {
      const baseDomain = new URL(baseUrl).hostname;
      filteredUrls = urls.filter((url) => {
        try {
          const urlDomain = new URL(url).hostname;
          return urlDomain === baseDomain;
        } catch {
          return false;
        }
      });
      console.log(
        `Filtered to ${filteredUrls.length} URLs matching domain ${baseDomain}`,
      );
    }

    // Limit to maxPages
    const limitedUrls = filteredUrls.slice(0, maxPages);
    console.log(
      `Limited to ${limitedUrls.length} URLs (maxPages: ${maxPages})`,
    );

    // Write to file for the audit script to pick up
    const outputPath = path.join(reportsDir, 'urls-from-sitemap.txt');
    fs.writeFileSync(outputPath, limitedUrls.join('\n'), 'utf8');

    console.log(`URLs written to: ${outputPath}`);
    console.log("Run 'npm run image-sizes:audit' to start the audit");
  } catch (error) {
    console.error(`Error processing sitemap: ${error.message}`);
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
