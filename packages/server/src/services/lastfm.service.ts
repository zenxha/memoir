import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import fetch from 'node-fetch';
import { EntriesService } from '../entries/entries.service';

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const API = 'https://ws.audioscrobbler.com/2.0/';

interface LfmTrack {
  name:   string;
  artist: { '#text': string };
  album:  { '#text': string };
  date?:  { uts: string };
  '@attr'?: { nowplaying?: string };
}

@Injectable()
export class LastfmService implements OnApplicationBootstrap {
  private readonly log = new Logger(LastfmService.name);
  private timer: NodeJS.Timeout | null = null;
  private lastPollTs = 0;

  constructor(private readonly entries: EntriesService) {}

  onApplicationBootstrap() {
    const apiKey  = process.env.LASTFM_API_KEY;
    const user    = process.env.LASTFM_USERNAME;
    if (!apiKey || !user) {
      this.log.log('LASTFM_API_KEY / LASTFM_USERNAME not set — polling disabled');
      return;
    }
    this.log.log(`Last.fm polling active for ${user} every 10 min`);
    this.poll(apiKey, user);
    this.timer = setInterval(() => this.poll(apiKey, user), POLL_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(apiKey: string, user: string) {
    try {
      const params = new URLSearchParams({
        method:  'user.getRecentTracks',
        user,
        api_key: apiKey,
        format:  'json',
        limit:   '50',
        ...(this.lastPollTs ? { from: String(Math.floor(this.lastPollTs / 1000)) } : {}),
      });

      const res  = await fetch(`${API}?${params}`);
      const data = await res.json() as any;
      const tracks: LfmTrack[] = data?.recenttracks?.track ?? [];
      let imported = 0;

      for (const track of tracks) {
        // Skip currently-playing (no timestamp yet)
        if (track['@attr']?.nowplaying === 'true' || !track.date) continue;

        const uts        = Number(track.date.uts);
        const externalId = `lastfm:${uts}`;

        if (this.entries.existsByExternalId(externalId)) continue;

        const loc = this.entries.nearestLocation(uts * 1000);

        await this.entries.create({
          type:         'moment',
          source:       'lastfm',
          created_at:   uts * 1000,
          music_title:  track.name,
          music_artist: track.artist['#text'],
          music_key:    `${track.artist['#text']}::${track.name}`,
          title:        track.name,
          external_id:  externalId,
          ...(loc ? { lat: loc.lat, lng: loc.lng } : {}),
        } as any);
        imported++;
      }

      if (imported) this.log.log(`Last.fm: imported ${imported} tracks`);
      this.lastPollTs = Date.now();
    } catch (err) {
      this.log.warn(`Last.fm poll failed: ${(err as Error).message}`);
    }
  }
}
