import type { Metadata } from 'next';
import { css } from 'styled-system/css';

import { Link } from '@/components/ui/link';

export const metadata: Metadata = {
  title: 'Trip Planning — Northwest Discovery Water Trail',
  description:
    'Plan a trip on the Northwest Discovery Water Trail using the ' +
    'interactive map, site facilities, and downloadable GPX waypoints.',
};

const pageStyle = css({
  maxWidth: '3xl',
  marginX: 'auto',
  paddingX: { base: '4', md: '6' },
  paddingY: { base: '6', md: '10' },
  fontSize: { base: 'md', md: 'lg' },
  lineHeight: 'relaxed',
  color: 'fg.default',
});

const headingStyle = css({
  fontSize: { base: '2xl', md: '3xl' },
  fontWeight: 'bold',
  margin: 0,
  marginBottom: '4',
  colorPalette: 'green',
  color: 'colorPalette.11',
});

const subheadingStyle = css({
  fontSize: { base: 'lg', md: 'xl' },
  fontWeight: 'semibold',
  marginTop: '8',
  marginBottom: '3',
});

const paragraphStyle = css({ marginY: '3' });

const listStyle = css({
  marginY: '3',
  paddingLeft: '6',
  '& li': { marginY: '2' },
});

export default function TripPlanningPage() {
  return (
    <article className={pageStyle}>
      <h1 className={headingStyle}>Trip Planning</h1>
      <p className={paragraphStyle}>
        The interactive <Link href="/">map</Link> is the starting point for
        planning a trip on the Water Trail. Each green marker is a launch site,
        campground, or day-use area along the route.
      </p>

      <h2 className={subheadingStyle}>Using the map</h2>
      <ul className={listStyle}>
        <li>
          Pan and zoom to the section of river you&rsquo;re planning around.
        </li>
        <li>
          Hover a marker — the cursor switches to a pointer when you&rsquo;re
          over a clickable site.
        </li>
        <li>
          Click a marker to open the site panel with river segment, mile, bank,
          available facilities, season, contact information, and coordinates.
        </li>
        <li>
          Hit <strong>Download GPX waypoint</strong> to save the site as a GPX
          file you can import into Garmin BaseCamp, Gaia GPS, OsmAnd, or any
          other GPS planner.
        </li>
        <li>
          Press <kbd>Esc</kbd> or click the X to dismiss the panel; the map
          stays interactive while the panel is open, so you can pop between
          sites quickly.
        </li>
      </ul>

      <h2 className={subheadingStyle}>What to bring</h2>
      <p className={paragraphStyle}>
        Permits, life jackets, and current river conditions are on you; the
        Water Trail crosses tribal, state, and federal jurisdictions with their
        own rules. Always check ahead before launching.
      </p>

      <p className={paragraphStyle}>
        More planning tools (multi-day itineraries, downloadable route files,
        river-mile filtering) are on the roadmap. If you have a feature request,
        open an issue on{' '}
        <Link href="https://github.com/ivanoats/ndwt-ol-chakra" external>
          GitHub
        </Link>
        .
      </p>
    </article>
  );
}
