import { MomentCommentService } from './moment-comment.service';

describe('MomentCommentService — 前置规则引擎', () => {
  it('「1」直接拒绝且不调用 AI 审核', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      momentComment: { update },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    } as any;
    const ai = { moderateComment: jest.fn() } as any;
    const service = new MomentCommentService(prisma, {} as any, {} as any, ai);
    await (service as any).moderateAndNotify(
      { id: 'c1', content: '1' },
      { title: 'T', id: 'm1', slug: 's' },
      null,
      'u1',
      '阿风',
    );
    expect(ai.moderateComment).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: expect.objectContaining({
        status: 'rejected',
        rejectReason: expect.stringContaining('简短'),
      }),
    });
  });

  it('正常内容仍走 AI 审核', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      momentComment: { update },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    } as any;
    const ai = {
      moderateComment: jest
        .fn()
        .mockResolvedValue({ approved: true, reason: '正常交流' }),
    } as any;
    const service = new MomentCommentService(prisma, {} as any, {} as any, ai);
    await (service as any).moderateAndNotify(
      { id: 'c2', content: '今天天气不错' },
      { title: 'T', id: 'm1', slug: 's' },
      null,
      'u1',
      '阿风',
    );
    expect(ai.moderateComment).toHaveBeenCalled();
  });
});
