import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class NotificationSseService {
  private readonly logger = new Logger(NotificationSseService.name);
  private clients = new Map<string, Subject<any>>();

  getClient(userId: string): Subject<any> {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Subject<any>());
    }
    return this.clients.get(userId)!;
  }

  emit(userId: string, event: { type: string; data: any }) {
    const subject = this.clients.get(userId);
    if (subject) {
      subject.next(event);
    }
  }

  removeClient(userId: string) {
    const subject = this.clients.get(userId);
    if (subject) {
      subject.complete();
      this.clients.delete(userId);
      this.logger.log(`SSE client disconnected: ${userId}`);
    }
  }
}
