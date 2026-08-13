import { checkContentNonsense } from './content-filter';

describe('checkContentNonsense — 公用废物内容识别', () => {
  it('单字符直接拒绝', () => {
    expect(checkContentNonsense('1')).toBe('内容过于简短，无法公开展示');
    expect(checkContentNonsense('啊')).toBe('内容过于简短，无法公开展示');
    expect(checkContentNonsense(' ')).toBe('内容过于简短，无法公开展示');
  });

  it('纯数字/纯符号/纯标点拒绝', () => {
    expect(checkContentNonsense('11111')).toContain('纯数字或符号');
    expect(checkContentNonsense('！！！')).toContain('纯数字或符号');
    expect(checkContentNonsense('。。。。。')).toContain('纯数字或符号');
    expect(checkContentNonsense('😀👍👍')).toContain('纯数字或符号');
  });

  it('无意义重复拒绝', () => {
    expect(checkContentNonsense('啊啊啊啊')).toContain('重复');
    expect(checkContentNonsense('哈哈哈哈哈哈')).toContain('重复');
  });

  it('正常内容放行', () => {
    expect(checkContentNonsense('你好呀')).toBeNull();
    expect(checkContentNonsense('今天的晚霞很美，你们看到了吗')).toBeNull();
    expect(checkContentNonsense('2024 年最好的电影是哪部？')).toBeNull();
  });
});
