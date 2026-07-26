import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
} from '@angular/router';
import { filter } from 'rxjs';

/**
 * Per-route SEO metadata, attached to each route's `data.seo` in `app.routes.ts`.
 * `title` still comes from the route `title` (Angular's TitleStrategy prerenders it);
 * this fills in everything else that must appear in the served HTML.
 */
export interface RouteSeo {
  /** `<meta name="description">` + og/twitter description for this route. */
  description: string;
  /** When false, the page is prerendered but marked `noindex` and kept out of the sitemap. */
  index: boolean;
}

/** Site origin + base href — matches the GitHub Pages subpath and the static canonical/OG tags. */
const SITE_BASE = 'https://razeem.github.io/personal-finance-dashboard';
const OG_IMAGE = `${SITE_BASE}/og-image.png`;
const SITE_NAME = 'Personal Finance';
const JSON_LD_ID = 'seo-jsonld';

/**
 * Resolves per-route metadata (title/description/canonical/OG/Twitter/robots/JSON-LD)
 * on every navigation. Because the build-time prerender runs a full navigation per
 * route, `NavigationEnd` fires during SSG and these tags bake into each route's
 * `index.html`; on the client the same code keeps them in sync as the user navigates.
 *
 * Instantiated from `App` so it starts listening as soon as the shell boots.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  /** Begin reacting to navigations. Idempotent — safe to call once from the shell. */
  init(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.apply());
    // Apply immediately for the current (first-rendered) route too, since the initial
    // NavigationEnd may have already fired before this subscription during prerender.
    this.apply();
  }

  private apply(): void {
    const snapshot = this.deepestRoute();
    const seo = (snapshot.data['seo'] as RouteSeo | undefined) ?? null;
    if (!seo) return;

    const url = this.absoluteUrl();
    // Read the resolved title from the route snapshot rather than `Title.getTitle()`:
    // during prerender the TitleStrategy may not have written `<title>` yet when this runs.
    const title = snapshot.title ?? this.title.getTitle();

    this.meta.updateTag({ name: 'description', content: seo.description });
    this.setCanonical(url);

    // Open Graph + Twitter — override the static defaults from index.html.
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: OG_IMAGE });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });

    // Robots: only the thin data-entry pillars are noindex.
    if (seo.index) {
      this.meta.removeTag("name='robots'");
    } else {
      this.meta.updateTag({ name: 'robots', content: 'noindex,follow' });
    }

    this.setJsonLd(seo.index ? this.buildJsonLd(title, seo.description, url) : null);
  }

  /** Walk to the deepest activated route snapshot (carries the resolved title + seo data). */
  private deepestRoute(): ActivatedRouteSnapshot {
    let route = this.route;
    while (route.firstChild) route = route.firstChild;
    return route.snapshot;
  }

  /** Absolute URL for the current route (query/fragment stripped), directory-style. */
  private absoluteUrl(): string {
    const path = this.router.url.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
    return path ? `${SITE_BASE}/${path}/` : `${SITE_BASE}/`;
  }

  private setCanonical(href: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  /** A SoftwareApplication node describing an indexed tool page. */
  private buildJsonLd(name: string, description: string, url: string): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name,
      description,
      url,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web browser',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_BASE}/` },
    };
  }

  private setJsonLd(data: Record<string, unknown> | null): void {
    const existing = this.doc.getElementById(JSON_LD_ID);
    if (existing) existing.remove();
    if (!data) return;
    const script = this.doc.createElement('script');
    script.id = JSON_LD_ID;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    this.doc.head.appendChild(script);
  }
}
