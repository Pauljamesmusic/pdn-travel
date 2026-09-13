import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, type SessionUser } from '../common/admin-auth.guard';
import { clientIp } from '../common/security';
import { audit } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { BulkTripsDto, TripDto, TripStatusDto } from './trips.dto';
import { type AdminTripQuery, TripsAdminService } from './trips.service';

@Controller('admin/trips')
export class TripsAdminController {
  constructor(
    private readonly trips: TripsAdminService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@Query() query: AdminTripQuery) {
    return this.trips.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.trips.get(id);
  }

  @Post()
  async create(@Body() dto: TripDto, @CurrentUser() user: SessionUser, @Req() req: Request) {
    const trip = await this.trips.create(dto);
    await audit(this.prisma, user.id, 'create', 'Trip', trip.id, clientIp(req));
    return trip;
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TripDto,
    @CurrentUser() user: SessionUser,
    @Req() req: Request,
  ) {
    const trip = await this.trips.update(id, dto);
    await audit(this.prisma, user.id, 'update', 'Trip', id, clientIp(req));
    return trip;
  }

  @Patch(':id/status')
  async status(@Param('id', ParseIntPipe) id: number, @Body() dto: TripStatusDto, @CurrentUser() user: SessionUser) {
    const trip = await this.prisma.trip.update({
      where: { id },
      data: dto,
      select: { id: true, isPublished: true, isFeatured: true },
    });
    await audit(this.prisma, user.id, 'status', 'Trip', id);
    return trip;
  }

  @Post('bulk')
  @HttpCode(200)
  async bulk(@Body() dto: BulkTripsDto, @CurrentUser() user: SessionUser) {
    const where = { id: { in: dto.ids } };
    let affected = 0;
    switch (dto.action) {
      case 'publish':
        affected = (await this.prisma.trip.updateMany({ where, data: { isPublished: true } })).count;
        break;
      case 'unpublish':
        affected = (await this.prisma.trip.updateMany({ where, data: { isPublished: false } })).count;
        break;
      case 'feature':
        affected = (await this.prisma.trip.updateMany({ where, data: { isFeatured: true } })).count;
        break;
      case 'unfeature':
        affected = (await this.prisma.trip.updateMany({ where, data: { isFeatured: false } })).count;
        break;
      case 'delete':
        affected = (await this.prisma.trip.deleteMany({ where })).count;
        break;
    }
    await audit(this.prisma, user.id, `bulk.${dto.action}`, 'Trip', dto.ids.join(','));
    return { ok: true, affected };
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    const trip = await this.trips.duplicate(id);
    await audit(this.prisma, user.id, 'duplicate', 'Trip', id);
    return trip;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser, @Req() req: Request) {
    await this.prisma.trip.delete({ where: { id } });
    await audit(this.prisma, user.id, 'delete', 'Trip', id, clientIp(req));
    return { ok: true };
  }
}
