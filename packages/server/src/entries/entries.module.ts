import { Module } from '@nestjs/common';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';
import { GeocoderService } from '../services/geocoder.service';
import { WeatherService } from '../services/weather.service';

@Module({
  controllers: [EntriesController],
  providers: [EntriesService, GeocoderService, WeatherService],
  exports: [EntriesService],
})
export class EntriesModule {}
