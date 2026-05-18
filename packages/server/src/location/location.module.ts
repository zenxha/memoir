import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationStore } from '../services/location-store.service';

@Module({
  controllers: [LocationController],
  providers:   [LocationStore],
  exports:     [LocationStore],
})
export class LocationModule {}
