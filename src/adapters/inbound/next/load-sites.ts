import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import 'server-only';

import type { Site } from '../../../domain';
import {
  parseSitesFromGeoJson,
  type RawFeatureCollection,
} from '../../outbound/geojson-site-repository';

/**
 * Build-time site loader for App Router server components. Reads the
 * GeoJSON straight off disk via fs/promises (so it's pre-rendered
 * into the static page bundle, no runtime fetch) and runs it through
 * the same parser the client uses for the fetch path.
 */
export async function loadSites(): Promise<readonly Site[]> {
  const path = join(process.cwd(), 'public', 'data', 'ndwt.geojson');
  const text = await readFile(path, 'utf-8');
  const body = JSON.parse(text) as RawFeatureCollection;
  return parseSitesFromGeoJson(body);
}
