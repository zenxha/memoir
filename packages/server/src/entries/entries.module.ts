import { Module } from '@nestjs/common';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';
import { GeocoderService } from '../services/geocoder.service';
import { WeatherService } from '../services/weather.service';
import { EmbeddingService } from '../services/embedding.service';

@Module({
  controllers: [EntriesController],
  providers: [EntriesService, GeocoderService, WeatherService, EmbeddingService],
  exports: [EntriesService, EmbeddingService],
})
export class EntriesModule {}
