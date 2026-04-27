import { css } from 'styled-system/css';

import { Link } from '../ui/link';

const NETLIFY_BADGE_SRC =
  'https://api.netlify.com/api/v1/badges/d3ab47fd-5352-4d1a-8f93-35687d3ed6e4/deploy-status';
const NETLIFY_DEPLOYS_URL =
  'https://app.netlify.com/sites/ndwt-ol-chakra/deploys';
const REPO_URL = 'https://github.com/ivanoats/ndwt-ol-chakra';
const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

export default function Footer() {
  return (
    <footer
      className={css({
        display: 'flex',
        flexDirection: { base: 'column', md: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '4',
        paddingX: { base: '4', md: '6' },
        paddingY: '4',
        borderTopWidth: '1px',
        borderColor: 'gray.6',
        backgroundColor: 'bg.subtle',
        fontSize: 'sm',
        color: 'fg.muted',
      })}
    >
      <p className={css({ margin: 0 })}>
        Northwest Discovery Water Trail · data scraped from{' '}
        <Link href="http://www.ndwt.org" external>
          ndwt.org
        </Link>
      </p>
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '4',
          flexWrap: 'wrap',
          justifyContent: 'center',
        })}
      >
        <Link href={REPO_URL} external>
          GitHub
        </Link>
        <Link href={LICENSE_URL} external>
          MIT License
        </Link>
        <a
          href={NETLIFY_DEPLOYS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Netlify deploy status"
          className={css({ display: 'inline-flex' })}
        >
          <img
            src={NETLIFY_BADGE_SRC}
            alt="Netlify deploy status"
            width={114}
            height={20}
          />
        </a>
      </div>
    </footer>
  );
}
