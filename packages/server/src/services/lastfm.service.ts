import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import fetch from 'node-fetch';
import { EntriesService } from '../entries/entries.service';
import { EventsGateway } from '../events/events.gateway';
import { LocationStore } from './location-store.service';

const SCROBBLE_INTERVAL_MS  = 10 * 60 * 1000; // 10 min — import finished tracks
const NOWPLAYING_INTERVAL_MS = 30 * 1000;      // 30s  — now-playing broadcast
const API = 'https://ws.audioscrobbler.com/2.0/';

interface LfmTrack {
  name:    string;
  artist:  { '#text': string };
  album:   { '#text': string };
  date?:   { uts: string };
  '@attr'?: { nowplaying?: string };
}

@Injectable()
export class LastfmService implements OnApplicationBootstrap {
  private readonly log = new Logger(LastfmService.name);
  private scrobbleTimer: NodeJS.Timeout | null = null;
  private nowTimer:      NodeJS.Timeout | null = null;
  private lastPollTs  = 0;
  nowPlaying: { title: string; artist: string } | null = null;

  constructor(
    private readonly entries: EntriesService,
    private readonly events:  EventsGateway,
    private readonly locs:    LocationStore,
  ) {}

  onApplicationBootstrap() {
    const apiKey = process.env.LASTFM_API_KEY;
    const user   = process.env.LASTFM_USERNAME;
    if (!apiKey || !user) {
      this.log.log('LASTFM_API_KEY / LASTFM_USERNAME not set — polling disabled');
      return;
    }
    this.log.log(`Last.fm polling active for ${user} every 10 min`);

    // First runs immediately
    this.importScrobbles(apiKey, user);
    this.pollNowPlaying(apiKey, user);

    this.scrobbleTimer = setInterval(() => this.importScrobbles(apiKey, user), SCROBBLE_INTERVAL_MS);
    this.nowTimer      = setInterval(() => this.pollNowPlaying(apiKey, user),  NOWPLAYING_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.scrobbleTimer) clearInterval(this.scrobbleTimer);
    if (this.nowTimer)      clearInterval(this.nowTimer);
  }

  private async pollNowPlaying(apiKey: string, user: string) {
    try {
      const params = new URLSearchParams({
        method: 'user.getRecentTracks', user, api_key: apiKey, format: 'json', limit: '1',
      });
      const data   = await (await fetch(`${API}?${params}`)).json() as any;
      const tracks: LfmTrack[] = data?.recenttracks?.track ?? [];
      const track  = tracks[0];
      const isNow  = track?.['@attr']?.nowplaying === 'true';

      const next = isNow ? { title: track.name, artist: track.artist['#text'] } : null;

      // Only broadcast when track changes
      if (JSON.stringify(next) !== JSON.stringify(this.nowPlaying)) {
        this.nowPlaying = next;
        this.events.broadcast('music:nowplaying', next);
      }
    } catch (_) { /* silent — non-critical */ }
  }

  private async importScrobbles(apiKey: string, user: string) {
    try {
      const params = new URLSearchParams({
        method: 'user.getRecentTracks', user, api_key: apiKey, format: 'json', limit: '50',
        ...(this.lastPollTs ? { from: String(Math.floor(this.lastPollTs / 1000)) } : {}),
      });

      const data   = await (await fetch(`${API}?${params}`)).json() as any;
      const tracks: LfmTrack[] = data?.recenttracks?.track ?? [];
      let imported = 0;

      for (const track of tracks) {
        if (track['@attr']?.nowplaying === 'true' || !track.date) continue;

        const uts        = Number(track.date.uts);
        const externalId = `lastfm:${uts}`;
        if (this.entries.existsByExternalId(externalId)) continue;

        // Location: check live heartbeat first (±10 min), fall back to entries (±30 min)
        const loc = this.locs.nearest(uts * 1000) ?? this.entries.nearestLocation(uts * 1000);

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
