import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JourneyQueryDto, SaveJourneyDto } from './dto/journey.dto';
import { SaveStoryRouteDto } from './dto/story-route.dto';
import { JourneyService } from './journey.service';
import { JourneyFeatureGuard } from './journey-feature.guard';

const adminGuards = [JwtAuthGuard, RolesGuard];

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller('journeys')
export class JourneyController {
  constructor(private journeys: JourneyService) {}
  @Get() @UseGuards(JourneyFeatureGuard) findPublic(
    @Query() query: JourneyQueryDto,
  ) {
    return this.journeys.findPublic(query);
  }
  @Get('admin/list') @UseGuards(...adminGuards) @Roles('admin') findAdmin(
    @Query() query: JourneyQueryDto,
  ) {
    return this.journeys.findAdmin(query);
  }
  @Get('admin/:id') @UseGuards(...adminGuards) @Roles('admin') findAdminOne(
    @Param('id') id: string,
  ) {
    return this.journeys.findAdminJourney(id);
  }
  @Post('admin') @UseGuards(...adminGuards) @Roles('admin') create(
    @Body() dto: SaveJourneyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.journeys.createJourney(dto, req.user.id);
  }
  @Put('admin/:id') @UseGuards(...adminGuards) @Roles('admin') update(
    @Param('id') id: string,
    @Body() dto: SaveJourneyDto,
  ) {
    return this.journeys.updateJourney(id, dto);
  }
  @Delete('admin/:id') @UseGuards(...adminGuards) @Roles('admin') remove(
    @Param('id') id: string,
  ) {
    return this.journeys.removeJourney(id);
  }
  @Get(':slug') @UseGuards(JourneyFeatureGuard) findOne(
    @Param('slug') slug: string,
  ) {
    return this.journeys.findPublicJourney(slug);
  }
}

@Controller('stories')
export class StoryRouteController {
  constructor(private journeys: JourneyService) {}
  @Get() @UseGuards(JourneyFeatureGuard) findPublic() {
    return this.journeys.findPublicStories();
  }
  @Get('share/:token') @UseGuards(JourneyFeatureGuard) shared(
    @Param('token') token: string,
  ) {
    return this.journeys.findSharedStory(token);
  }
  @Get('admin/list') @UseGuards(...adminGuards) @Roles('admin') adminList() {
    return this.journeys.findAdminStories();
  }
  @Get('admin/:id') @UseGuards(...adminGuards) @Roles('admin') adminOne(
    @Param('id') id: string,
  ) {
    return this.journeys.findAdminStory(id);
  }
  @Post('admin') @UseGuards(...adminGuards) @Roles('admin') create(
    @Body() dto: SaveStoryRouteDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.journeys.createStory(dto, req.user.id);
  }
  @Put('admin/:id') @UseGuards(...adminGuards) @Roles('admin') update(
    @Param('id') id: string,
    @Body() dto: SaveStoryRouteDto,
  ) {
    return this.journeys.updateStory(id, dto);
  }
  @Delete('admin/:id') @UseGuards(...adminGuards) @Roles('admin') remove(
    @Param('id') id: string,
  ) {
    return this.journeys.removeStory(id);
  }
  @Get(':slug/share-cover.png')
  @UseGuards(JourneyFeatureGuard)
  async shareCover(@Param('slug') slug: string, @Res() res: Response) {
    const image = await this.journeys.shareCover(slug);
    res
      .type('image/png')
      .setHeader('Cache-Control', 'public, max-age=86400')
      .send(image);
  }
  @Get(':slug') @UseGuards(JourneyFeatureGuard) findOne(
    @Param('slug') slug: string,
  ) {
    return this.journeys.findPublicStory(slug);
  }
}
