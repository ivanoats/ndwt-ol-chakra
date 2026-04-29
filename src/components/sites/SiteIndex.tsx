'use client';

import { useMemo, useState } from 'react';
import { css } from 'styled-system/css';

import {
  collectRivers,
  FACILITIES,
  type Facility,
  filterSites,
  type Site,
  type SiteFilter,
  type SiteSortMode,
  sortSites,
} from '../../domain';
import FacilityBadges from '../panels/FacilityBadges';
import { Box } from '../ui/box';
import { Heading } from '../ui/heading';
import { Link } from '../ui/link';
import { Stack } from '../ui/stack';
import { Text } from '../ui/text';

const FACILITY_LABELS: Record<Facility, string> = {
  restrooms: 'Restrooms',
  potableWater: 'Potable water',
  marineDumpStation: 'Marine dump station',
  dayUseOnly: 'Day use only',
  picnicShelters: 'Picnic shelters',
  boatRamp: 'Boat ramp',
  handCarried: 'Hand-carried launch',
  marina: 'Marina',
  adaAccess: 'ADA access',
};

interface SiteIndexProps {
  readonly sites: readonly Site[];
}

const formatRowSubtitle = (site: Site): string =>
  [
    `${site.riverName} River · Mile ${site.riverMile}`,
    site.riverSegment,
    site.bank,
  ]
    .filter((part): part is string => part !== undefined && part !== '')
    .join(' · ');

const controlsStyle = css({
  display: 'grid',
  gap: '4',
  gridTemplateColumns: { base: '1fr', md: '1fr 1fr auto' },
  alignItems: 'end',
  marginBottom: '4',
});

const controlLabelStyle = css({
  display: 'block',
  fontSize: 'sm',
  color: 'fg.muted',
  marginBottom: '1',
  textTransform: 'uppercase',
  letterSpacing: 'wider',
});

const inputStyle = css({
  width: '100%',
  paddingX: '3',
  paddingY: '2',
  fontSize: 'md',
  borderRadius: 'md',
  borderWidth: '1px',
  borderColor: 'gray.7',
  backgroundColor: 'bg.default',
  color: 'fg.default',
  _focus: {
    outline: 'none',
    borderColor: 'colorPalette.9',
    colorPalette: 'green',
  },
});

const facilityToggleListStyle = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexWrap: 'wrap',
  gap: '2',
  marginBottom: '6',
});

const facilityToggleStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '1',
  paddingX: '3',
  paddingY: '1',
  fontSize: 'sm',
  borderRadius: 'full',
  borderWidth: '1px',
  borderColor: 'gray.7',
  backgroundColor: 'bg.default',
  color: 'fg.default',
  cursor: 'pointer',
  _hover: { backgroundColor: 'gray.3' },
  '&[aria-pressed="true"]': {
    backgroundColor: 'colorPalette.9',
    borderColor: 'colorPalette.9',
    color: 'colorPalette.contrast',
    colorPalette: 'green',
  },
});

const resultsListStyle = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '2',
});

const resultRowStyle = css({
  display: 'block',
  paddingX: '4',
  paddingY: '3',
  borderRadius: 'md',
  borderWidth: '1px',
  borderColor: 'gray.6',
  backgroundColor: 'bg.default',
  color: 'fg.default',
  textDecoration: 'none',
  _hover: {
    borderColor: 'colorPalette.9',
    colorPalette: 'green',
  },
});

const resultCountStyle = css({
  fontSize: 'sm',
  color: 'fg.muted',
  marginBottom: '3',
});

export default function SiteIndex({ sites }: SiteIndexProps) {
  const [query, setQuery] = useState('');
  const [river, setRiver] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<ReadonlySet<Facility>>(
    new Set<Facility>()
  );
  const [sortMode, setSortMode] = useState<SiteSortMode>('river-mile');

  const rivers = useMemo(() => collectRivers(sites), [sites]);

  const filter: SiteFilter = { query, river, facilities };
  const visible = useMemo(
    () => sortSites(filterSites(sites, filter), sortMode),
    // filter is rebuilt every render but its parts are stable refs
    // so depending on each piece individually keeps the memo honest.
    [sites, query, river, facilities, sortMode]
  );

  const toggleFacility = (facility: Facility) => {
    setFacilities((prev) => {
      const next = new Set(prev);
      if (next.has(facility)) next.delete(facility);
      else next.add(facility);
      return next;
    });
  };

  return (
    <Stack gap="4">
      <Heading as="h1" size="2xl">
        Sites
      </Heading>
      <Text as="p" css={{ color: 'fg.muted' }}>
        {sites.length} access sites along the Northwest Discovery Water Trail.
        Filter by name, river, or facilities.
      </Text>

      <Box className={controlsStyle}>
        <label>
          <span className={controlLabelStyle}>Name</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Blalock"
            className={inputStyle}
            data-testid="site-index-query"
          />
        </label>
        <label>
          <span className={controlLabelStyle}>River</span>
          <select
            value={river ?? ''}
            onChange={(event) =>
              setRiver(event.target.value === '' ? null : event.target.value)
            }
            className={inputStyle}
            data-testid="site-index-river"
          >
            <option value="">All rivers</option>
            {rivers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={controlLabelStyle}>Sort</span>
          <select
            value={sortMode}
            onChange={(event) =>
              setSortMode(event.target.value as SiteSortMode)
            }
            className={inputStyle}
            data-testid="site-index-sort"
          >
            <option value="river-mile">By river + mile</option>
            <option value="alpha">A → Z</option>
          </select>
        </label>
      </Box>

      <fieldset
        className={css({ border: 'none', padding: 0, margin: 0 })}
        aria-label="Filter by facility"
      >
        <ul className={facilityToggleListStyle}>
          {FACILITIES.map((facility) => {
            const pressed = facilities.has(facility);
            return (
              <li key={facility}>
                <button
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => toggleFacility(facility)}
                  className={facilityToggleStyle}
                  data-testid={`site-index-facility-${facility}`}
                >
                  {FACILITY_LABELS[facility]}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <p
        className={resultCountStyle}
        aria-live="polite"
        data-testid="site-index-count"
      >
        {visible.length} of {sites.length} sites
      </p>

      <ol
        className={resultsListStyle}
        aria-label="Filtered sites"
        data-testid="site-index-results"
      >
        {visible.map((site) => (
          <li key={site.id}>
            <Link
              href={`/sites/${site.slug}`}
              className={resultRowStyle}
              data-testid={`site-index-row-${site.slug}`}
            >
              <Text
                as="span"
                css={{ fontWeight: 'semibold', display: 'block' }}
              >
                {site.name}
              </Text>
              <Text
                as="span"
                css={{
                  fontSize: 'sm',
                  color: 'fg.muted',
                  display: 'block',
                  marginTop: '1',
                }}
              >
                {formatRowSubtitle(site)}
              </Text>
              {site.facilities.length === 0 ? null : (
                <Box css={{ marginTop: '2' }}>
                  <FacilityBadges facilities={site.facilities} />
                </Box>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </Stack>
  );
}
