import { Controller, Get } from '@nestjs/common';
import { startOfUtcDay } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/dashboard')
export class DashboardAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async overview() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const todayUtc = startOfUtcDay(now);

    const [
      liveTrips,
      draftTrips,
      liveTripsLastMonth,
      countries,
      activityTags,
      enquiriesThisMonth,
      enquiriesLastMonth,
      newEnquiries,
      subscribers,
      recentEnquiries,
      noPhotos,
      noItinerary,
      noDepartures,
      soldOut,
      emptyCountries,
      unusedTags,
      recentActivity,
    ] = await Promise.all([
      this.prisma.trip.count({ where: { isPublished: true } }),
      this.prisma.trip.count({ where: { isPublished: false } }),
      this.prisma.trip.count({ where: { isPublished: true, createdAt: { lt: monthStart } } }),
      this.prisma.country.count(),
      this.prisma.activityTag.count(),
      this.prisma.enquiry.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.enquiry.count({ where: { createdAt: { gte: lastMonthStart, lt: monthStart } } }),
      this.prisma.enquiry.count({ where: { status: 'NEW' } }),
      this.prisma.subscriber.count(),
      this.prisma.enquiry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { trip: { select: { title: true } } },
      }),
      this.prisma.trip.findMany({
        where: { coverImage: null, photos: { none: {} } },
        select: { id: true, title: true },
        take: 10,
      }),
      this.prisma.trip.findMany({ where: { days: { none: {} } }, select: { id: true, title: true }, take: 10 }),
      this.prisma.trip.findMany({
        where: { isPublished: true, departures: { none: { startDate: { gte: todayUtc } } } },
        select: { id: true, title: true },
        take: 10,
      }),
      this.prisma.departure.findMany({
        where: { seatsLeft: 0, startDate: { gte: todayUtc } },
        select: { id: true, startDate: true, trip: { select: { id: true, title: true } } },
        take: 10,
      }),
      this.prisma.country.findMany({ where: { trips: { none: {} } }, select: { id: true, name: true }, take: 10 }),
      this.prisma.activityTag.findMany({ where: { trips: { none: {} } }, select: { id: true, name: true }, take: 10 }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { user: { select: { name: true } } },
      }),
    ]);

    const attention = [
      ...noPhotos.map((t) => ({ kind: 'trip', id: t.id, label: t.title, issue: 'Has no photos' })),
      ...noItinerary.map((t) => ({ kind: 'trip', id: t.id, label: t.title, issue: 'Has no itinerary days' })),
      ...noDepartures.map((t) => ({ kind: 'trip', id: t.id, label: t.title, issue: 'No upcoming departure dates' })),
      ...soldOut.map((d) => ({
        kind: 'trip',
        id: d.trip.id,
        label: d.trip.title,
        issue: `Sold out on ${d.startDate.toISOString().slice(0, 10)}`,
      })),
      ...emptyCountries.map((c) => ({ kind: 'country', id: c.id, label: c.name, issue: 'Country has no trips yet' })),
      ...unusedTags.map((a) => ({ kind: 'activity', id: a.id, label: a.name, issue: 'Activity tag is not used' })),
    ];

    return {
      stats: {
        liveTrips,
        liveTripsDelta: liveTrips - liveTripsLastMonth,
        draftTrips,
        countries,
        activityTags,
        enquiriesThisMonth,
        enquiriesDelta: enquiriesThisMonth - enquiriesLastMonth,
        newEnquiries,
        subscribers,
      },
      recentEnquiries,
      attention,
      recentActivity,
    };
  }
}
