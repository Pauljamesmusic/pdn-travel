import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IsString, MaxLength } from 'class-validator';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { memoryStorage } from 'multer';
import { join } from 'path';
import sharp from 'sharp';
import { CurrentUser, type SessionUser } from '../common/admin-auth.guard';
import { uploadsDir } from '../common/security';
import { audit } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const MAX_BYTES = 15 * 1024 * 1024;
const MAX_WIDTH = 2400;

function reencode(buffer: Buffer) {
  return sharp(buffer, { failOn: 'error', limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
}

class MediaUpdateDto {
  @IsString() @MaxLength(200) alt: string;
}

@Controller('admin/media')
export class MediaAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query('q') q?: string) {
    const term = q?.trim().slice(0, 200);
    return this.prisma.media.findMany({
      where: term ? { OR: [{ filename: { contains: term } }, { alt: { contains: term } }] } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_BYTES, files: 20 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_TYPES.has(file.mimetype)) {
          return cb(new BadRequestException(`${file.originalname}: only JPG, PNG, WebP, AVIF or GIF images`), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFiles() files: Express.Multer.File[], @CurrentUser() user: SessionUser) {
    if (!files?.length) throw new BadRequestException('Choose at least one image');

    const now = new Date();
    const folder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dir = join(uploadsDir(), folder);
    await mkdir(dir, { recursive: true });

    const saved = [];
    for (const file of files) {
      // Re-encoding through sharp proves the file really is an image and strips any embedded payloads/metadata.
      let output: Awaited<ReturnType<typeof reencode>>;
      try {
        output = await reencode(file.buffer);
      } catch {
        throw new BadRequestException(`${file.originalname} could not be read as an image`);
      }
      const name = `${randomUUID()}.webp`;
      await writeFile(join(dir, name), output.data);
      const alt = file.originalname.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 120);
      const media = await this.prisma.media.create({
        data: {
          filename: file.originalname.slice(0, 200),
          url: `/uploads/${folder}/${name}`,
          mimeType: 'image/webp',
          size: output.info.size,
          width: output.info.width,
          height: output.info.height,
          alt,
        },
      });
      saved.push(media);
    }
    await audit(this.prisma, user.id, 'upload', 'Media', saved.map((m) => m.id).join(','));
    return saved;
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: MediaUpdateDto, @CurrentUser() user: SessionUser) {
    const media = await this.prisma.media.update({ where: { id }, data: { alt: dto.alt } });
    await audit(this.prisma, user.id, 'update', 'Media', id);
    return media;
  }

  @Get(':id/usage')
  async usage(@Param('id', ParseIntPipe) id: number) {
    const media = await this.prisma.media.findUniqueOrThrow({ where: { id } });
    return this.findUsage(media.url);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    const media = await this.prisma.media.findUniqueOrThrow({ where: { id } });
    const usage = await this.findUsage(media.url);
    if (usage.length) {
      throw new ConflictException(`This image is still used in: ${usage.slice(0, 5).join(', ')}${usage.length > 5 ? '…' : ''}`);
    }
    await this.prisma.media.delete({ where: { id } });
    if (media.url.startsWith('/uploads/')) {
      await unlink(join(uploadsDir(), media.url.replace(/^\/uploads\//, ''))).catch(() => undefined);
    }
    await audit(this.prisma, user.id, 'delete', 'Media', id);
    return { ok: true };
  }

  private async findUsage(url: string): Promise<string[]> {
    const [trips, photos, sections, countries, continents, activities, pages, testimonials, settings] = await Promise.all([
      this.prisma.trip.findMany({ where: { coverImage: url }, select: { title: true } }),
      this.prisma.tripPhoto.findMany({ where: { url }, select: { trip: { select: { title: true } } } }),
      this.prisma.tripSection.findMany({ where: { content: { contains: url } }, select: { trip: { select: { title: true } } } }),
      this.prisma.country.findMany({ where: { OR: [{ image: url }, { heroImage: url }] }, select: { name: true } }),
      this.prisma.continent.findMany({ where: { image: url }, select: { name: true } }),
      this.prisma.activityTag.findMany({ where: { image: url }, select: { name: true } }),
      this.prisma.page.findMany({ where: { OR: [{ heroImage: url }, { sections: { contains: url } }] }, select: { title: true } }),
      this.prisma.testimonial.findMany({ where: { avatar: url }, select: { name: true } }),
      this.prisma.setting.findMany({ where: { value: { contains: url } }, select: { key: true } }),
    ]);
    const names = [
      ...trips.map((t) => `Trip “${t.title}”`),
      ...photos.map((p) => `Trip “${p.trip.title}” gallery`),
      ...sections.map((s) => `Trip “${s.trip.title}” section`),
      ...countries.map((c) => `Country ${c.name}`),
      ...continents.map((c) => `Continent ${c.name}`),
      ...activities.map((a) => `Activity ${a.name}`),
      ...pages.map((p) => `Page “${p.title}”`),
      ...testimonials.map((t) => `Testimonial by ${t.name}`),
      ...settings.map((s) => `${s.key} settings`),
    ];
    return [...new Set(names)];
  }
}
