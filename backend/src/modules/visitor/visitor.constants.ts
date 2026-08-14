export const VISITOR_ACHIEVEMENTS: Array<{
  code: string;
  icon: string;
  title: string;
  description: string;
  need?: boolean;
}> = [
  {
    code: 'first_visit',
    icon: 'ph:star-four-fill',
    title: '初识之旅',
    description: '第一次踏上这座角落',
  },
  {
    code: 'set_nickname',
    icon: 'ph:feather-fill',
    title: '署名旅人',
    description: '留下了属于自己的名字',
  },
  {
    code: 'first_message',
    icon: 'ph:note-pencil-fill',
    title: '时光笔迹',
    description: '在时光留言板写下第一笔',
  },
  {
    code: 'first_bottle',
    icon: 'ph:bottle-fill',
    title: '漂流瓶初航',
    description: '投下第一只漂流瓶',
  },
  {
    code: 'catch_bottle',
    icon: 'ph:anchor-fill',
    title: '潮汐拾贝',
    description: '捞起海面上的一只瓶子',
  },
  {
    code: 'visits_5',
    icon: 'ph:sparkle-fill',
    title: '五夜星光',
    description: '五度归来，星光为引',
  },
  {
    code: 'visits_30',
    icon: 'ph:meteor-fill',
    title: '三十夜长旅',
    description: '三十次往返，已成默契',
  },
];

export const VISITOR_NICKNAME_MAX_LENGTH = 20;
export const VISITOR_MESSAGE_MAX_LENGTH = 200;
export const VISITOR_BOTTLE_MAX_LENGTH = 120;
export const VISITOR_BOTTLE_POOL_MIN = 8;

export const MESSAGE_RATE_LIMIT_PER_DAY = 5;
export const BOTTLE_RATE_LIMIT_PER_DAY = 3;
export const FISH_RATE_LIMIT_PER_DAY = 8;
export const IDENTIFY_RATE_LIMIT_PER_DAY = 10;
export const REPLY_RATE_LIMIT_PER_DAY = 5;
export const BOTTLE_CHAIN_MAX = 10;
