import { Controller, Post, Get, Param, Res, UploadedFile, UseInterceptors, Body, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { Response } from 'express';
import { MediaService } from './media.service';

const MEDIA_DIR = path.join(__dirname, '../../data/media');

@Controller('api/media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: MEDIA_DIR,
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '';
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: 500 * 1024 * 1024 },
  }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('entryId') entryId?: string,
  ) {
    return this.media.processUpload(file, entryId);
  }

  @Get(':filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    if (!this.media.exists(filename)) throw new NotFoundException();
    res.sendFile(this.media.getFilePath(filename));
  }
}
