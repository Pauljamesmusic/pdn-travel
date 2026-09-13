import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsSafeUrl } from '../common/validation';

export const DIFFICULTIES = ['Easy', 'Moderate', 'Challenging', 'Strenuous'] as const;

/**
 * Section types an admin can add to any trip page.
 *  overview   { body }                         highlights { items: string[] }
 *  itinerary  (renders the day-by-day list)    inclusions (renders included / excluded amenities)
 *  departures (renders upcoming dates)         faq        { items: {q, a}[] }
 *  list       { items: string[] }              richText   { body }
 *  gallery    { images: {url, alt}[] }         notice     { body, tone }
 */
export const SECTION_TYPES = [
  'overview',
  'highlights',
  'itinerary',
  'inclusions',
  'departures',
  'faq',
  'list',
  'richText',
  'gallery',
  'notice',
] as const;

export class TripPhotoDto {
  @IsSafeUrl() url: string;
  @IsOptional() @IsString() @MaxLength(200) alt?: string;
}

export class TripDayDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(365) dayNumber: number;
  @IsString() @Length(1, 200) title: string;
  @IsOptional() @IsString() @MaxLength(5000) body?: string;
  @IsOptional() @IsString() @MaxLength(40) walkHours?: string;
  @IsOptional() @IsString() @MaxLength(40) altitude?: string;
  @IsOptional() @IsString() @MaxLength(120) lodging?: string;
  @IsOptional() @IsString() @MaxLength(120) meals?: string;
}

export class TripAmenityDto {
  @IsString() @Length(1, 160) label: string;
  @IsOptional() @Matches(/^[a-z0-9-]{1,40}$/) icon?: string;
  @IsBoolean() included: boolean;
}

export class TripSectionDto {
  @IsIn(SECTION_TYPES as unknown as string[]) type: (typeof SECTION_TYPES)[number];
  @IsString() @MaxLength(160) title: string;
  @IsObject() content: Record<string, unknown>;
  @IsBoolean() isVisible: boolean;
}

export class DepartureDto {
  @IsDateString() startDate: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(1000) seatsTotal: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(1000) seatsLeft: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) priceOverride?: number | null;
}

export class TripDto {
  @IsString() @Length(3, 160) title: string;
  @IsOptional() @IsString() @MaxLength(80) slug?: string;
  @Type(() => Number) @IsInt() countryId: number;
  @IsOptional() @IsString() @MaxLength(120) location?: string;
  @IsString() @Length(10, 600) summary: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(10_000_000) priceFrom: number;
  @Matches(/^[A-Z]{3}$/) currency: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(365) durationDays: number;
  @IsIn(DIFFICULTIES as unknown as string[]) difficulty: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) groupSizeMax?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(9000) maxAltitude?: number | null;
  @IsOptional() @IsString() @MaxLength(120) bestSeason?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5) rating?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) reviewCount?: number;
  @IsOptional() @IsString() @MaxLength(40) badge?: string;
  @IsOptional() @IsSafeUrl() coverImage?: string | null;
  @IsBoolean() isPublished: boolean;
  @IsBoolean() isFeatured: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
  @IsOptional() @IsString() @MaxLength(160) metaTitle?: string;
  @IsOptional() @IsString() @MaxLength(320) metaDescription?: string;

  @IsArray() @ArrayMaxSize(20) @IsInt({ each: true }) activityIds: number[];

  @IsArray() @ArrayMaxSize(60) @ValidateNested({ each: true }) @Type(() => TripPhotoDto)
  photos: TripPhotoDto[];

  @IsArray() @ArrayMaxSize(120) @ValidateNested({ each: true }) @Type(() => TripDayDto)
  days: TripDayDto[];

  @IsArray() @ArrayMaxSize(80) @ValidateNested({ each: true }) @Type(() => TripAmenityDto)
  amenities: TripAmenityDto[];

  @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => TripSectionDto)
  sections: TripSectionDto[];

  @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => DepartureDto)
  departures: DepartureDto[];
}

export class TripStatusDto {
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}

export class BulkTripsDto {
  @IsArray() @ArrayMaxSize(200) @IsInt({ each: true }) ids: number[];
  @IsIn(['publish', 'unpublish', 'feature', 'unfeature', 'delete']) action: string;
}
