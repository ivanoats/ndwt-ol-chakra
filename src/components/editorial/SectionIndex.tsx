import { css } from 'styled-system/css';

import { Heading } from '../ui/heading';
import { Link } from '../ui/link';
import { Text } from '../ui/text';

interface SectionPage {
  readonly slug: string;
  readonly title: string;
  readonly summary?: string;
}

interface SectionIndexProps {
  readonly heading: string;
  readonly intro: string;
  readonly basePath: string;
  readonly pages: readonly SectionPage[];
}

const listStyle = css({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '3',
  marginTop: '6',
});

const cardStyle = css({
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

export default function SectionIndex({
  heading,
  intro,
  basePath,
  pages,
}: SectionIndexProps) {
  return (
    <>
      <Heading as="h1" size="2xl">
        {heading}
      </Heading>
      <Text as="p" css={{ color: 'fg.muted', marginTop: '2' }}>
        {intro}
      </Text>
      <ol className={listStyle}>
        {pages.map((page) => (
          <li key={page.slug}>
            <Link href={`${basePath}${page.slug}/`} className={cardStyle}>
              <Text
                as="span"
                css={{ fontWeight: 'semibold', display: 'block' }}
              >
                {page.title}
              </Text>
              {page.summary === undefined ? null : (
                <Text
                  as="span"
                  css={{
                    fontSize: 'sm',
                    color: 'fg.muted',
                    display: 'block',
                    marginTop: '1',
                  }}
                >
                  {page.summary}
                </Text>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
