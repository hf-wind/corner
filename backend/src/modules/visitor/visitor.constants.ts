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
    title: '三度相逢',
    description: '三次回到这座角落',
  },
  {
    code: 'set_nickname',
    icon: 'ph:feather-fill',
    title: '留名成章',
    description: '署名后留下两次时光内容',
  },
  {
    code: 'first_message',
    icon: 'ph:note-pencil-fill',
    title: '时光成笺',
    description: '留下三条通过审核的留言',
  },
  {
    code: 'first_bottle',
    icon: 'ph:bottle-fill',
    title: '远海信使',
    description: '投下三只通过审核的漂流瓶',
  },
  {
    code: 'catch_bottle',
    icon: 'ph:anchor-fill',
    title: '潮汐守望',
    description: '从时光海打捞三封来信',
  },
  {
    code: 'visits_5',
    icon: 'ph:sparkle-fill',
    title: '十日回响',
    description: '十次归来，风声已有回音',
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
