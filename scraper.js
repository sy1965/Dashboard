import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getDeveloperApps(browser, developerId) {
  const page = await browser.newPage();
  const url = `https://play.google.com/store/apps/developer?id=${developerId}`;
  console.log(`Discovering apps for developer: ${developerId}...`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Scroll to bottom to ensure all apps are loaded
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 100;
        let timer = setInterval(() => {
          let scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    const apps = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a.Si6A0c.Gy4nib'));
      return links.map(link => {
        const href = link.getAttribute('href');
        const idMatch = href.match(/id=([^&]+)/);
        return idMatch ? idMatch[1] : null;
      }).filter(id => id !== null);
    });

    await page.close();
    return [...new Set(apps)]; // Return unique package IDs
  } catch (error) {
    console.error(`Error discovering apps:`, error.message);
    await page.close();
    return [];
  }
}

async function scrapeApp(browser, appId) {
  const page = await browser.newPage();
  const url = `https://play.google.com/store/apps/details?id=${appId}`;

  try {
    // Increased timeout and improved wait condition
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('h1 span', { timeout: 10000 }).catch(() => { });

    const data = await page.evaluate((id) => {
      const name = document.querySelector('h1 span')?.innerText || 'Unknown';
      const ratingLabel = document.querySelector('div[aria-label*="stars"]')?.getAttribute('aria-label');
      const ratingMatch = ratingLabel ? ratingLabel.match(/Rated ([\d.]+)/) : null;
      const rating = ratingMatch ? ratingMatch[1] : 'N/A';
      const downloads = document.querySelector('div.ClM7O')?.innerText || 'N/A';
      const iconUrl = document.querySelector('img[alt="Icon image"]')?.src || '';

      return {
        id,
        name,
        rating,
        downloads,
        iconUrl,
        url: `https://play.google.com/store/apps/details?id=${id}`
      };
    }, appId);

    await page.close();
    return data;
  } catch (error) {
    console.error(`Error scraping ${appId}:`, error.message);
    await page.close();
    return { id: appId, error: error.message };
  }
}

async function main() {
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }
  const statsFile = path.join(publicDir, 'stats.json');
  const developerId = 'Reydium';

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const appIds = await getDeveloperApps(browser, developerId);
  console.log(`Found ${appIds.length} apps for ${developerId}.`);

  const results = [];
  for (const appId of appIds) {
    console.log(`Scraping ${appId}...`);
    const result = await scrapeApp(browser, appId);
    results.push(result);
  }

  fs.writeFileSync(statsFile, JSON.stringify(results, null, 2));
  // Also write to root for reference/backup
  fs.writeFileSync(path.join(__dirname, 'stats.json'), JSON.stringify(results, null, 2));

  console.log(`Successfully scraped ${results.length} apps. Results saved to public/stats.json and stats.json`);

  await browser.close();
}

main().catch(console.error);
