import { Component, DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RouteSeo, SeoService } from './seo.service';

@Component({ template: 'x' })
class Dummy {}

const routes: Routes = [
  {
    path: 'tax',
    title: 'Tax Title',
    data: { seo: { description: 'Tax desc', index: true } satisfies RouteSeo },
    component: Dummy,
  },
  {
    path: 'income',
    title: 'Income Title',
    data: { seo: { description: 'Income desc', index: false } satisfies RouteSeo },
    component: Dummy,
  },
];

describe('SeoService', () => {
  let meta: Meta;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    meta = TestBed.inject(Meta);
    doc = TestBed.inject(DOCUMENT);
    // Isolate tests — the jsdom document persists across them.
    doc.querySelector('link[rel="canonical"]')?.remove();
    doc.getElementById('seo-jsonld')?.remove();
    meta.removeTag("name='robots'");
  });

  it('sets description, canonical, OG title and JSON-LD for an indexed route', async () => {
    TestBed.inject(SeoService).init();
    await RouterTestingHarness.create('/tax');

    expect(meta.getTag('name="description"')?.content).toBe('Tax desc');
    expect(meta.getTag('property="og:title"')?.content).toBe('Tax Title');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://razeem.github.io/personal-finance-dashboard/tax/',
    );
    expect(meta.getTag('name="robots"')).toBeNull();

    const jsonLd = doc.getElementById('seo-jsonld');
    expect(jsonLd).toBeTruthy();
    const parsed = JSON.parse(jsonLd!.textContent!);
    expect(parsed['@type']).toBe('WebApplication');
    expect(parsed.name).toBe('Tax Title');
    expect(parsed.url).toBe('https://razeem.github.io/personal-finance-dashboard/tax/');
  });

  it('marks a private route noindex and emits no JSON-LD', async () => {
    TestBed.inject(SeoService).init();
    await RouterTestingHarness.create('/income');

    expect(meta.getTag('name="robots"')?.content).toBe('noindex,follow');
    expect(doc.getElementById('seo-jsonld')).toBeNull();
    expect(meta.getTag('name="description"')?.content).toBe('Income desc');
  });
});
