import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import 'server-only';

import type { Site } from '../../../domain';
import {
  type EnrichedSiteIndex,
  parseSitesFromGeoJson,
  type RawFeatureCollection,
} from '../../outbound/geojson-site-repository';

const GEOJSON_PATH = ['public', 'data', 'ndwt.geojson'] as const;
const ENRICHED_PATH = ['public', 'data', 'ndwt-enriched.json'] as const;

const readEnriched = async (path: string): Promise<EnrichedSiteIndex> => {
  try {
    const text = await readFile(path, 'utf-8');
    return JSON.parse(text) as EnrichedSiteIndex;
  } catch (cause) {
    if (
      typeof cause === 'object' &&
      cause !== null &&
      'code' in cause &&
      (cause as { code?: string }).code === 'ENOENT'
    ) {
      console.warn(
        `[load-sites] No enriched data at ${path}; site names will fall back to "RiverName River — Mile NN".`
      );
      return {};
    }
    throw new Error(`Failed to parse enriched site data at ${path}`, {
      cause,
    });
  }
};

/**
 * Build-time site loader for App Router server components. Reads the
 * GeoJSON straight off disk via fs/promises (so it's pre-rendered
 * into the static page bundle, no runtime fetch) and merges in the
 * scraped name / state / county / camping fee / notes data from
 * `public/data/ndwt-enriched.json`. JSON.parse errors are wrapped
 * so a corrupted file fails the build with a useful path.
 */
export async function loadSites(): Promise<readonly Site[]> {
  const geojsonPath = join(process.cwd(), ...GEOJSON_PATH);
  const enrichedPath = join(process.cwd(), ...ENRICHED_PATH);
  const [text, enriched] = await Promise.all([
    readFile(geojsonPath, 'utf-8'),
    readEnriched(enrichedPath),
  ]);
  let body: RawFeatureCollection;
  try {
    body = JSON.parse(text) as RawFeatureCollection;
  } catch (cause) {
    throw new Error(`Failed to parse GeoJSON at ${geojsonPath}`, { cause });
  }
  return parseSitesFromGeoJson(body, enriched);
}
