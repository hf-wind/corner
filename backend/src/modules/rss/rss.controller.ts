import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RssService } from './rss.service';

@Controller()
export class RssController {
  constructor(private readonly rss: RssService) {}

  @Get('rss.xml')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  async feed(@Res() response: Response) {
    response.send(await this.rss.render());
  }
}
