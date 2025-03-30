import { Injectable, HttpException, HttpStatus, Logger} from "@nestjs/common";
import * as youtubeDlExec from 'youtube-dl-exec';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import * as path from 'path';
import { promisify } from "util";
import { pipeline } from "stream";
import { exec } from "child_process";

const execAsync = promisify(exec);
const pipelineAsync = promisify(pipeline);


@Injectable()
export class YoutubeService {
    private readonly logger = new Logger(YoutubeService.name);
    private readonly tempDir = path.join(process.cwd(), 'temp');
    constructor() {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, {recursive: true});
      }
    }

    async getVideoInfo(url: string) {
      try {
        this.logger.log(`Fetching info for URL: ${url}`);
        console.log(youtubeDlExec);
        // Use youtube-dl-exec to get video info
        // The dumpSingleJson option returns all info as a JSON object
        const output: any = await youtubeDlExec.youtubeDl(url, {
          dumpSingleJson: true,
          noWarnings: true,
          callHome: true,
          noCheckCertificates: true,
          preferFreeFormats: true,
          youtubeSkipDashManifest: true,
        });
        
        this.logger.log(`Successfully retrieved info for video: ${output}`);
        return {
          title: output.title,
          duration: output.duration,
          thumbnail: output.thumbnail,
          formats: output.formats
            .filter(format => 
              // Filter out formats without audio
              format.acodec !== 'none' && 
              // Keep only formats with reasonable file extensions
              ['mp4', 'webm', 'm4a', 'mp3', 'ogg', 'wav'].includes(format.ext))
            .map(format => ({
              itag: format.format_id,
              quality: format.height ? `${format.height}p` : (format.quality || 'unknown'),
              mimeType: `${format.vcodec !== 'none' ? 'video' : 'audio'}/${format.ext}`,
              container: format.ext,
              hasVideo: format.vcodec !== 'none',
              hasAudio: format.acodec !== 'none',
              filesize: format.filesize || 'unknown',
            })),
        };
      } catch (error) {
        this.logger.error(`Error fetching video info: ${error.message}`, error.stack);
        
        // Provide detailed error information
        throw new HttpException(
          {
            message: 'Failed to fetch video info',
            error: error.message,
            details: error.stack,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    // async downloadVideo(url: string, formatId: string, type: 'video' | 'audio' = 'video') {
    //   try {
    //     this.logger.log(`Starting download for URL: ${url}, Format: ${formatId}, Type: ${type}`);
        
    //     // Validate URL - ensures it's a valid YouTube URL
    //     if (!url.includes('youtube.com/watch?v=') && !url.includes('youtu.be/')) {
    //       throw new HttpException('Invalid YouTube URL', HttpStatus.BAD_REQUEST);
    //     }
        
    //     // Get video ID from URL
    //     const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    //     if (!videoIdMatch) {
    //       throw new HttpException('Could not extract video ID from URL', HttpStatus.BAD_REQUEST);
    //     }
    //     const videoId = videoIdMatch[1];
        
    //     // Clean URL to avoid issues
    //     const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
    //     this.logger.log(`Cleaned URL: ${cleanUrl}`);
        
    //     // Create a unique directory for this download
    //     const timestamp = Date.now();
    //     const downloadDir = path.join(this.tempDir, `download_${timestamp}`);
    //     fs.mkdirSync(downloadDir, { recursive: true });
        
    //     // Get video info for title
    //     const info: any = await youtubeDlExec.youtubeDl(cleanUrl, {
    //       dumpSingleJson: true,
    //       skipDownload: true,
    //     });
        
    //     // Clean the title to create a safe filename
    //     const safeTitle = info.title
    //       .replace(/[^\w\s.-]/g, '') // Remove any characters except alphanumeric, spaces, dots, and hyphens
    //       .replace(/\s+/g, '_');
        
    //     // Using the full path to yt-dlp from node_modules to avoid PATH issues
    //     const ytdlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
        
    //     // Use a base filename without extension
    //     const baseOutputFilename = path.join(downloadDir, 'video');
        
    //     let command;
    //     if (type === 'audio') {
    //       command = `"${ytdlpPath}" -f "bestaudio" -x --audio-format mp3 --audio-quality 0 --max-filesize 100M -o "${baseOutputFilename}" "${cleanUrl}"`;
    //     } else {
    //       // Limit video quality to 720p and file size to 500MB
    //       command = `"${ytdlpPath}" -f "bestvideo[height<=720]+bestaudio/best[height<=720]" --max-filesize 500M -o "${baseOutputFilename}" "${cleanUrl}"`;
    //     }
        
    //     this.logger.log(`Executing command: ${command}`);
        
    //     // Execute yt-dlp directly
    //     await execAsync(command);
        
    //     // List files in the directory to find what was downloaded
    //     const files = fs.readdirSync(downloadDir);
    //     this.logger.log(`Files in download directory: ${files.join(', ')}`);
        
    //     if (files.length === 0) {
    //       throw new Error('Download completed but no files found');
    //     }
        
    //     // Use the first file found
    //     const downloadedFilename = files[0];
    //     const outputFilename = path.join(downloadDir, downloadedFilename);
    //     this.logger.log(`Using downloaded file: ${outputFilename}`);
        
    //     // Get file extension for content type
    //     const ext = path.extname(outputFilename).substring(1);
        
    //     // Determine the correct content type
    //     let contentType;
    //     if (type === 'audio') {
    //       contentType = 'audio/mp3';
    //     } else {
    //       switch (ext) {
    //         case 'mp4':
    //           contentType = 'video/mp4';
    //           break;
    //         case 'webm':
    //           contentType = 'video/webm';
    //           break;
    //         case 'mkv':
    //           contentType = 'video/x-matroska';
    //           break;
    //         default:
    //           contentType = `video/${ext}`;
    //       }
    //     }
        
    //     this.logger.log(`Download completed successfully: ${outputFilename}`);
        
    //     // Return file info and stream
    //     return {
    //       stream: createReadStream(outputFilename),
    //       info: {
    //         title: info.title,
    //         contentType,
    //         filename: `${safeTitle}.${ext}`,
    //       },
    //       cleanup: () => {
    //         // Remove the entire directory
    //         try {
    //           fs.rmSync(downloadDir, { recursive: true, force: true });
    //           this.logger.log(`Cleaned up download directory: ${downloadDir}`);
    //         } catch (err) {
    //           this.logger.error(`Failed to clean up download directory: ${err.message}`);
    //         }
    //       },
    //     };
    //   } catch (error) {
    //     this.logger.error(`Error downloading video: ${error.message}`, error.stack);
        
    //     throw new HttpException(
    //       {
    //         message: 'Failed to download video',
    //         error: error.message,
    //         details: error.stack,
    //       },
    //       HttpStatus.INTERNAL_SERVER_ERROR,
    //     );
    //   }
    // }

    async downloadVideo(url: string, formatId: string, type: 'video' | 'audio' = 'video') {
      try {
        this.logger.log(`Starting download for URL: ${url}, Format: ${formatId}, Type: ${type}`);
        
        // Improved URL validation to support YouTube Shorts
        if (!url.includes('youtube.com/watch?v=') && 
            !url.includes('youtu.be/') && 
            !url.includes('youtube.com/shorts/')) {
          throw new HttpException('Invalid YouTube URL', HttpStatus.BAD_REQUEST);
        }
        
        // Get video ID from URL - updated regex to handle shorts
        let videoId;
        if (url.includes('youtube.com/shorts/')) {
          // Extract ID from shorts URL
          const shortsMatch = url.match(/youtube\.com\/shorts\/([^/?&]+)/);
          if (!shortsMatch) {
            throw new HttpException('Could not extract video ID from Shorts URL', HttpStatus.BAD_REQUEST);
          }
          videoId = shortsMatch[1];
        } else {
          // Regular video URL
          const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
          if (!videoIdMatch) {
            throw new HttpException('Could not extract video ID from URL', HttpStatus.BAD_REQUEST);
          }
          videoId = videoIdMatch[1];
        }
        
        // Clean URL to standard format (always use watch?v= format)
        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
        this.logger.log(`Cleaned URL: ${cleanUrl}, Video ID: ${videoId}`);
        
        // Rest of the function remains the same
        const timestamp = Date.now();
        const downloadDir = path.join(this.tempDir, `download_${timestamp}`);
        fs.mkdirSync(downloadDir, { recursive: true });
        
        // Get video info for title
        const info: any = await youtubeDlExec.youtubeDl(cleanUrl, {
          dumpSingleJson: true,
          skipDownload: true,
        });
        
        // Clean the title to create a safe filename
        const safeTitle = info.title
          .replace(/[^\w\s.-]/g, '') // Remove any characters except alphanumeric, spaces, dots, and hyphens
          .replace(/\s+/g, '_');
        
        // Using the full path to yt-dlp from node_modules to avoid PATH issues
        const ytdlpPath = path.join(process.cwd(), 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp');
        
        // Use a base filename without extension
        const baseOutputFilename = path.join(downloadDir, 'video');
        
        let command;
        if (type === 'audio') {
          command = `"${ytdlpPath}" -f "bestaudio" -x --audio-format mp3 --audio-quality 0 --max-filesize 100M -o "${baseOutputFilename}" "${cleanUrl}"`;
        } else {
          // Limit video quality to 720p and file size to 500MB
          command = `"${ytdlpPath}" -f "bestvideo[height<=720]+bestaudio/best[height<=720]" --max-filesize 500M -o "${baseOutputFilename}" "${cleanUrl}"`;
        }
        
        this.logger.log(`Executing command: ${command}`);
        
        // Execute yt-dlp directly
        await execAsync(command);
        
        // List files in the directory to find what was downloaded
        const files = fs.readdirSync(downloadDir);
        this.logger.log(`Files in download directory: ${files.join(', ')}`);
        
        if (files.length === 0) {
          throw new Error('Download completed but no files found');
        }
        
        // Use the first file found
        const downloadedFilename = files[0];
        const outputFilename = path.join(downloadDir, downloadedFilename);
        this.logger.log(`Using downloaded file: ${outputFilename}`);
        
        // Get file extension for content type
        const ext = path.extname(outputFilename).substring(1);
        
        // Determine the correct content type
        let contentType;
        if (type === 'audio') {
          contentType = 'audio/mp3';
        } else {
          switch (ext) {
            case 'mp4':
              contentType = 'video/mp4';
              break;
            case 'webm':
              contentType = 'video/webm';
              break;
            case 'mkv':
              contentType = 'video/x-matroska';
              break;
            default:
              contentType = `video/${ext}`;
          }
        }
        
        this.logger.log(`Download completed successfully: ${outputFilename}`);
        
        // Return file info and stream
        return {
          stream: createReadStream(outputFilename),
          info: {
            title: info.title,
            contentType,
            filename: `${safeTitle}.${ext}`,
          },
          cleanup: () => {
            // Remove the entire directory
            try {
              fs.rmSync(downloadDir, { recursive: true, force: true });
              this.logger.log(`Cleaned up download directory: ${downloadDir}`);
            } catch (err) {
              this.logger.error(`Failed to clean up download directory: ${err.message}`);
            }
          },
        };
      } catch (error) {
        this.logger.error(`Error downloading video: ${error.message}`, error.stack);
        
        throw new HttpException(
          {
            message: 'Failed to download video',
            error: error.message,
            details: error.stack,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
}