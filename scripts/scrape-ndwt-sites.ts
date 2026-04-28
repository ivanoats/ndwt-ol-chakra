/**
 * One-shot scraper that walks every ndwt.org site detail page and
 * captures fields the GeoJSON dataset is missing: site name, state,
 * county, camping fee, notes.
 *
 * Run with:
 *   npm run scrape:sites
 *
 * Re-run manually if ndwt.org changes. The output JSON is committed
 * to the repo and merged into the build at load time. See
 * docs/plans/feature-parity.md § Phase 8.
 *
 * Permission to reuse ndwt.org content was granted by the
 * Washington Water Trails Association Executive Director — see
 * NOTICE.md at the repo root.
 */

import { JSDOM, VirtualConsole } from 'jsdom';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const silentConsole = new VirtualConsole();
silentConsole.on('error', () => {
  /* drop CSS @import warnings */
});

const REPO_ROOT = process.cwd();
const GEOJSON_PATH = join(REPO_ROOT, 'public', 'data', 'ndwt.geojson');
const OUTPUT_PATH = join(REPO_ROOT, 'public', 'data', 'ndwt-enriched.json');

const REQUEST_DELAY_MS = 250;
const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT =
  'ndwt-ol-chakra phase-8 scraper (one-shot data enrichment; ' +
  'authorized by WWTA - github.com/ivanoats/ndwt-ol-chakra)';

interface RawFeature {
  readonly properties: Record<string, string | undefined>;
}
interface RawFeatureCollection {
  readonly features: readonly RawFeature[];
}

export interface EnrichedSite {
  readonly name: string;
  readonly state?: string;
  readonly county?: string;
  readonly campingFee?: string;
  readonly notes?: string;
  readonly sourceUrl: string;
}

const ID_KEYS = ['web-scraper-order', '﻿web-scraper-order'] as const;

const readId = (props: RawFeature['properties']): string | null => {
  for (const key of ID_KEYS) {
    const v = props[key];
    if (v !== undefined && v !== '') return v;
  }
  return null;
};

const collapseWhitespace = (s: string): string => s.replace(/\s+/g, ' ').trim();

const labelOf = (em: Element): string =>
  collapseWhitespace(em.textContent ?? '').replace(/\s*$/, '');

/**
 * The ndwt.org template renders every labeled field as
 * `<td><em>Label</em></td><td><div align="right">value</div></td>`.
 * We collect every such label/value pair into a map.
 */
const extractLabeledFields = (doc: Document): Map<string, string> => {
  const out = new Map<string, string>();
  for (const em of doc.querySelectorAll('em')) {
    const label = labelOf(em);
    if (label === '') continue;
    const cell = em.closest('td');
    const valueCell = cell?.nextElementSibling;
    if (valueCell === undefined || valueCell === null) continue;
    const value = collapseWhitespace(valueCell.textContent ?? '');
    if (value !== '') out.set(label, value);
  }
  return out;
};

/**
 * Notes live in their own table whose header cell contains
 * "Notes" inside `<span class="style1">`. The free-text body sits
 * in the second `<td>` of the next `<tr>`.
 */
const extractNotes = (doc: Document): string | undefined => {
  for (const span of doc.querySelectorAll('span.style1')) {
    if (collapseWhitespace(span.textContent ?? '') !== 'Notes') continue;
    const headerRow = span.closest('tr');
    const bodyRow = headerRow?.nextElementSibling;
    if (bodyRow === undefined || bodyRow === null) continue;
    const cells = bodyRow.querySelectorAll('td');
    const last = cells[cells.length - 1];
    if (last === undefined) continue;
    const text = collapseWhitespace(last.textContent ?? '');
    if (text !== '' && text !== ' ') return text;
    return undefined;
  }
  return undefined;
};

const parseSitePage = (html: string, sourceUrl: string): EnrichedSite => {
  const dom = new JSDOM(html, { virtualConsole: silentConsole });
  const doc = dom.window.document;
  const h1 = doc.querySelector('h1');
  const name = collapseWhitespace(h1?.textContent ?? '');
  if (name === '') {
    throw new Error(`No <h1> site name in ${sourceUrl}`);
  }
  const labels = extractLabeledFields(doc);
  const notes = extractNotes(doc);

  const out: { -readonly [K in keyof EnrichedSite]?: EnrichedSite[K] } = {
    name,
    sourceUrl,
  };
  const state = labels.get('State');
  if (state !== undefined) out.state = state;
  const county = labels.get('County');
  if (county !== undefined) out.county = county;
  const fee = labels.get('Camping Fee');
  if (fee !== undefined) out.campingFee = fee;
  if (notes !== undefined) out.notes = notes;
  return out as EnrichedSite;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const fetchHtml = async (url: string): Promise<string> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
};

const main = async (): Promise<void> => {
  const text = await readFile(GEOJSON_PATH, 'utf-8');
  const body = JSON.parse(text) as RawFeatureCollection;

  const enriched: Record<string, EnrichedSite> = {};
  let attempted = 0;
  let succeeded = 0;
  const failures: Array<{ id: string; url: string; error: string }> = [];

  for (const feature of body.features) {
    const id = readId(feature.properties);
    const url = feature.properties['web-scraper-start-url'];
    if (id === null || url === undefined || url === '') {
      console.warn(
        `Skipping feature without id or url: ${JSON.stringify(feature.properties).slice(0, 80)}`
      );
      continue;
    }
    attempted++;
    try {
      const html = await fetchHtml(url);
      enriched[id] = parseSitePage(html, url);
      succeeded++;
      process.stdout.write(
        `\r[${succeeded}/${body.features.length}] ${enriched[id].name.padEnd(40).slice(0, 40)}`
      );
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : String(cause);
      failures.push({ id, url, error });
      console.warn(`\nFailed ${id} (${url}): ${error}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  process.stdout.write('\n');
  await writeFile(OUTPUT_PATH, JSON.stringify(enriched, null, 2) + '\n');
  console.log(
    `Wrote ${OUTPUT_PATH}: ${succeeded}/${attempted} sites enriched.`
  );
  if (failures.length > 0) {
    console.log(`${failures.length} failures:`);
    for (const f of failures) console.log(`  ${f.id}\t${f.url}\t${f.error}`);
    process.exit(1);
  }
};

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
