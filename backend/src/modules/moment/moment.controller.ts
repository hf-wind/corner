import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { MomentService } from './moment.service';
import { CreateMomentDto } from './dto/create-moment.dto';
import { UpdateMomentDto } from './dto/update-moment.dto';
import { MomentQueryDto } from './dto/moment-query.dto';

@Controller('moments')
export class MomentController {
  constructor(private moment: MomentService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Query() query: MomentQueryDto, @Req() req: any) {
    return this.moment.findAll(query, req.user?.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':slug/preview')
  preview(@Param('slug') slug: string, @Req() req: any) {
    return this.moment.preview(slug, req.user?.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':slug/publish')
  publish(@Param('slug') slug: string) {
    return this.moment.publish(slug);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':slug/like')
  toggleLike(@Param('slug') slug: string, @Req() req: any) {
    return this.moment.toggleLike(slug, req.user.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  findBySlug(@Param('slug') slug: string, @Req() req: any) {
    return this.moment.findBySlug(slug, req.user?.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() dto: CreateMomentDto, @Req() req: any) {
    return this.moment.create(dto, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateMomentDto) {
    return this.moment.update(slug, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.moment.remove(slug);
  }
}
