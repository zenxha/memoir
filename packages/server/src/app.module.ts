import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { DbModule } from './db/db.module';
import { EntriesModule } from './entries/entries.module';
import { MediaModule } from './media/media.module';
import { EventsModule } from './events/events.module';
import { BackupService } from './services/backup.service';
import { LastfmService } from './services/lastfm.service';
import { SyncthingService } from './services/syncthing.service';
import { LocationModule } from './location/location.module';
import { MusicController } from './music/music.controller';

@Module({
  imports: [
    ServeStaticModule.forRoot(
      { rootPath: path.join(__dirname, '../../desktop/dist'), serveRoot: '/desktop' },
      { rootPath: path.join(__dirname, '../../mobile/dist'),  serveRoot: '/mobile' },
    ),
    DbModule,
    EntriesModule,
    MediaModule,
    EventsModule,
    LocationModule,
  ],
  providers:   [LastfmService, SyncthingService, BackupService],
  controllers: [MusicController],
})
export class AppModule {}
