import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CurrentUser, type SessionUser } from '../common/admin-auth.guard';
import { audit, parseJson, slugify } from '../common/utils';
import { IsSafeUrl } from '../common/validation';
import { PrismaService } from '../prisma/prisma.service';

const MAX_PAGE_BYTES = 250_000;
export const SETTING_KEYS = ['site', 'home'] as const;

class PageDto {
  @IsString() @Length(1, 160) title: string;
  @IsOptional() @IsString() @MaxLength(80) slug?: string;
  @IsOptional() @IsString() @MaxLength(80) eyebrow?: string;
  @IsOptional() @IsString() @MaxLength(400) subtitle?: string;
  @IsOptional() @IsSafeUrl() heroImage?: string | null;
  // @Type(() => Object) matters here: without it, class-transformer's implicit conversion (main.ts's
  // enableImplicitConversion) reflects this property's own design:type (Array) and mistakenly reuses it
  // as the target type for each array ELEMENT too, turning every block object into an empty array.
  @IsArray() @ArrayMaxSize(60) @Type(() => Object) @IsObject({ each: true }) sections: Record<string, unknown>[];
  @IsBoolean() isPublished: boolean;
  @IsOptional() @IsIn(['support', 'none']) navGroup?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
  @IsOptional() @IsString() @MaxLength(320) metaDescription?: string;
}

class TestimonialDto {
  @IsString() @Length(1, 120) name: string;
  @IsOptional() @IsString() @MaxLength(120) location?: string;
  @IsOptional() @IsString() @MaxLength(160) trip?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating: number;
  @IsString() @Length(5, 2000) quote: string;
  @IsOptional() @IsSafeUrl() avatar?: string | null;
  @IsBoolean() isPublished: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

class SettingDto {
  @IsObject() value: Record<string, unknown>;
}

@Controller('admin/pages')
export class PagesAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.page.findMany({
      orderBy: [{ navGroup: 'desc' }, { sortOrder: 'asc' }],
      select: { id: true, slug: true, title: true, isPublished: true, navGroup: true, sortOrder: true, updatedAt: true },
    });
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');
    return { ...page, sections: parseJson(page.sections, []) };
  }

  private data(dto: PageDto) {
    const sections = JSON.stringify(dto.sections);
    if (sections.length > MAX_PAGE_BYTES) throw new BadRequestException('This page has too much content');
    return {
      title: dto.title.trim(),
      slug: slugify(dto.slug || dto.title),
      eyebrow: dto.eyebrow?.trim() || null,
      subtitle: dto.subtitle?.trim() || null,
      heroImage: dto.heroImage || null,
      sections,
      isPublished: dto.isPublished,
      navGroup: dto.navGroup === 'support' ? 'support' : null,
      sortOrder: dto.sortOrder ?? 0,
      metaDescription: dto.metaDescription?.trim() || null,
    };
  }

  @Post()
  async create(@Body() dto: PageDto, @CurrentUser() user: SessionUser) {
    const page = await this.prisma.page.create({ data: this.data(dto) });
    await audit(this.prisma, user.id, 'create', 'Page', page.id);
    return page;
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: PageDto, @CurrentUser() user: SessionUser) {
    const page = await this.prisma.page.update({ where: { id }, data: this.data(dto) });
    await audit(this.prisma, user.id, 'update', 'Page', id);
    return { ...page, sections: parseJson(page.sections, []) };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    await this.prisma.page.delete({ where: { id } });
    await audit(this.prisma, user.id, 'delete', 'Page', id);
    return { ok: true };
  }
}

@Controller('admin/testimonials')
export class TestimonialsAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.testimonial.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
  }

  @Post()
  async create(@Body() dto: TestimonialDto, @CurrentUser() user: SessionUser) {
    const row = await this.prisma.testimonial.create({ data: { ...dto, avatar: dto.avatar || null } });
    await audit(this.prisma, user.id, 'create', 'Testimonial', row.id);
    return row;
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: TestimonialDto, @CurrentUser() user: SessionUser) {
    const row = await this.prisma.testimonial.update({ where: { id }, data: { ...dto, avatar: dto.avatar || null } });
    await audit(this.prisma, user.id, 'update', 'Testimonial', id);
    return row;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    await this.prisma.testimonial.delete({ where: { id } });
    await audit(this.prisma, user.id, 'delete', 'Testimonial', id);
    return { ok: true };
  }
}

@Controller('admin/settings')
export class SettingsAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async all() {
    const rows = await this.prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, parseJson(r.value, {})]));
  }

  @Put(':key')
  async save(@Param('key') key: string, @Body() dto: SettingDto, @CurrentUser() user: SessionUser) {
    if (!(SETTING_KEYS as readonly string[]).includes(key)) throw new NotFoundException('Unknown setting');
    const value = JSON.stringify(dto.value);
    if (value.length > 150_000) throw new BadRequestException('Settings are too large');
    await this.prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    await audit(this.prisma, user.id, 'update', 'Setting', key);
    return { ok: true, value: dto.value };
  }
}
