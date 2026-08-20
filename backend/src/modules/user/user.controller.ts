import {
  Controller,
  Delete,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UserController {
  constructor(private user: UserService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get()
  findAll() {
    return this.user.findAll();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin')
  findAdminUsers(@Query() query: AdminUserQueryDto) {
    return this.user.findAdminUsers(query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put('admin/:id')
  adminUpdate(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.user.adminUpdate(req.user.id, id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete('admin/:id')
  adminDelete(@Req() req: any, @Param('id') id: string) {
    return this.user.adminDelete(req.user.id, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  update(@Req() req: any, @Body() data: UpdateProfileDto) {
    return this.user.update(req.user.id, data);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.user.findById(id);
  }
}
