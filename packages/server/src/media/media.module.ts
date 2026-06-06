import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { DiskMediaStore } from './disk-media-store';
import { WhisperService } from '../services/whisper.service';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    WhisperService,
    { provide: 'MediaStore', useClass: DiskMediaStore },
  ],
})
export class MediaModule {}
