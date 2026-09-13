import { Body, Controller, Delete, Get, Header, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, type SessionUser } from '../common/admin-auth.guard';
import { audit } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';

export const ENQUIRY_STATUSES = ['NEW', 'CONTACTED', 'QUOTED', 'BOOKED', 'LOST'] as const;

class EnquiryUpdateDto {
  @IsOptional() @IsIn(ENQUIRY_STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

interface EnquiryQuery {
  status?: string;
  q?: string;
  page?: string;
  from?: string;
  to?: string;
}

/** Prevents spreadsheet formula injection when admins open the export. */
function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

@Controller('admin/enquiries')
export class EnquiriesAdminController {
  constructor(private readonly prisma: PrismaService) {}

  private where(query: EnquiryQuery): Prisma.EnquiryWhereInput {
    const and: Prisma.EnquiryWhereInput[] = [];
    if (query.status && (ENQUIRY_STATUSES as readonly string[]).includes(query.status)) and.push({ status: query.status });
    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({ OR: [{ name: { contains: q } }, { email: { contains: q } }, { message: { contains: q } }] });
    }
    // Parse both bounds as UTC — a bare date is already UTC, but a date-time string with no
    // offset parses as local server time, which would shift the "to" cutoff relative to "from".
    if (query.from) and.push({ createdAt: { gte: new Date(`${query.from}T00:00:00Z`) } });
    if (query.to) and.push({ createdAt: { lte: new Date(`${query.to}T23:59:59Z`) } });
    return and.length ? { AND: and } : {};
  }

  @Get()
  async list(@Query() query: EnquiryQuery) {
    const where = this.where(query);
    const pageSize = 25;
    const page = Math.max(Number(query.page) || 1, 1);
    const [total, items, counts] = await Promise.all([
      this.prisma.enquiry.count({ where }),
      this.prisma.enquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { trip: { select: { id: true, title: true, slug: true } } },
      }),
      this.prisma.enquiry.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return {
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
      items,
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    };
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="pdn-enquiries.csv"')
  async export(@Query() query: EnquiryQuery) {
    const rows = await this.prisma.enquiry.findMany({
      where: this.where(query),
      orderBy: { createdAt: 'desc' },
      include: { trip: { select: { title: true } } },
      take: 5000,
    });
    const header = ['Reference', 'Received', 'Status', 'Name', 'Email', 'Phone', 'Trip', 'Travellers', 'Preferred date', 'Message', 'Notes'];
    const lines = rows.map((r) =>
      [
        `PDN-${String(r.id).padStart(5, '0')}`,
        r.createdAt.toISOString(),
        r.status,
        r.name,
        r.email,
        r.phone,
        r.trip?.title,
        r.travellers,
        r.preferredDate,
        r.message,
        r.notes,
      ]
        .map(csvCell)
        .join(','),
    );
    return [header.map(csvCell).join(','), ...lines].join('\r\n');
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: EnquiryUpdateDto, @CurrentUser() user: SessionUser) {
    const row = await this.prisma.enquiry.update({ where: { id }, data: dto });
    await audit(this.prisma, user.id, 'update', 'Enquiry', id);
    return row;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    await this.prisma.enquiry.delete({ where: { id } });
    await audit(this.prisma, user.id, 'delete', 'Enquiry', id);
    return { ok: true };
  }
}

@Controller('admin/subscribers')
export class SubscribersAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' }, take: 2000 });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    await this.prisma.subscriber.delete({ where: { id } });
    await audit(this.prisma, user.id, 'delete', 'Subscriber', id);
    return { ok: true };
  }
}
