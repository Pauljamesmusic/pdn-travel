import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import type { Request } from 'express';
import { CurrentUser, type SessionUser } from '../common/admin-auth.guard';
import { clientIp } from '../common/security';
import { audit, slugify } from '../common/utils';
import { IsSafeUrl } from '../common/validation';
import { PrismaService } from '../prisma/prisma.service';

class ContinentDto {
  @IsString() @Length(1, 80) name: string;
  @IsOptional() @IsString() @MaxLength(80) slug?: string;
  @IsOptional() @IsString() @MaxLength(120) tagline?: string;
  @IsOptional() @IsSafeUrl() image?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

class CountryDto {
  @IsString() @Length(1, 80) name: string;
  @IsOptional() @IsString() @MaxLength(80) slug?: string;
  @Type(() => Number) @IsInt() continentId: number;
  @IsOptional() @IsString() @MaxLength(60) region?: string;
  @IsOptional() @IsString() @MaxLength(2000) summary?: string;
  @IsOptional() @IsString() @MaxLength(120) highlight?: string;
  @IsOptional() @IsSafeUrl() image?: string;
  @IsOptional() @IsSafeUrl() heroImage?: string;
  @IsOptional() @IsString() @MaxLength(60) currency?: string;
  @IsOptional() @IsString() @MaxLength(80) language?: string;
  @IsOptional() @IsString() @MaxLength(120) bestSeason?: string;
  @IsOptional() @IsString() @MaxLength(500) visaNote?: string;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

class ActivityDto {
  @IsString() @Length(1, 60) name: string;
  @IsOptional() @IsString() @MaxLength(80) slug?: string;
  @IsOptional() @Matches(/^[a-z0-9-]{1,40}$/, { message: 'Pick an icon from the list' }) icon?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsSafeUrl() image?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

class ReorderDto {
  @IsArray() @ArrayMaxSize(500) @IsInt({ each: true }) ids: number[];
}

const clean = <T extends object>(dto: T) =>
  Object.fromEntries(Object.entries(dto).map(([k, v]) => [k, v === '' ? null : v])) as T;

@Controller('admin/continents')
export class ContinentsAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.continent.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { countries: true } } },
    });
  }

  @Post()
  async create(@Body() dto: ContinentDto, @CurrentUser() user: SessionUser, @Req() req: Request) {
    const max = await this.prisma.continent.aggregate({ _max: { sortOrder: true } });
    const row = await this.prisma.continent.create({
      data: { ...clean(dto), slug: slugify(dto.slug || dto.name), sortOrder: dto.sortOrder ?? (max._max.sortOrder ?? 0) + 1 },
    });
    await audit(this.prisma, user.id, 'create', 'Continent', row.id, clientIp(req));
    return row;
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: ContinentDto, @CurrentUser() user: SessionUser) {
    const row = await this.prisma.continent.update({
      where: { id },
      data: { ...clean(dto), slug: slugify(dto.slug || dto.name) },
    });
    await audit(this.prisma, user.id, 'update', 'Continent', id);
    return row;
  }

  @Post('reorder')
  @HttpCode(200)
  async reorder(@Body() dto: ReorderDto, @CurrentUser() user: SessionUser) {
    await this.prisma.$transaction(
      dto.ids.map((id, index) => this.prisma.continent.update({ where: { id }, data: { sortOrder: index } })),
    );
    await audit(this.prisma, user.id, 'reorder', 'Continent', dto.ids.join(','));
    return { ok: true };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    const count = await this.prisma.country.count({ where: { continentId: id } });
    if (count > 0) {
      throw new ConflictException(
        `This continent still has ${count} ${count === 1 ? 'country' : 'countries'}. Move or delete them first.`,
      );
    }
    await this.prisma.continent.delete({ where: { id } });
    await audit(this.prisma, user.id, 'delete', 'Continent', id);
    return { ok: true };
  }
}

@Controller('admin/countries')
export class CountriesAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query('continentId') continentId?: string) {
    return this.prisma.country.findMany({
      where: continentId ? { continentId: Number(continentId) } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { continent: { select: { id: true, name: true } }, _count: { select: { trips: true } } },
    });
  }

  @Post()
  async create(@Body() dto: CountryDto, @CurrentUser() user: SessionUser) {
    const max = await this.prisma.country.aggregate({ _max: { sortOrder: true } });
    const row = await this.prisma.country.create({
      data: { ...clean(dto), slug: slugify(dto.slug || dto.name), sortOrder: dto.sortOrder ?? (max._max.sortOrder ?? 0) + 1 },
    });
    await audit(this.prisma, user.id, 'create', 'Country', row.id);
    return row;
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: CountryDto, @CurrentUser() user: SessionUser) {
    const row = await this.prisma.country.update({
      where: { id },
      data: { ...clean(dto), slug: slugify(dto.slug || dto.name) },
    });
    await audit(this.prisma, user.id, 'update', 'Country', id);
    return row;
  }

  @Post('reorder')
  @HttpCode(200)
  async reorder(@Body() dto: ReorderDto, @CurrentUser() user: SessionUser) {
    await this.prisma.$transaction(
      dto.ids.map((id, index) => this.prisma.country.update({ where: { id }, data: { sortOrder: index } })),
    );
    await audit(this.prisma, user.id, 'reorder', 'Country', dto.ids.join(','));
    return { ok: true };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    const count = await this.prisma.trip.count({ where: { countryId: id } });
    if (count > 0) {
      throw new ConflictException(
        `${count} ${count === 1 ? 'trip still uses' : 'trips still use'} this country. Reassign or delete ${count === 1 ? 'it' : 'them'} first.`,
      );
    }
    await this.prisma.country.delete({ where: { id } });
    await audit(this.prisma, user.id, 'delete', 'Country', id);
    return { ok: true };
  }
}

@Controller('admin/activities')
export class ActivitiesAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.activityTag.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { trips: true } } },
    });
  }

  @Post()
  async create(@Body() dto: ActivityDto, @CurrentUser() user: SessionUser) {
    const max = await this.prisma.activityTag.aggregate({ _max: { sortOrder: true } });
    const row = await this.prisma.activityTag.create({
      data: {
        ...clean(dto),
        icon: dto.icon || 'compass',
        slug: slugify(dto.slug || dto.name),
        sortOrder: dto.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
      },
    });
    await audit(this.prisma, user.id, 'create', 'ActivityTag', row.id);
    return row;
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: ActivityDto, @CurrentUser() user: SessionUser) {
    const row = await this.prisma.activityTag.update({
      where: { id },
      data: { ...clean(dto), icon: dto.icon || 'compass', slug: slugify(dto.slug || dto.name) },
    });
    await audit(this.prisma, user.id, 'update', 'ActivityTag', id);
    return row;
  }

  @Post('reorder')
  @HttpCode(200)
  async reorder(@Body() dto: ReorderDto, @CurrentUser() user: SessionUser) {
    await this.prisma.$transaction(
      dto.ids.map((id, index) => this.prisma.activityTag.update({ where: { id }, data: { sortOrder: index } })),
    );
    await audit(this.prisma, user.id, 'reorder', 'ActivityTag', dto.ids.join(','));
    return { ok: true };
  }

  /** Deleting a tag only unassigns it from trips — it never deletes trips. */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    const unassigned = await this.prisma.tripActivity.count({ where: { activityId: id } });
    await this.prisma.activityTag.delete({ where: { id } });
    await audit(this.prisma, user.id, 'delete', 'ActivityTag', id);
    return { ok: true, unassigned };
  }
}
