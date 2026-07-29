import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmailService } from './email.service';
import { IsEmail, IsString } from 'class-validator';

class TestEmailDto {
  @IsEmail()
  to: string;
}

@Controller('email')
export class EmailController {
  constructor(private email: EmailService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('test')
  async testEmail(@Body() dto: TestEmailDto) {
    return this.email.testEmail(dto.to);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('logs')
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.email.getEmailLogs({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      type,
      status,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('config')
  async getConfig() {
    const { pass, ...config } = await this.email.getEmailConfig();
    return { ...config, pass: '', hasPass: Boolean(pass) };
  }
}
