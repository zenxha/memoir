import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@memoir/contract';
import { LastfmService } from '../services/lastfm.service';

@Controller()
export class MusicController {
  constructor(private readonly lastfm: LastfmService) {}

  @TsRestHandler(contract.music.nowPlaying)
  nowPlaying() {
    return tsRestHandler(contract.music.nowPlaying, async () => ({
      status: 200 as const,
      body: this.lastfm.nowPlaying,
    }));
  }
}
