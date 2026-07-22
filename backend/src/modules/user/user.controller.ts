import { Controller, Get, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private user: UserService) {}

  @Get()
  findAll() {
    return this.user.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.user.findById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  update(@Req() req: any, @Body() data: { avatar?: string; bio?: string; username?: string }) {
    return this.user.update(req.user.id, data);
  }
}
