import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import 'server-only';

import type { Site } from '../../../domain';
import {
  parseSitesFromGeoJson,
  type RawFeatureCollection,
} from '../../outbound/geojson-site-repository';

const GEOJSON_PATH = ['public', 'data', 'ndwt.geojson'] as const;

/**
 * Build-time site loader for App Router server components. Reads the
 * GeoJSON straight off disk via fs/promises (so it's pre-rendered
 * into the static page bundle, no runtime fetch) and runs it through
 * the same parser the client uses for the fetch path. JSON.parse
 * errors are wrapped so a corrupted file fails the build with a
 * useful path.
 */
export async function loadSites(): Promise<readonly Site[]> {
  const path = join(process.cwd(), ...GEOJSON_PATH);
  const text = await readFile(path, 'utf-8');
  let body: RawFeatureCollection;
  try {
    body = JSON.parse(text) as RawFeatureCollection;
  } catch (cause) {
    throw new Error(`Failed to parse GeoJSON at ${path}`, { cause });
  }
  return parseSitesFromGeoJson(body);
}
