import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseJson, startOfUtcDay } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import type { EnquiryDto, TripQueryDto } from './public.dto';

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

const PUBLISHED: Prisma.TripWhereInput = { isPublished: true };

export const tripCardSelect = {
  id: true,
  title: true,
  slug: true,
  location: true,
  summary: true,
  priceFrom: true,
  currency: true,
  durationDays: true,
  difficulty: true,
  rating: true,
  reviewCount: true,
  badge: true,
  coverImage: true,
  isFeatured: true,
  country: { select: { name: true, slug: true, continent: { select: { name: true, slug: true } } } },
  activities: { select: { activity: { select: { name: true, slug: true, icon: true } } } },
  photos: { select: { url: true, alt: true }, orderBy: { sortOrder: 'asc' as const }, take: 5 },
  _count: { select: { photos: true } },
} satisfies Prisma.TripSelect;

type TripCardRow = Prisma.TripGetPayload<{ select: typeof tripCardSelect }>;

export function toTripCard(t: TripCardRow) {
  return {
    id: t.id,
    title: t.title,
    slug: t.slug,
    location: t.location,
    summary: t.summary,
    priceFrom: t.priceFrom,
    currency: t.currency,
    durationDays: t.durationDays,
    difficulty: t.difficulty,
    rating: t.rating,
    reviewCount: t.reviewCount,
    badge: t.badge,
    coverImage: t.coverImage ?? t.photos[0]?.url ?? null,
    isFeatured: t.isFeatured,
    country: { name: t.country.name, slug: t.country.slug },
    continent: t.country.continent,
    activities: t.activities.map((a) => a.activity),
    photos: t.photos.map((p) => p.url),
    photoCount: t._count.photos,
  };
}

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const rows = await this.prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, parseJson(r.value, null)]));
  }

  async getSite() {
    const [settings, supportPages, continents, activities] = await Promise.all([
      this.getSettings(),
      this.prisma.page.findMany({
        where: { isPublished: true, navGroup: 'support' },
        select: { slug: true, title: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.continent.findMany({ select: { name: true, slug: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.activityTag.findMany({
        select: { name: true, slug: true, icon: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);
    return { settings, supportPages, continents, activities };
  }

  private async tripStatsByCountry() {
    const stats = await this.prisma.trip.groupBy({
      by: ['countryId'],
      where: PUBLISHED,
      _count: { _all: true },
      _min: { priceFrom: true },
    });
    return new Map(stats.map((s) => [s.countryId, { tripCount: s._count._all, priceFrom: s._min.priceFrom }]));
  }

  async getHome() {
    const [continents, featuredCountries, featuredTrips, activities, testimonials, stats] = await Promise.all([
      this.listContinents(),
      this.prisma.country.findMany({
        where: { isFeatured: true },
        include: { continent: { select: { name: true, slug: true } } },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.trip.findMany({
        where: { ...PUBLISHED, isFeatured: true },
        select: tripCardSelect,
        orderBy: [{ sortOrder: 'asc' }, { rating: 'desc' }],
        take: 9,
      }),
      this.listActivities(),
      this.prisma.testimonial.findMany({ where: { isPublished: true }, orderBy: { sortOrder: 'asc' }, take: 8 }),
      this.tripStatsByCountry(),
    ]);

    return {
      continents,
      featuredCountries: featuredCountries.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        region: c.region ?? c.continent.name,
        highlight: c.highlight,
        image: c.image,
        continent: c.continent,
        isFeatured: c.isFeatured,
        ...(stats.get(c.id) ?? { tripCount: 0, priceFrom: null }),
      })),
      featuredTrips: featuredTrips.map(toTripCard),
      activities,
      testimonials,
    };
  }

  async listContinents() {
    const [continents, stats] = await Promise.all([
      this.prisma.continent.findMany({
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          tagline: true,
          image: true,
          countries: {
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            select: { id: true, name: true, slug: true, region: true, image: true, highlight: true },
          },
        },
      }),
      this.tripStatsByCountry(),
    ]);
    return continents.map((c) => {
      const countries = c.countries.map((country) => ({
        id: country.id,
        name: country.name,
        slug: country.slug,
        region: country.region,
        image: country.image,
        highlight: country.highlight,
        ...(stats.get(country.id) ?? { tripCount: 0, priceFrom: null }),
      }));
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        tagline: c.tagline,
        image: c.image,
        countryCount: countries.length,
        tripCount: countries.reduce((sum, x) => sum + x.tripCount, 0),
        countries,
      };
    });
  }

  async getCountry(slug: string) {
    const country = await this.prisma.country.findUnique({
      where: { slug },
      include: { continent: { select: { id: true, name: true, slug: true } } },
    });
    if (!country) throw new NotFoundException('Destination not found');
    const [trips, siblings] = await Promise.all([
      this.prisma.trip.findMany({
        where: { ...PUBLISHED, countryId: country.id },
        select: tripCardSelect,
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
      }),
      this.prisma.country.findMany({
        where: { continentId: country.continentId, NOT: { id: country.id } },
        select: { name: true, slug: true, image: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);
    return { country, trips: trips.map(toTripCard), siblings };
  }

  async listActivities() {
    const tags = await this.prisma.activityTag.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { trips: { where: { trip: PUBLISHED } } } } },
    });
    return tags.map(({ _count, ...t }) => ({ ...t, tripCount: _count.trips }));
  }

  async getActivity(slug: string) {
    const activity = await this.prisma.activityTag.findUnique({ where: { slug } });
    if (!activity) throw new NotFoundException('Activity not found');
    const trips = await this.prisma.trip.findMany({
      where: { ...PUBLISHED, activities: { some: { activityId: activity.id } } },
      select: tripCardSelect,
      orderBy: [{ isFeatured: 'desc' }, { rating: 'desc' }],
    });
    const others = await this.prisma.activityTag.findMany({
      where: { NOT: { id: activity.id } },
      select: { name: true, slug: true, icon: true },
      orderBy: { sortOrder: 'asc' },
    });
    return { activity, trips: trips.map(toTripCard), others };
  }

  async getFilters() {
    const [continents, activities, agg] = await Promise.all([
      this.prisma.continent.findMany({
        orderBy: { sortOrder: 'asc' },
        select: { name: true, slug: true, countries: { select: { name: true, slug: true }, orderBy: { name: 'asc' } } },
      }),
      this.prisma.activityTag.findMany({ orderBy: { sortOrder: 'asc' }, select: { name: true, slug: true, icon: true } }),
      this.prisma.trip.aggregate({
        where: PUBLISHED,
        _min: { priceFrom: true, durationDays: true },
        _max: { priceFrom: true, durationDays: true },
      }),
    ]);
    return {
      continents,
      activities,
      difficulties: ['Easy', 'Moderate', 'Challenging', 'Strenuous'],
      price: { min: agg._min.priceFrom ?? 0, max: agg._max.priceFrom ?? 0 },
      days: { min: agg._min.durationDays ?? 0, max: agg._max.durationDays ?? 0 },
    };
  }

  async listTrips(q: TripQueryDto) {
    const where: Prisma.TripWhereInput = { ...PUBLISHED };
    const and: Prisma.TripWhereInput[] = [];
    if (q.country) and.push({ country: { slug: q.country } });
    if (q.continent) and.push({ country: { continent: { slug: q.continent } } });
    if (q.activity) {
      const slugs = q.activity.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
      if (slugs.length) and.push({ activities: { some: { activity: { slug: { in: slugs } } } } });
    }
    if (q.difficulty) and.push({ difficulty: q.difficulty });
    if (q.minPrice != null) and.push({ priceFrom: { gte: q.minPrice } });
    if (q.maxPrice != null) and.push({ priceFrom: { lte: q.maxPrice } });
    if (q.minDays != null) and.push({ durationDays: { gte: q.minDays } });
    if (q.maxDays != null) and.push({ durationDays: { lte: q.maxDays } });
    if (q.featured === 'true') and.push({ isFeatured: true });
    if (q.q?.trim()) {
      const term = q.q.trim();
      and.push({
        OR: [
          { title: { contains: term } },
          { location: { contains: term } },
          { summary: { contains: term } },
          { country: { name: { contains: term } } },
          { activities: { some: { activity: { name: { contains: term } } } } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const orderBy: Prisma.TripOrderByWithRelationInput[] = (() => {
      switch (q.sort) {
        case 'price-asc': return [{ priceFrom: 'asc' }];
        case 'price-desc': return [{ priceFrom: 'desc' }];
        case 'duration-asc': return [{ durationDays: 'asc' }];
        case 'duration-desc': return [{ durationDays: 'desc' }];
        case 'rating': return [{ rating: 'desc' }, { reviewCount: 'desc' }];
        case 'newest': return [{ createdAt: 'desc' }];
        default: return [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { rating: 'desc' }];
      }
    })();

    const pageSize = q.limit ?? 12;
    const page = q.page ?? 1;
    const [total, items] = await Promise.all([
      this.prisma.trip.count({ where }),
      this.prisma.trip.findMany({
        where,
        select: tripCardSelect,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: items.map(toTripCard), total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async getTrip(slug: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { slug, ...PUBLISHED },
      include: {
        country: { include: { continent: { select: { name: true, slug: true } } } },
        activities: { include: { activity: { select: { name: true, slug: true, icon: true } } } },
        photos: { orderBy: { sortOrder: 'asc' } },
        days: { orderBy: [{ sortOrder: 'asc' }, { dayNumber: 'asc' }] },
        amenities: { orderBy: { sortOrder: 'asc' } },
        sections: { where: { isVisible: true }, orderBy: { sortOrder: 'asc' } },
        departures: { where: { startDate: { gte: startOfUtcDay() } }, orderBy: { startDate: 'asc' }, take: 24 },
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    const activityIds = trip.activities.map((a) => a.activityId);
    const related = await this.prisma.trip.findMany({
      where: {
        ...PUBLISHED,
        NOT: { id: trip.id },
        OR: [{ countryId: trip.countryId }, { activities: { some: { activityId: { in: activityIds } } } }],
      },
      select: tripCardSelect,
      orderBy: [{ isFeatured: 'desc' }, { rating: 'desc' }],
      take: 3,
    });

    return {
      ...trip,
      activities: trip.activities.map((a) => a.activity),
      sections: trip.sections.map((s) => ({ ...s, content: parseJson(s.content, {}) })),
      related: related.map(toTripCard),
    };
  }

  async search(term?: string) {
    const q = term?.trim() ?? '';
    const stats = await this.tripStatsByCountry();

    const countries = await this.prisma.country.findMany({
      where: q
        ? { OR: [{ name: { contains: q } }, { continent: { name: { contains: q } } }, { region: { contains: q } }] }
        : undefined,
      include: { continent: { select: { name: true, slug: true, sortOrder: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const groupsMap = new Map<string, { continent: { name: string; slug: string }; order: number; countries: unknown[] }>();
    for (const c of countries) {
      const key = c.continent.slug;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          continent: { name: c.continent.name, slug: c.continent.slug },
          order: c.continent.sortOrder,
          countries: [],
        });
      }
      groupsMap.get(key)!.countries.push({
        name: c.name,
        slug: c.slug,
        image: c.image,
        ...(stats.get(c.id) ?? { tripCount: 0, priceFrom: null }),
      });
    }
    const groups = [...groupsMap.values()].sort((a, b) => a.order - b.order).map(({ order: _o, ...g }) => g);

    const [trips, activities] = await Promise.all([
      q
        ? this.prisma.trip.findMany({
            where: {
              ...PUBLISHED,
              OR: [{ title: { contains: q } }, { location: { contains: q } }, { country: { name: { contains: q } } }],
            },
            select: tripCardSelect,
            take: 6,
          })
        : [],
      this.prisma.activityTag.findMany({
        where: q ? { name: { contains: q } } : undefined,
        select: { name: true, slug: true, icon: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return { query: q, groups, trips: trips.map(toTripCard), activities };
  }

  async getPage(slug: string) {
    const page = await this.prisma.page.findFirst({ where: { slug, isPublished: true } });
    if (!page) throw new NotFoundException('Page not found');
    return { ...page, sections: parseJson(page.sections, [] as unknown[]) };
  }

  listTestimonials() {
    return this.prisma.testimonial.findMany({ where: { isPublished: true }, orderBy: { sortOrder: 'asc' } });
  }

  async createEnquiry(dto: EnquiryDto) {
    // Bots fill the invisible honeypot — answer as if it worked, store nothing.
    if (dto.website) return { ok: true, reference: 'PDN-00000' };

    if (dto.tripId != null) {
      const trip = await this.prisma.trip.findFirst({ where: { id: dto.tripId, ...PUBLISHED }, select: { id: true } });
      if (!trip) throw new BadRequestException('That trip is no longer available');
    }
    const enquiry = await this.prisma.enquiry.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        travellers: dto.travellers ?? null,
        preferredDate: dto.preferredDate?.trim() || null,
        message: dto.message.trim(),
        tripId: dto.tripId ?? null,
        source: dto.source ?? 'website',
      },
    });
    return { ok: true, reference: `PDN-${String(enquiry.id).padStart(5, '0')}` };
  }

  /**
   * Every crawlable URL, for sitemap.xml — static routes plus every published trip/country/
   * activity/page. Paths must match the actual React Router routes in apps/web/src/App.tsx.
   */
  private async getSitemapUrls(): Promise<{ path: string; lastmod?: Date }[]> {
    const STATIC_PATHS = ['/', '/destinations', '/tours', '/activities', '/testimonials', '/contact', '/support'];
    const [trips, countries, activities, pages] = await Promise.all([
      this.prisma.trip.findMany({ where: PUBLISHED, select: { slug: true, updatedAt: true } }),
      this.prisma.country.findMany({ select: { slug: true } }),
      this.prisma.activityTag.findMany({ select: { slug: true } }),
      this.prisma.page.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    ]);
    return [
      ...STATIC_PATHS.map((path) => ({ path })),
      ...trips.map((t) => ({ path: `/tours/${t.slug}`, lastmod: t.updatedAt })),
      ...countries.map((c) => ({ path: `/destinations/${c.slug}` })),
      ...activities.map((a) => ({ path: `/activities/${a.slug}` })),
      ...pages.map((p) => ({ path: `/support/${p.slug}`, lastmod: p.updatedAt })),
    ];
  }

  // `base` comes from the actual incoming request (see main.ts), not the WEB_ORIGIN env var —
  // that stays correct even if WEB_ORIGIN drifts from the real public hostname (e.g. after a
  // Render service rename), which it has done at least once already.
  async getSitemapXml(base: string): Promise<string> {
    const urls = await this.getSitemapUrls();
    const entries = urls
      .map(({ path, lastmod }) => {
        const loc = `<loc>${escapeXml(`${base}${path}`)}</loc>`;
        const mod = lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : '';
        return `<url>${loc}${mod}</url>`;
      })
      .join('');
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;
  }

  getRobotsTxt(base: string): string {
    return ['User-agent: *', 'Allow: /', 'Disallow: /admin', `Sitemap: ${base}/sitemap.xml`, ''].join('\n');
  }

  async subscribe(email: string) {
    await this.prisma.subscriber.upsert({
      where: { email: email.trim().toLowerCase() },
      update: {},
      create: { email: email.trim().toLowerCase() },
    });
    return { ok: true };
  }
}
