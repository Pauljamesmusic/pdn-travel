import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homeSettings, pages, siteSettings, testimonials } from './seed/content';
import { activities, continents, countries } from './seed/taxonomy';
import { nepalTrips } from './seed/trips-nepal';
import type { SeedTrip } from './seed/types';
import { worldTrips } from './seed/trips-world';

// Minimal .env loader so the seed has no extra dependencies.
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const prisma = new PrismaClient();

function sectionsFor(trip: SeedTrip) {
  const sections: { type: string; title: string; content: string }[] = [
    { type: 'overview', title: 'Overview', content: JSON.stringify({ body: trip.overview }) },
    { type: 'highlights', title: 'Trip highlights', content: JSON.stringify({ items: trip.highlights }) },
    { type: 'itinerary', title: 'Day-by-day itinerary', content: '{}' },
    { type: 'inclusions', title: 'What’s included', content: '{}' },
  ];
  if (trip.packing?.length) {
    sections.push({ type: 'list', title: 'What to bring', content: JSON.stringify({ items: trip.packing }) });
  }
  sections.push({
    type: 'departures',
    title: 'Dates & availability',
    content: JSON.stringify({ note: 'Prices are per person sharing. Any date can also run as a private departure.' }),
  });
  if (trip.faq?.length) sections.push({ type: 'faq', title: 'Good to know', content: JSON.stringify({ items: trip.faq }) });
  return sections.map((s, i) => ({ ...s, sortOrder: i, isVisible: true }));
}

async function main() {
  // Safe to run on every deploy: only seeds a genuinely empty database. Once there is
  // real content (including anything added or edited from the admin panel), this is a
  // no-op — admin edits are never overwritten. Pass --force to wipe and reseed anyway.
  const alreadySeeded = (await prisma.continent.count()) > 0;
  if (alreadySeeded && !process.argv.includes('--force')) {
    console.log('Database already has content — skipping the demo reseed so admin edits are kept.');
    console.log('(Run `tsx prisma/seed.ts --force`, i.e. `npm run db:reset`, to wipe and reseed on purpose.)');
    await ensureOwner();
    return;
  }

  console.log('Clearing content tables…');
  await prisma.$transaction([
    prisma.enquiry.deleteMany(),
    prisma.tripActivity.deleteMany(),
    prisma.tripPhoto.deleteMany(),
    prisma.tripDay.deleteMany(),
    prisma.tripAmenity.deleteMany(),
    prisma.tripSection.deleteMany(),
    prisma.departure.deleteMany(),
    prisma.trip.deleteMany(),
    prisma.country.deleteMany(),
    prisma.continent.deleteMany(),
    prisma.activityTag.deleteMany(),
    prisma.page.deleteMany(),
    prisma.testimonial.deleteMany(),
    prisma.setting.deleteMany(),
  ]);

  console.log('Creating continents, countries and activity tags…');
  const continentIds = new Map<string, number>();
  for (const [i, c] of continents.entries()) {
    const row = await prisma.continent.create({ data: { ...c, sortOrder: i } });
    continentIds.set(c.slug, row.id);
  }

  const countryIds = new Map<string, number>();
  for (const [i, { continent, ...c }] of countries.entries()) {
    const row = await prisma.country.create({
      data: { ...c, sortOrder: i, continentId: continentIds.get(continent)! },
    });
    countryIds.set(c.slug, row.id);
  }

  const activityIds = new Map<string, number>();
  for (const [i, a] of activities.entries()) {
    const row = await prisma.activityTag.create({ data: { ...a, sortOrder: i } });
    activityIds.set(a.slug, row.id);
  }

  console.log('Creating trips with itineraries…');
  const allTrips = [...nepalTrips, ...worldTrips];
  for (const [i, t] of allTrips.entries()) {
    await prisma.trip.create({
      data: {
        title: t.title,
        slug: t.slug,
        countryId: countryIds.get(t.country)!,
        location: t.location,
        summary: t.summary,
        priceFrom: t.priceFrom,
        currency: 'USD',
        durationDays: t.durationDays,
        difficulty: t.difficulty,
        groupSizeMax: t.groupSizeMax,
        maxAltitude: t.maxAltitude ?? null,
        bestSeason: t.bestSeason,
        rating: t.rating,
        reviewCount: t.reviewCount,
        badge: t.badge ?? null,
        coverImage: t.photos[0]?.[0] ?? null,
        isPublished: true,
        isFeatured: t.isFeatured,
        sortOrder: i,
        metaDescription: t.summary.slice(0, 300),
        activities: { create: t.activities.map((slug) => ({ activityId: activityIds.get(slug)! })) },
        photos: { create: t.photos.map(([url, alt], sortOrder) => ({ url, alt, sortOrder })) },
        days: {
          create: t.days.map(([dayNumber, title, body, walkHours, altitude, lodging, meals], sortOrder) => ({
            dayNumber, title, body, sortOrder,
            walkHours: walkHours || null,
            altitude: altitude || null,
            lodging: lodging || null,
            meals: meals || null,
          })),
        },
        amenities: {
          create: [
            ...t.included.map(([label, icon], idx) => ({ label, icon, included: true, sortOrder: idx })),
            ...t.excluded.map(([label, icon], idx) => ({ label, icon, included: false, sortOrder: 100 + idx })),
          ],
        },
        departures: {
          create: t.departures.map(([date, seatsTotal, seatsLeft, priceOverride]) => ({
            startDate: new Date(`${date}T06:00:00Z`),
            seatsTotal,
            seatsLeft,
            priceOverride: priceOverride ?? null,
          })),
        },
        sections: { create: sectionsFor(t) },
      },
    });
  }

  console.log('Creating pages, testimonials and settings…');
  for (const p of pages) {
    await prisma.page.create({
      data: { ...p, heroImage: p.heroImage || null, sections: JSON.stringify(p.sections), isPublished: true },
    });
  }
  for (const [i, t] of testimonials.entries()) {
    await prisma.testimonial.create({ data: { ...t, sortOrder: i, isPublished: true } });
  }
  await prisma.setting.createMany({
    data: [
      { key: 'site', value: JSON.stringify(siteSettings) },
      { key: 'home', value: JSON.stringify(homeSettings) },
    ],
  });

  const ebc = await prisma.trip.findUnique({ where: { slug: 'everest-base-camp-trek' } });
  await prisma.enquiry.createMany({
    data: [
      { name: 'Sample — Maya Thapa', email: 'maya@example.com', phone: '+977 980 000 0000', travellers: 2, preferredDate: 'Oct 2026', message: 'We would love to do EBC in October. Is a private departure possible?', tripId: ebc?.id, status: 'NEW', source: 'sample' },
      { name: 'Sample — James Carter', email: 'james@example.com', travellers: 4, preferredDate: 'Dec 2026', message: 'Family of four interested in Pokhara over Christmas.', status: 'CONTACTED', source: 'sample' },
      { name: 'Sample — Aisha Rahman', email: 'aisha@example.com', travellers: 1, message: 'Can you combine the Dubai desert safari with a stopover in Nepal?', status: 'QUOTED', source: 'sample' },
    ],
  });

  await ensureOwner();
  console.log(`Done: ${continents.length} continents, ${countries.length} countries, ${activities.length} activities, ${allTrips.length} trips, ${pages.length} pages.`);
}

/** Creates the owner account from env if it doesn't exist yet. Safe to call every time. */
async function ensureOwner() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@pdntravel.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (!existing) {
    if (!password || password.length < 12 || password.startsWith('change-me')) {
      throw new Error('Set ADMIN_PASSWORD (12+ characters) in apps/api/.env before seeding');
    }
    await prisma.adminUser.create({
      data: {
        email,
        name: process.env.ADMIN_NAME ?? 'PDN Admin',
        role: 'OWNER',
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
    console.log(`Created owner account ${email}`);
  } else {
    console.log(`Owner account ${email} already exists — password unchanged`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
