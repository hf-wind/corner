import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EmailService } from './email.service';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
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

class UpdateEmailTemplateDto {
  @IsBoolean()
  custom: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200000)
  html: string;
}

class PreviewEmailTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200000)
  html?: string;
}

@Controller('email')
export class EmailController {
  constructor(private email: EmailService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('templates')
  templates() {
    return this.email.getTemplates();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Put('templates/:key')
  updateTemplate(
    @Param('key') key: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.email.updateTemplate(key, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('templates/:key/preview')
  previewTemplate(
    @Param('key') key: string,
    @Body() dto: PreviewEmailTemplateDto,
  ) {
    return this.email.previewTemplate(key, dto);
  }

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
