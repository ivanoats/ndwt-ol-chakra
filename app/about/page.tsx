import type { Metadata } from 'next';
import { css } from 'styled-system/css';

import { Link } from '@/components/ui/link';

export const metadata: Metadata = {
  title: 'About — Northwest Discovery Water Trail',
  description: 'About the Northwest Discovery Water Trail and this map site.',
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

export default function AboutPage() {
  return (
    <article className={pageStyle}>
      <h1 className={headingStyle}>About the Water Trail</h1>
      <p className={paragraphStyle}>
        The Northwest Discovery Water Trail is a 367-mile recreational boating
        route on the region&rsquo;s defining waterways. It begins at Canoe Camp
        on the Clearwater River in Idaho, follows the Snake River down to the
        Columbia River, and ends at Bonneville Dam in the Columbia River Gorge.
      </p>
      <p className={paragraphStyle}>
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

      <h2 className={subheadingStyle}>About this site</h2>
      <p className={paragraphStyle}>
        This is an open-source rebuild of the original site (originally ASP.NET)
        using React, OpenLayers, Next.js, and PandaCSS. The official site lives
        at{' '}
        <Link href="http://www.ndwt.org" external>
          ndwt.org
        </Link>
        ; trail data on this site is published as static GeoJSON at{' '}
        <Link href="/data/ndwt.geojson" external>
          /data/ndwt.geojson
        </Link>{' '}
        for anyone who wants to build their own map or trip planner. A future
        phase will integrate directly with WWTA&rsquo;s database and ArcGIS
        layers.
      </p>
      <p className={paragraphStyle}>
        Code lives at{' '}
        <Link href="https://github.com/ivanoats/ndwt-ol-chakra" external>
          github.com/ivanoats/ndwt-ol-chakra
        </Link>{' '}
        under the MIT license. Issues and pull requests welcome.
      </p>
    </article>
  );
}
