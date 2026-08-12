import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createHash, randomUUID } from 'crypto';

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL 未配置，已拒绝执行');
const target = new URL(databaseUrl);
const dbName = target.pathname.replace(/^\//, '');
const allowed = String(process.env.SEED_ALLOWED_DATABASE || '').trim();
if (!allowed || dbName !== allowed) {
  throw new Error(`初始化目标校验失败：${dbName || '(未知)'}，允许目标 ${allowed || '(未配置)'}`);
}
const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
if (!localHosts.has(target.hostname) && process.env.SEED_ALLOW_REMOTE_DATABASE !== 'true') {
  throw new Error(`拒绝操作远程数据库 ${target.hostname}；如确需执行，必须显式设置 SEED_ALLOW_REMOTE_DATABASE=true`);
}

const SEED_BOTTLES: Array<{ nickname: string; content: string }> = [
  { nickname: '晚风信使', content: '晚上十点半的末班公交上，只有我和司机。窗外霓虹一闪一闪，突然很想念大学食堂二楼的牛肉面。' },
  { nickname: '失眠的鹿', content: '有一个秘密憋了三年：那年转学走的同桌，其实是我偷偷喜欢的第一个人。现在说出口也不算什么了吧。' },
  { nickname: '北方旅人', content: '刚到这座城市第 17 天，租的房子还没装网，晚饭是泡面加火腿肠。说不累是假的，但楼下便利店阿姨今天对我笑了。' },
  { nickname: '山雾', content: '如果现在的你回到高三那年，最想对那时的自己说一句什么？我想说：别熬夜刷题，身体比分数重要。' },
  { nickname: '海盐', content: '和爸妈视频，发现他们手机里全是我发过的照片。我有多久没主动给他们打电话了？就现在，放下瓶子去拨号吧。' },
  { nickname: '拾贝人', content: '今天在海边捡到一颗很圆的石头，像一枚月亮。把它放在窗台上，从此我的房间也有了一小片海。' },
  { nickname: '匿名邮差', content: '在图书馆还书时，发现书里夹着一张 2019 年的电影票根。不知道那位陌生人，现在过得好吗。' },
  { nickname: 'K先生', content: '连续加班第 8 天，项目终于上线了。回家路上买了瓶汽水庆祝，虽然没人知道，但我还是敬了自己一杯。' },
  { nickname: '南方的雪', content: '从小在南方长大，从没见过真正的雪。如果有一天你看到雪，可以帮我把它拍下来，丢回海里吗？' },
  { nickname: '旧钥匙', content: '分手五年，还是会在某个雨夜想起她煮的姜茶。时间没有治愈一切，只是让人学会了藏。' },
  { nickname: '纸上谈兵', content: '想辞掉稳定的工作去学烘焙，妈妈说我不切实际。可人生只有一次，不该有遗憾吗？有人投过这样的选择吗？' },
  { nickname: '夜航星', content: '深夜值班室很安静，窗外的星星特别亮。忽然觉得，孤独和自由也许是同一件事的两面。' },
  { nickname: '邮筒里的猫', content: '捡到一只小橘猫，取名叫可乐。它今天第一次跳上我的膝盖睡觉，呼噜声把我的失眠治好了。' },
  { nickname: '路人甲', content: '在旧书摊花五块钱买到了一本 1987 年的诗集，扉页写着"赠小芳，愿你永远如初见"。小芳，你收到了吗？' },
  { nickname: '退潮时', content: '今天体检报告出来了，指标都正常。忽然觉得，健康本身就是最好的彩票。祝看到这封信的你也平安。' },
  { nickname: '一页书签', content: '重读高中最爱的书，发现当年用铅笔写的批注幼稚得可爱。原来成长，就是能笑着看自己从前的认真。' },
  { nickname: '无糖汽水', content: '考研二战上岸了，收到录取通知那天，我爸在厨房偷偷抹眼泪。这是我第一次见他哭。' },
  { nickname: '灯塔看守', content: '我在离岛的小镇上班，每天看潮汐涨落。如果你也在一个别人觉得"没意思"的地方，记得我们并不孤单。' },
  { nickname: '碎碎念', content: '今天的晚霞是粉紫色的，像打翻了的草莓奶昔。可惜手机拍出来总差一点，有些美好只属于亲眼见到的人。' },
  { nickname: '候鸟', content: '第 11 次搬家，行李还是那两个箱子。房东问我为什么东西这么少，我说：轻一点，才飞得远。' },
  { nickname: '一罐心事', content: '给去世三年的爷爷发了条短信，明知道那个号码早就不用了。可按下发送的那一刻，我好像真的听到了回音。' },
  { nickname: '左耳', content: '发现治愈心情的秘诀：难过的时候就去菜市场。看卖鱼的大叔吆喝，看阿姨讨价还价，人间烟火总能救你一次。' },
  { nickname: '慢递', content: '写论文写到凌晨三点，泡面吃到第二口，突然想起妈妈说的"按时吃饭"。明天开始，对自己好一点。' },
  { nickname: '浮木', content: '如果这辈子只能做成一件事，我想把姥姥的菜谱完整地记录下来。味道是会消失的，文字不会。' },
  { nickname: '白噪音', content: '下雨天窝在沙发里听歌，单曲循环到第四遍时，忽然理解了一首歌里藏着的告别。' },
  { nickname: '圆规', content: '走了很多城市，最后发现最想回的，还是楼下那家开了二十年的早餐店。' },
  { nickname: '半瓶月光', content: '加班到深夜，电梯里只有我一个人。忽然希望电梯能再慢一点，让那首歌多放两句。' },
  { nickname: '漂流密码', content: '把想对某人说的话写在这里：其实那天你说"随便"的时候，我真的很难过。希望你能捞到这一瓶。' },
  { nickname: '柠檬茶', content: '第一次一个人旅行，在青旅认识了三个天南地北的朋友。原来世界这么大，相遇这么容易。' },
  { nickname: '零点', content: '今天过生日，没有蛋糕没有祝福，下班路过蛋糕店给自己买了个小切片。生日快乐，你已经很棒了。' },
];

const TARGET_COUNT = 20;
const MIN_COUNT = 15;
const DAYS_BACK = 21;
const FAKE_VISITOR_PREFIX = 'seed-bottle-';

function fakeVisitorHash(index: number): string {
  return createHash('sha256').update(`${FAKE_VISITOR_PREFIX}${index}`).digest('hex');
}

async function main() {
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 15000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const existing = await prisma.visitorMessage.count({
      where: { type: 'bottle', status: 'approved' },
    });
    if (existing >= MIN_COUNT) {
      console.log(`漂流瓶数量充足（${existing} 条），无需补种`);
      return;
    }
    const need = Math.min(TARGET_COUNT - existing, SEED_BOTTLES.length);
    const now = Date.now();
    const rows = Array.from({ length: need }, (_, i) => {
      const pick =
        SEED_BOTTLES[Math.floor(Math.random() * SEED_BOTTLES.length)] ?? {
          nickname: '漂流者',
          content: '海面之下，藏着许多未被说出口的话。',
        };
      const id = randomUUID();
      return {
        type: 'bottle' as const,
        content: pick.content,
        nickname: pick.nickname.slice(0, 20),
        status: 'approved' as const,
        visitorIdHash: fakeVisitorHash(i),
        chainId: id,
        createdAt: new Date(now - Math.floor(Math.random() * DAYS_BACK * 24 * 3600 * 1000)),
      };
    });
    await prisma.visitorMessage.createMany({ data: rows });
    console.log(`已补种 ${rows.length} 条漂流瓶，当前共 ${existing + rows.length} 条`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('种子瓶初始化失败:', error);
  process.exitCode = 1;
});
