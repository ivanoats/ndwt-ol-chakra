# DNS cutover: ndwt.org → this site

Runbook for Phase 14 of [`feature-parity.md`](../plans/feature-parity.md).
Point ndwt.org at the Netlify site so the legacy ASP site can be
retired. The DNS change is made with WWTA's domain registrar. This
repo only prepares the site to receive the traffic.

## What the code already does

- **Legacy URL redirects.** `next build` writes `out/_redirects` from
  [`src/lib/legacy-redirects.ts`](../../src/lib/legacy-redirects.ts)
  (served by `app/%5Fredirects/route.ts`). It covers:
  - All 159 `/ndwt/explore/site.asp?site=<id>` site pages. These take
    two 301 hops, first to `/sites/legacy/<id>/` and then to
    `/sites/<slug>/`, because Netlify can capture a query value but
    can't match on an exact one.
    Netlify forwards the original query string along both hops, so
    the browser lands on `/sites/<slug>/?site=<id>`. That's harmless:
    the page ignores the parameter and its canonical tag names the
    clean URL. Netlify has no documented way to strip it.
  - Every editorial `.asp` page whose copy was ported (17 pages).
  - Catch-alls for each legacy section directory, then `/ndwt/*` → `/`.
- **Sitemap and robots.** `out/sitemap.xml` (every static, editorial,
  and per-site route) and `out/robots.txt`.
- **Canonical and share metadata.** Every page emits a canonical URL,
  OpenGraph, and Twitter card tags via
  [`src/lib/page-metadata.ts`](../../src/lib/page-metadata.ts).
  Absolute URLs use the origin from
  [`src/lib/site-url.ts`](../../src/lib/site-url.ts): `SITE_URL` if
  set, else Netlify's `URL` (the site's primary domain).

The redirects are inert until ndwt.org resolves to Netlify, because
nothing on the `*.netlify.app` host links to `/ndwt/...`. They can
still be tested on any deploy preview (see below).

## Before requesting the swap

Do these on the latest deploy preview and record the results in the
PR or issue that tracks the cutover.

1. **WWTA sign-off** on the Tribal Communities page
   (`/past-and-present/tribal-communities/`) and the Partners page
   (`/about/partners/`).
2. **Lighthouse** on `/`, `/sites/<slug>/`, and `/water-safety/`.
   Targets: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95,
   SEO ≥ 95. Deploy previews send `X-Robots-Tag: noindex`, so SEO
   scores lower there. Judge SEO on the production URL.
3. **VoiceOver pass** on macOS across the home page, one site page,
   and one editorial page.
4. **Broken-link sweep** of the preview, for example:

   ```sh
   npx -y linkinator https://<preview>.netlify.app --recurse --skip "^(?!https://<preview>)"
   ```

5. **Redirect spot-checks** against the preview (should print `301`
   and the new location):

   ```sh
   PREVIEW=https://<preview>.netlify.app
   for path in \
     "/ndwt/explore/site.asp?site=130" \
     "/ndwt/explore/site.asp?site=130&utm_source=newsletter" \
     "/sites/legacy/130/" \
     "/ndwt/water_safety/reading_rivers.asp" \
     "/ndwt/navigation/dam_protocol.asp" \
     "/ndwt/natural_world/some_unported_page.asp" \
     "/ndwt/default.asp"; do
     curl -s -o /dev/null -w "%{http_code} %{redirect_url}  $path\n" "$PREVIEW$path"
   done
   ```

6. **Lower the DNS TTL.** A day or more ahead, ask WWTA to drop the
   TTL on the existing `ndwt.org` and `www.ndwt.org` records to 300
   seconds, so the swap (and any rollback) propagates quickly.

## Cutover steps

1. **Add the domain in Netlify.** Site configuration → Domain
   management → Add a domain → `www.ndwt.org`. Make `www.ndwt.org`
   the primary domain. Every legacy URL already uses `www`, and
   Netlify recommends a `www` primary when DNS stays with an external
   provider. Netlify adds `ndwt.org` as an alias and redirects it to
   `www`.
2. **Set `SITE_URL`** (optional but recommended) to
   `https://www.ndwt.org` under Site configuration → Environment
   variables, scoped to Production. Once the primary domain changes,
   Netlify's `URL` will already be this value. Setting `SITE_URL`
   pins canonical URLs so a later change of primary domain can't
   silently change them.
3. **Change DNS at WWTA's registrar.** Use the values shown in
   Netlify's "Pending DNS verification" panel, which take precedence
   over these:
   - `www` → `CNAME` → `<site-name>.netlify.app`
   - apex `ndwt.org` → `ALIAS`/`ANAME`/flattened `CNAME` →
     `apex-loadbalancer.netlify.com`, or, if the provider supports
     none of those, `A` → `75.2.60.5`
4. **Trigger a production deploy** after the domain change, so the
   sitemap, robots, and canonical tags are rebuilt with the new
   origin.
5. **Wait for HTTPS.** Netlify provisions a Let's Encrypt certificate
   once DNS resolves. Check that HTTPS is enforced.

## After the swap

1. Rerun the redirect spot-checks against `https://www.ndwt.org` and
   `http://ndwt.org` (http→https, then apex→www, then the legacy rule).
2. Add the domain in Google Search Console, submit
   `https://www.ndwt.org/sitemap.xml`, and watch Coverage for 404s
   over the next few weeks. Add an explicit rule to
   `legacy-redirects.ts` for any legacy URL that lands somewhere
   unhelpful.
3. Coordinate the social-media and email announcement with WWTA.
4. Once traffic has settled, raise the DNS TTL back to its normal
   value. Then tell WWTA the ASP host can be decommissioned.

## Rollback

Point the DNS records back to the legacy host's previous values (keep
a copy before step 3). With the low TTL, most clients follow within
minutes. Remove `www.ndwt.org` from the Netlify site only after DNS
has moved back, or Netlify will show a certificate error in between.
