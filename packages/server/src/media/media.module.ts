import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { WhisperService } from '../services/whisper.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService, WhisperService],
})
export class MediaModule {}
