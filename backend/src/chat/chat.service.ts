import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  async listThreads() {
    const agents = this.usersService.findAll({ role: 'AGENT', pageSize: 500 }).items;
    const threads = await Promise.all(
      agents.map(async (agent) => {
        const [lastMessage, unreadCount] = await Promise.all([
          this.prisma.chatMessage.findFirst({
            where: { threadUserId: agent.id },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.chatMessage.count({
            where: { threadUserId: agent.id, senderId: agent.id, readAt: null },
          }),
        ]);
        return { agent: { id: agent.id, name: agent.name }, lastMessage, unreadCount };
      }),
    );
    return threads
      .filter((t) => t.lastMessage)
      .sort((a, b) => (b.lastMessage!.createdAt.getTime() - a.lastMessage!.createdAt.getTime()));
  }

  getThread(threadUserId: string) {
    return this.prisma.chatMessage.findMany({
      where: { threadUserId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(threadUserId: string, senderId: string, senderRole: string, body: string) {
    const message = await this.prisma.chatMessage.create({
      data: { threadUserId, senderId, body },
    });
    const isFromAgent = senderRole === 'AGENT';
    if (!isFromAgent) {
      await this.notifications.send({
        title: 'Nouveau message',
        message: body.length > 120 ? `${body.slice(0, 117)}...` : body,
        audience: 'AGENT',
        targetId: threadUserId,
        category: 'chat',
        data: { path: 'AgentChat' },
      });
    }
    return message;
  }

  async markRead(threadUserId: string, readerId: string) {
    await this.prisma.chatMessage.updateMany({
      where: { threadUserId, senderId: { not: readerId }, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}
