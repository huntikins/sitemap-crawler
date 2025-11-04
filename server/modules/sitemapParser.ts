import { parseString } from 'xml2js';

import { logger } from '../logger.js';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    logger.info(`Fetching sitemap from: ${sitemapUrl}`);
    const response = await fetch(sitemapUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
    }

    const xml = await response.text();
    const urls: string[] = [];

    // Check if it's a sitemap index
    if (xml.includes('<sitemapindex')) {
      logger.info('Detected sitemap index, parsing nested sitemaps');
      const result = await new Promise<{
        sitemapindex?: { sitemap?: { loc?: string[] }[] };
      }>((resolve, reject) => {
        parseString(xml, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data as { sitemapindex?: { sitemap?: { loc?: string[] }[] } });
          }
        });
      });

      const sitemaps = result.sitemapindex?.sitemap ?? [];
      for (const sitemap of sitemaps) {
        const nestedUrl = sitemap.loc?.[0];
        if (nestedUrl) {
          const nestedUrls = await parseSitemap(nestedUrl);
          urls.push(...nestedUrls);
        }
      }
    } else {
      // Regular sitemap
      const result = await new Promise<{
        urlset?: { url?: { loc?: string[] }[] };
      }>((resolve, reject) => {
        parseString(xml, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data as { urlset?: { url?: { loc?: string[] }[] } });
          }
        });
      });

      const urlset = result.urlset?.url ?? [];
      for (const urlItem of urlset) {
        const loc = urlItem.loc?.[0];
        if (loc) {
          urls.push(loc);
        }
      }
    }

    logger.info(`Parsed ${urls.length} URLs from sitemap`);
    return urls;
  } catch (error) {
    logger.error('Error parsing sitemap', error);
    throw error;
  }
}
