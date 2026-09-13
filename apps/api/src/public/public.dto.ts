import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const TRIP_SORTS = ['featured', 'price-asc', 'price-desc', 'duration-asc', 'duration-desc', 'rating', 'newest'] as const;

export class TripQueryDto {
  @IsOptional() @IsString() @MaxLength(80) continent?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MaxLength(400) activity?: string; // comma separated slugs
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsString() @MaxLength(40) difficulty?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxDays?: number;
  @IsOptional() @IsIn(TRIP_SORTS as unknown as string[]) sort?: (typeof TRIP_SORTS)[number];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(48) limit?: number;
  @IsOptional() @IsString() @MaxLength(10) featured?: string;
}

export class SearchQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
}

export class EnquiryDto {
  @IsString() @Length(2, 120) name: string;
  @IsEmail() @MaxLength(200) email: string;
  @IsOptional() @Matches(/^[+\d\s().-]{6,40}$/, { message: 'Enter a valid phone number' }) phone?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) travellers?: number;
  @IsOptional() @IsString() @MaxLength(40) preferredDate?: string;
  @IsString() @Length(5, 3000) message: string;
  @IsOptional() @Type(() => Number) @IsInt() tripId?: number;
  @IsOptional() @IsString() @MaxLength(60) source?: string;
  /** Honeypot — real visitors never see or fill this field. */
  @IsOptional() @IsString() @MaxLength(200) website?: string;
}

export class SubscribeDto {
  @IsEmail() @MaxLength(200) email: string;
}
