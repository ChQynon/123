import { MetadataRoute } from 'next'

const BASE = 'https://adaption.top'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/login',
    '/dash',
    '/calculator',
    '/reports',
    '/schedule',
    '/settings',
  ]

  return routes.map((route) => ({
    url: `${BASE}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.7,
  }))
}
