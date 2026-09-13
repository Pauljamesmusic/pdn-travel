import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, Roles, type SessionUser } from '../common/admin-auth.guard';
import { audit } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';

class CreateUserDto {
  @IsEmail() @MaxLength(200) email: string;
  @IsString() @Length(1, 120) name: string;
  @IsIn(['OWNER', 'EDITOR']) role: string;
  @IsString() @MinLength(12, { message: 'Use at least 12 characters' }) @MaxLength(200) password: string;
}

class UpdateUserDto {
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @IsIn(['OWNER', 'EDITOR']) role?: string;
  @IsOptional() @IsString() @MinLength(12) @MaxLength(200) password?: string;
}

const publicFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  totpEnabled: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

@Controller('admin/users')
export class UsersAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.adminUser.findMany({ select: publicFields, orderBy: { createdAt: 'asc' } });
  }

  @Get('audit')
  @Roles('OWNER')
  auditLog() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { name: true, email: true } } },
    });
  }

  @Post()
  @Roles('OWNER')
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: SessionUser) {
    const created = await this.prisma.adminUser.create({
      data: {
        email: dto.email.trim().toLowerCase(),
        name: dto.name.trim(),
        role: dto.role,
        passwordHash: await bcrypt.hash(dto.password, 12),
      },
      select: publicFields,
    });
    await audit(this.prisma, user.id, 'create', 'AdminUser', created.id);
    return created;
  }

  @Patch(':id')
  @Roles('OWNER')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @CurrentUser() user: SessionUser) {
    if (dto.role === 'EDITOR') await this.ensureAnotherOwner(id);
    const updated = await this.prisma.adminUser.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
        ...(dto.password
          ? { passwordHash: await bcrypt.hash(dto.password, 12), tokenVersion: { increment: 1 } }
          : {}),
      },
      select: publicFields,
    });
    await audit(this.prisma, user.id, 'update', 'AdminUser', id);
    return updated;
  }

  @Delete(':id')
  @Roles('OWNER')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    if (id === user.id) throw new BadRequestException('You cannot delete your own account');
    await this.ensureAnotherOwner(id);
    await this.prisma.adminUser.delete({ where: { id } });
    await audit(this.prisma, user.id, 'delete', 'AdminUser', id);
    return { ok: true };
  }

  private async ensureAnotherOwner(id: number) {
    const target = await this.prisma.adminUser.findUniqueOrThrow({ where: { id } });
    if (target.role !== 'OWNER') return;
    const owners = await this.prisma.adminUser.count({ where: { role: 'OWNER' } });
    if (owners <= 1) throw new BadRequestException('There must always be at least one owner');
  }
}
