import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@memoir/contract';
import { LocationStore } from '../services/location-store.service';

@Controller()
export class LocationController {
  constructor(private readonly store: LocationStore) {}

  @TsRestHandler(contract.location.heartbeat)
  heartbeat() {
    return tsRestHandler(contract.location.heartbeat, async ({ body }) => {
      this.store.set(body.device_id ?? 'default', body.lat, body.lng);
      return { status: 204 as const, body: undefined };
    });
  }
}
