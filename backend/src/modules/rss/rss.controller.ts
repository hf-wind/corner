import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RssService } from './rss.service';

@Controller()
export class RssController {
  constructor(private readonly rss: RssService) {}

  @Get('rss.xml')
  // Browsers use the XML viewer for application/xml. RSS clients still detect
  // the feed from the <rss> document root, so no presentation stylesheet is needed.
  @Header('Content-Type', 'application/xml')
  @Header('Cache-Control', 'no-store, must-revalidate, no-cache, max-age=0')
  @Header('X-Robots-Tag', 'all')
  async feed(@Res() response: Response) {
    response.send(await this.rss.render());
  }
}
