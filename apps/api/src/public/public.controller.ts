import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EnquiryDto, SearchQueryDto, SubscribeDto, TripQueryDto } from './public.dto';
import { PublicService } from './public.service';

@Controller()
export class PublicController {
  constructor(private readonly service: PublicService) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('site')
  site() {
    return this.service.getSite();
  }

  @Get('home')
  home() {
    return this.service.getHome();
  }

  @Get('filters')
  filters() {
    return this.service.getFilters();
  }

  @Get('continents')
  continents() {
    return this.service.listContinents();
  }

  @Get('countries/:slug')
  country(@Param('slug') slug: string) {
    return this.service.getCountry(slug);
  }

  @Get('activities')
  activities() {
    return this.service.listActivities();
  }

  @Get('activities/:slug')
  activity(@Param('slug') slug: string) {
    return this.service.getActivity(slug);
  }

  @Get('trips')
  trips(@Query() query: TripQueryDto) {
    return this.service.listTrips(query);
  }

  @Get('trips/:slug')
  trip(@Param('slug') slug: string) {
    return this.service.getTrip(slug);
  }

  @Get('search')
  search(@Query() query: SearchQueryDto) {
    return this.service.search(query.q);
  }

  @Get('pages/:slug')
  page(@Param('slug') slug: string) {
    return this.service.getPage(slug);
  }

  @Get('testimonials')
  testimonials() {
    return this.service.listTestimonials();
  }

  @Post('enquiries')
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  enquire(@Body() dto: EnquiryDto) {
    return this.service.createEnquiry(dto);
  }

  @Post('newsletter')
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  subscribe(@Body() dto: SubscribeDto) {
    return this.service.subscribe(dto.email);
  }
}
