import type { Metadata } from 'next';

import ArticleLayout from '@/components/editorial/ArticleLayout';
import { Link } from '@/components/ui/link';

export const metadata: Metadata = {
  title: 'About — Northwest Discovery Water Trail',
  description: 'About the Northwest Discovery Water Trail and this map site.',
};

export default function AboutPage() {
  return (
    <ArticleLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
    >
      <h1>About the Water Trail</h1>
      <p>
        The Northwest Discovery Water Trail is a 367-mile recreational boating
        route on the region&rsquo;s defining waterways. It begins at Canoe Camp
        on the Clearwater River in Idaho, follows the Snake River down to the
        Columbia River, and ends at Bonneville Dam in the Columbia River Gorge.
      </p>
      <p>
        The Water Trail connects you to nearly 150 sites to launch your boat,
        picnic, or camp along these rivers when you travel by motorboat, canoe,
        sailboat, or kayak. Whether you take a day trip or an overnight
        excursion, the trail can link you to small riverside communities,
        wildlife refuges and parks, riverside trails, museums and visitor
        centers, and campgrounds. Following the paddle strokes of tribal
        cultures and explorers like Lewis and Clark, the Water Trail will guide
        you through a cross-section of the region&rsquo;s natural and cultural
        wonders.
      </p>

      <h2>About this site</h2>
      <p>
        This is an open-source rebuild of the original classic ASP site using
        React, OpenLayers, Next.js, and PandaCSS. The trail is managed by the{' '}
        <Link href="https://www.wwta.org" external>
          Washington Water Trails Association
        </Link>
        ; trail data on this site is published as static GeoJSON at{' '}
        <Link href="/data/ndwt.geojson" external>
          /data/ndwt.geojson
        </Link>{' '}
        for anyone who wants to build their own map or trip planner. A future
        phase will integrate directly with WWTA&rsquo;s database and ArcGIS
        layers.
      </p>
      <p>
        Code lives at{' '}
        <Link href="https://github.com/ivanoats/ndwt-ol-chakra" external>
          github.com/ivanoats/ndwt-ol-chakra
        </Link>{' '}
        under the MIT license. Issues and pull requests welcome.
      </p>

      <h2>Read more</h2>
      <ul>
        <li>
          <Link href="/about/partners/">Partners</Link> — funder, manager, and
          original partner organizations
        </li>
        <li>
          <Link href="/about/history/">History</Link> — 2005 designation events
        </li>
        <li>
          <Link href="/about/photo-gallery/">Photo Gallery</Link> — photos of
          the trail
        </li>
        <li>
          <Link href="/about/contact/">Contact</Link> — get in touch with WWTA
        </li>
      </ul>
    </ArticleLayout>
  );
}
