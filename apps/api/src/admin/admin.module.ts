import { Module } from '@nestjs/common';
import { PagesAdminController, SettingsAdminController, TestimonialsAdminController } from './content.controller';
import { DashboardAdminController } from './dashboard.controller';
import { EnquiriesAdminController, SubscribersAdminController } from './leads.controller';
import { MediaAdminController } from './media.controller';
import {
  ActivitiesAdminController,
  ContinentsAdminController,
  CountriesAdminController,
} from './taxonomy.controller';
import { TripsAdminController } from './trips.controller';
import { TripsAdminService } from './trips.service';
import { UsersAdminController } from './users.controller';

/** All controllers here live under /api/admin and are protected by the global AdminAuthGuard. */
@Module({
  controllers: [
    DashboardAdminController,
    ContinentsAdminController,
    CountriesAdminController,
    ActivitiesAdminController,
    TripsAdminController,
    PagesAdminController,
    TestimonialsAdminController,
    SettingsAdminController,
    EnquiriesAdminController,
    SubscribersAdminController,
    MediaAdminController,
    UsersAdminController,
  ],
  providers: [TripsAdminService],
})
export class AdminModule {}
