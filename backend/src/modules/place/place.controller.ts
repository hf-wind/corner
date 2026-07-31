import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MomentService } from '../moment/moment.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { PlaceQueryDto } from './dto/place-query.dto';
import {
  ProviderReverseQueryDto,
  ProviderSearchQueryDto,
} from './dto/provider-place-query.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { PlaceService } from './place.service';

@Controller('places')
export class PlaceController {
  constructor(
    private place: PlaceService,
    private moment: MomentService,
  ) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('provider/search')
  searchProvider(@Query() query: ProviderSearchQueryDto) {
    return this.place.searchProvider(query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('provider/reverse')
  reverseProvider(@Query() query: ProviderReverseQueryDto) {
    return this.place.reverseProvider(query);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Query() query: PlaceQueryDto, @Req() req: any) {
    return req.user?.role === 'admin' && query.scope === 'admin'
      ? this.place.findAllAdmin(query)
      : this.moment.findPublicPlaces(query);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug/memories')
  findMemories(
    @Param('slug') slug: string,
    @Query() query: PlaceQueryDto,
    @Req() req: any,
  ) {
    return this.moment.findAll(
      { page: query.page, limit: query.limit, place: slug, sort: 'latest' },
      req.user?.id,
      false,
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string, @Req() req: any) {
    const result = await this.moment.findPublicPlaces({ page: 1, limit: 1000 });
    const place = result.items.find((item) => item.slug === slug);
    if (!place) throw new NotFoundException('地点不存在或暂无公开内容');
    return place;
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('resolve')
  resolve(@Body() dto: CreatePlaceDto) {
    return this.place.resolve(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreatePlaceDto) {
    return this.place.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlaceDto) {
    return this.place.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.place.remove(id);
  }
}
