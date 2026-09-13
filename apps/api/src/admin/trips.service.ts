import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parseJson, slugify } from '../common/utils';
import { isSafeUrl } from '../common/validation';
import { PrismaService } from '../prisma/prisma.service';
import type { TripDto, TripSectionDto } from './trips.dto';

export interface AdminTripQuery {
  q?: string;
  status?: string;
  countryId?: string;
  continentId?: string;
  activityId?: string;
  page?: string;
  limit?: string;
  sort?: string;
}

const MAX_SECTION_BYTES = 60_000;

/** Keeps section JSON small and strips any image URL that isn't safe to render. */
function sanitizeSection(section: TripSectionDto) {
  const content = { ...section.content } as Record<string, unknown>;
  if (Array.isArray(content.images)) {
    content.images = (content.images as { url?: unknown; alt?: unknown }[])
      .filter((img) => isSafeUrl(img?.url))
      .map((img) => ({ url: img.url, alt: typeof img.alt === 'string' ? img.alt.slice(0, 200) : '' }));
  }
  const json = JSON.stringify(content);
  if (json.length > MAX_SECTION_BYTES) {
    throw new BadRequestException(`The "${section.title || section.type}" section is too long`);
  }
  return json;
}

@Injectable()
export class TripsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminTripQuery) {
    const where: Prisma.TripWhereInput = {};
    const and: Prisma.TripWhereInput[] = [];
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({ OR: [{ title: { contains: q } }, { slug: { contains: q } }, { location: { contains: q } }] });
    }
    if (query.status === 'published') and.push({ isPublished: true });
    if (query.status === 'draft') and.push({ isPublished: false });
    if (query.status === 'featured') and.push({ isFeatured: true });
    if (query.countryId) and.push({ countryId: Number(query.countryId) });
    if (query.continentId) and.push({ country: { continentId: Number(query.continentId) } });
    if (query.activityId) and.push({ activities: { some: { activityId: Number(query.activityId) } } });
    if (and.length) where.AND = and;

    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
    const page = Math.max(Number(query.page) || 1, 1);
    const orderBy: Prisma.TripOrderByWithRelationInput =
      query.sort === 'title' ? { title: 'asc' }
      : query.sort === 'price' ? { priceFrom: 'asc' }
      : { updatedAt: 'desc' };

    const [total, items] = await Promise.all([
      this.prisma.trip.count({ where }),
      this.prisma.trip.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          priceFrom: true,
          currency: true,
          durationDays: true,
          isPublished: true,
          isFeatured: true,
          updatedAt: true,
          country: { select: { id: true, name: true, continent: { select: { name: true } } } },
          activities: { select: { activity: { select: { name: true } } } },
          photos: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
          _count: { select: { days: true, photos: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize: limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
      items: items.map((t) => ({
        ...t,
        thumbnail: t.coverImage ?? t.photos[0]?.url ?? null,
        activities: t.activities.map((a) => a.activity.name),
      })),
    };
  }

  async get(id: number) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        activities: true,
        photos: { orderBy: { sortOrder: 'asc' } },
        days: { orderBy: [{ sortOrder: 'asc' }, { dayNumber: 'asc' }] },
        amenities: { orderBy: { sortOrder: 'asc' } },
        sections: { orderBy: { sortOrder: 'asc' } },
        departures: { orderBy: { startDate: 'asc' } },
        country: { select: { name: true, slug: true } },
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return {
      ...trip,
      activityIds: trip.activities.map((a) => a.activityId),
      sections: trip.sections.map((s) => ({ ...s, content: parseJson(s.content, {}) })),
    };
  }

  private basics(dto: TripDto) {
    return {
      title: dto.title.trim(),
      slug: slugify(dto.slug || dto.title),
      countryId: dto.countryId,
      location: dto.location?.trim() || null,
      summary: dto.summary.trim(),
      priceFrom: dto.priceFrom,
      currency: dto.currency,
      durationDays: dto.durationDays,
      difficulty: dto.difficulty,
      groupSizeMax: dto.groupSizeMax ?? null,
      maxAltitude: dto.maxAltitude ?? null,
      bestSeason: dto.bestSeason?.trim() || null,
      rating: dto.rating ?? 0,
      reviewCount: dto.reviewCount ?? 0,
      badge: dto.badge?.trim() || null,
      coverImage: dto.coverImage || dto.photos[0]?.url || null,
      isPublished: dto.isPublished,
      isFeatured: dto.isFeatured,
      sortOrder: dto.sortOrder ?? 0,
      metaTitle: dto.metaTitle?.trim() || null,
      metaDescription: dto.metaDescription?.trim() || null,
    };
  }

  /** Cross-field checks that must hold before any write happens. */
  private validateDepartures(dto: TripDto) {
    for (const d of dto.departures) {
      if (d.seatsLeft > d.seatsTotal) {
        throw new BadRequestException('Seats left cannot be more than total seats');
      }
    }
  }

  private children(client: Prisma.TransactionClient | PrismaService, tripId: number, dto: TripDto) {
    return [
      client.tripActivity.createMany({
        data: [...new Set(dto.activityIds)].map((activityId) => ({ tripId, activityId })),
      }),
      client.tripPhoto.createMany({
        data: dto.photos.map((p, i) => ({ tripId, url: p.url, alt: p.alt ?? '', sortOrder: i })),
      }),
      client.tripDay.createMany({
        data: dto.days.map((d, i) => ({
          tripId,
          dayNumber: d.dayNumber,
          title: d.title,
          body: d.body ?? '',
          walkHours: d.walkHours || null,
          altitude: d.altitude || null,
          lodging: d.lodging || null,
          meals: d.meals || null,
          sortOrder: i,
        })),
      }),
      client.tripAmenity.createMany({
        data: dto.amenities.map((a, i) => ({
          tripId,
          label: a.label,
          icon: a.icon || 'check',
          included: a.included,
          sortOrder: i,
        })),
      }),
      client.tripSection.createMany({
        data: dto.sections.map((s, i) => ({
          tripId,
          type: s.type,
          title: s.title,
          content: sanitizeSection(s),
          isVisible: s.isVisible,
          sortOrder: i,
        })),
      }),
      client.departure.createMany({
        data: dto.departures.map((d) => ({
          tripId,
          startDate: new Date(d.startDate),
          seatsTotal: d.seatsTotal,
          seatsLeft: d.seatsLeft,
          priceOverride: d.priceOverride ?? null,
        })),
      }),
    ];
  }

  async create(dto: TripDto) {
    this.validateDepartures(dto);
    // Interactive transaction: if anything in children() fails (bad FK, DB error), the
    // trip row itself rolls back too, instead of leaving an orphaned Trip with no content
    // permanently occupying its slug.
    const trip = await this.prisma.$transaction(async (tx) => {
      const created = await tx.trip.create({ data: this.basics(dto) });
      await Promise.all(this.children(tx, created.id, dto));
      return created;
    });
    return this.get(trip.id);
  }

  /** Full replace of a trip and all its nested content in one transaction. */
  async update(id: number, dto: TripDto) {
    this.validateDepartures(dto);
    await this.prisma.trip.findUniqueOrThrow({ where: { id }, select: { id: true } });
    await this.prisma.$transaction([
      this.prisma.trip.update({ where: { id }, data: this.basics(dto) }),
      this.prisma.tripActivity.deleteMany({ where: { tripId: id } }),
      this.prisma.tripPhoto.deleteMany({ where: { tripId: id } }),
      this.prisma.tripDay.deleteMany({ where: { tripId: id } }),
      this.prisma.tripAmenity.deleteMany({ where: { tripId: id } }),
      this.prisma.tripSection.deleteMany({ where: { tripId: id } }),
      this.prisma.departure.deleteMany({ where: { tripId: id } }),
      ...this.children(this.prisma, id, dto),
    ]);
    return this.get(id);
  }

  async duplicate(id: number) {
    const source = await this.get(id);
    let slug = `${source.slug}-copy`;
    for (let n = 2; await this.prisma.trip.findUnique({ where: { slug }, select: { id: true } }); n++) {
      slug = `${source.slug}-copy-${n}`;
    }
    const dto: TripDto = {
      ...source,
      title: `${source.title} (copy)`,
      slug,
      location: source.location ?? undefined,
      bestSeason: source.bestSeason ?? undefined,
      badge: source.badge ?? undefined,
      metaTitle: source.metaTitle ?? undefined,
      metaDescription: source.metaDescription ?? undefined,
      isPublished: false,
      isFeatured: false,
      photos: source.photos.map((p) => ({ url: p.url, alt: p.alt })),
      days: source.days.map((d) => ({
        dayNumber: d.dayNumber,
        title: d.title,
        body: d.body,
        walkHours: d.walkHours ?? undefined,
        altitude: d.altitude ?? undefined,
        lodging: d.lodging ?? undefined,
        meals: d.meals ?? undefined,
      })),
      amenities: source.amenities.map((a) => ({ label: a.label, icon: a.icon, included: a.included })),
      sections: source.sections.map((s) => ({
        type: s.type as TripSectionDto['type'],
        title: s.title,
        content: s.content as Record<string, unknown>,
        isVisible: s.isVisible,
      })),
      departures: source.departures.map((d) => ({
        startDate: d.startDate.toISOString(),
        seatsTotal: d.seatsTotal,
        seatsLeft: d.seatsLeft,
        priceOverride: d.priceOverride,
      })),
    };
    return this.create(dto);
  }
}
