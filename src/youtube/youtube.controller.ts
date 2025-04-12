import { Controller, Get, Post, Query, Res, HttpStatus, Logger } from "@nestjs/common";
import { Response } from "express";
import { YoutubeService } from "./youtube.service";

@Controller('youtube')
export class YoutubeController {
    private readonly logger = new Logger(YoutubeController.name);
    constructor(private readonly youtubeService: YoutubeService) {}

    @Get('health')
    async getHealth(@Query('url') url: string) {
        return {message: "OK"};
    }

    @Get('info')
    async getVideoInfo(@Query('url') url: string) {
        return this.youtubeService.getVideoInfo(url);
    }

    @Get('download')
    async downloadVideo(
        @Query('url') url: string,
        @Query('format') format: string,
        @Query('type') type: 'video' | 'audio',
        @Res() res: Response
    ) {
        this.logger.log(`Received download request. URL: ${url}, Format: ${format}, Type: ${type}`);
    
        try {
          const { stream, info, cleanup } = await this.youtubeService.downloadVideo(url, format, type);
          
          // Set headers for file download
          res.setHeader('Content-Disposition', `attachment; filename="${info.filename}"`);
          res.setHeader('Content-Type', info.contentType);
          
          // Pipe the download stream to response
          stream.pipe(res);
          
          // Clean up temp file after response completes
          res.on('finish', () => {
            this.logger.log('Download response completed');
            cleanup();
          });
          
          res.on('error', (err) => {
            this.logger.error(`Error during download response: ${err.message}`);
            cleanup();
          });
        } catch (error) {
          this.logger.error(`Download error: ${error.message}`);
          
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: error.message || 'Failed to download video',
          });
        } 
    }
}