import type { MDXComponents } from 'mdx/types';

/**
 * Required by `@next/mdx` under the App Router. Returning the
 * inherited components verbatim is enough — the global prose
 * styling (see `src/components/editorial/ArticleLayout.tsx`) is
 * applied by the wrapper, so MDX renders into native HTML
 * elements without any per-element overrides.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components };
}
