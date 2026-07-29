import { Controller, Get, Post, Delete, Param, Query, UseGuards, Req, Logger, Sse, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { NotificationService } from './notification.service';
import { NotificationSseService } from './notification-sse.service';

@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private notificationService: NotificationService,
    private sseService: NotificationSseService,
    private jwtService: JwtService,
  ) {}

  @Sse('stream')
  stream(@Query('token') token: string): Observable<{ data: any }> {
    let userId: string;
    try {
      const payload = this.jwtService.verify(token);
      userId = payload.sub || payload.id;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const subject = this.sseService.getClient(userId);
    this.logger.log(`SSE client connected: ${userId}`);

    return new Observable((observer) => {
      const subscription = subject.subscribe({
        next: (event) => observer.next({ data: event }),
        error: (err) => observer.error(err),
      });

      this.notificationService.getUnreadCount(userId).then(({ count }) => {
        observer.next({ data: { type: 'unread-count', data: { count } } });
      });

      return () => {
        subscription.unsubscribe();
      };
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.notificationService.findAll(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.notificationService.getUnreadCount(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/read')
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationService.markAsRead(req.user.id, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.notificationService.remove(req.user.id, id);
  }
}
