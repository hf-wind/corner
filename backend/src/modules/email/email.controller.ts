import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmailService } from './email.service';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

class TestEmailDto {
  @IsEmail()
  to: string;
}

class UpdateEmailConfigDto {
  @IsOptional()
  @IsBoolean()
  email_enabled?: boolean;
  @IsOptional()
  @IsString()
  email_smtp_host?: string;
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  email_smtp_port?: number;
  @IsOptional()
  @IsBoolean()
  email_smtp_secure?: boolean;
  @IsOptional()
  @IsString()
  email_smtp_user?: string;
  @IsOptional()
  @IsString()
  email_smtp_pass?: string;
  @IsOptional()
  @IsString()
  email_from_name?: string;
  @IsOptional()
  @IsString()
  email_from_address?: string;
  @IsOptional()
  @IsString()
  site_url?: string;
}

@Controller('email')
export class EmailController {
  constructor(private email: EmailService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('test')
  async testEmail(@Body() dto: TestEmailDto) {
    return this.email.testEmail(dto.to);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
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

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('config')
  async getConfig() {
    const { pass, ...config } = await this.email.getEmailConfig();
    return { ...config, pass: '', hasPass: Boolean(pass) };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put('config')
  async updateConfig(@Body() dto: UpdateEmailConfigDto) {
    for (const [key, value] of Object.entries(dto)) {
      if (
        value === undefined ||
        (key === 'email_smtp_pass' && !String(value).trim())
      )
        continue;
      await this.email.updateConfigValue(key, value);
    }
    this.email.resetTransporter();
    const { pass, ...config } = await this.email.getEmailConfig();
    return { ...config, pass: '', hasPass: Boolean(pass) };
  }
}
