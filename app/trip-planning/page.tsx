import type { Metadata } from 'next';

import ArticleLayout from '@/components/editorial/ArticleLayout';
import { Link } from '@/components/ui/link';

export const metadata: Metadata = {
  title: 'Trip Planning — Northwest Discovery Water Trail',
  description:
    'Plan a trip on the Northwest Discovery Water Trail using the ' +
    'interactive map, site facilities, and downloadable GPX waypoints.',
};

export default function TripPlanningPage() {
  return (
    <ArticleLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Trip Planning' }]}
    >
      <h1>Trip Planning</h1>
      <p>
        The interactive <Link href="/">map</Link> is the starting point for
        planning a trip on the Water Trail. Each green marker is a launch site,
        campground, or day-use area along the route.
      </p>

      <h2>Using the map</h2>
      <ul>
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

      <h2>What to bring</h2>
      <p>
        Permits, life jackets, and current river conditions are on you; the
        Water Trail crosses tribal, state, and federal jurisdictions with their
        own rules. Always check ahead before launching.
      </p>

      <p>
        More planning tools (multi-day itineraries, downloadable route files,
        river-mile filtering) are on the roadmap. If you have a feature request,
        open an issue on{' '}
        <Link href="https://github.com/ivanoats/ndwt-ol-chakra" external>
          GitHub
        </Link>
        .
      </p>
    </ArticleLayout>
  );
}
