<template>
  <div class="page-layout">
    <main class="main-content">
      <div class="section-title">· 我的友链</div>

      <div class="friends-hero">
        <h2>友情链接</h2>
        <p>这里有我认识的有趣灵魂，他们用自己的方式记录着这个世界。每一个链接背后，都是一个值得探索的世界。</p>
        <a href="#" class="apply-btn">申请友链</a>
      </div>

      <div class="friends-grid">
        <NuxtLink to="#" v-for="f in friends" :key="f.name" class="friend-card">
          <img class="friend-avatar" :src="f.avatar" :alt="f.name">
          <div class="friend-name">{{ f.name }}</div>
          <div class="friend-desc">{{ f.desc }}</div>
          <div class="friend-tags">
            <span class="friend-tag" v-for="t in f.tags" :key="t">{{ t }}</span>
          </div>
        </NuxtLink>
      </div>
    </main>

    <aside class="sidebar-right">
      <div class="right-card">
        <div class="right-card-title">友链统计</div>
        <div class="friend-stats-list">
          <div class="friend-stat-row">
            <span style="font-size:0.78rem;">友链总数</span>
            <span style="font-size:0.72rem;color:var(--accent);font-weight:700;">9 个</span>
          </div>
          <div class="friend-stat-row">
            <span style="font-size:0.78rem;">技术类</span>
            <span style="font-size:0.72rem;color:var(--accent);">3 个</span>
          </div>
          <div class="friend-stat-row">
            <span style="font-size:0.78rem;">生活类</span>
            <span style="font-size:0.72rem;color:var(--accent);">4 个</span>
          </div>
          <div class="friend-stat-row">
            <span style="font-size:0.78rem;">艺术类</span>
            <span style="font-size:0.72rem;color:var(--accent);">2 个</span>
          </div>
        </div>
      </div>

      <div class="right-card">
        <div class="right-card-title">申请须知</div>
        <div class="apply-notice">
          <p style="margin-bottom:10px;">申请友链前请确保：</p>
          <p>1. 博客已稳定运行 3 个月以上</p>
          <p>2. 有原创内容且定期更新</p>
          <p>3. 无违规内容</p>
          <p style="margin-top:10px;">申请格式：</p>
          <p class="apply-format">
            名称：xxx<br>
            链接：xxx<br>
            描述：xxx
          </p>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
const friends = [
  { avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&crop=face', name: '林间小径', desc: '用文字描绘自然的美好，记录每一次徒步的感悟', tags: ['自然', '徒步'] },
  { avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop&crop=face', name: '数字花园', desc: '探索技术的边界，分享全栈开发的经验与思考', tags: ['技术', '全栈'] },
  { avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=face', name: '光影手记', desc: '用镜头捕捉瞬间，用光影讲述故事', tags: ['摄影', '艺术'] },
  { avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=face', name: '代码诗人', desc: '在代码中寻找诗意，在逻辑中发现美', tags: ['Rust', '编程'] },
  { avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&crop=face', name: '书海拾贝', desc: '在书页间漫步，分享阅读的快乐与思考', tags: ['读书', '文学'] },
  { avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&h=128&fit=crop&crop=face', name: '旅途笔记', desc: '世界那么大，我想去看看。记录每一次出行', tags: ['旅行', '探险'] },
  { avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&h=128&fit=crop&crop=face', name: '设计手札', desc: 'UI/UX 设计师的日常，分享设计灵感与方法', tags: ['设计', 'UI/UX'] },
  { avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=128&h=128&fit=crop&crop=face', name: '深夜食堂', desc: '深夜的厨房，治愈的美食，生活的温度', tags: ['美食', '生活'] },
  { avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=128&h=128&fit=crop&crop=face', name: '音乐笔记', desc: '用音符记录心情，用旋律诉说故事', tags: ['音乐', '创作'] },
]
</script>

<style scoped>
.page-layout { display: flex; flex: 1; overflow: hidden; }

.main-content { flex: 1; overflow-y: auto; padding: 24px 32px; min-width: 0; }

.section-title { font-size: 0.82rem; color: var(--c-text-2); letter-spacing: 0.12em; margin-bottom: 14px; padding-left: 4px; }

.friends-hero { background: var(--ld-bg-card); border-radius: 14px; padding: 32px; box-shadow: 0 2px 4px var(--ld-shadow); margin-bottom: 28px; text-align: center; transition: all 0.2s; }
.friends-hero h2 { font-size: 1.3rem; font-weight: 700; margin-bottom: 8px; color: var(--c-text); }
.friends-hero p { font-size: 0.85rem; color: var(--c-text-2); line-height: 1.7; max-width: 500px; margin: 0 auto; }
.friends-hero .apply-btn { display: inline-block; margin-top: 16px; padding: 8px 24px; border-radius: 20px; background: var(--c-primary); color: #fff; font-size: 0.82rem; text-decoration: none; transition: all 0.2s; box-shadow: 0 4px 12px color-mix(in srgb, var(--c-primary) 30%, transparent); }
.friends-hero .apply-btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 6px 20px color-mix(in srgb, var(--c-primary) 40%, transparent); }

.friends-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
.friend-card { background: var(--ld-bg-card); border-radius: 14px; padding: 24px; box-shadow: 0 2px 4px var(--ld-shadow); text-align: center; cursor: pointer; transition: all 0.2s; text-decoration: none; color: inherit; }
.friend-card:hover { transform: translateY(-2px); box-shadow: 0 0.5em 1em var(--ld-shadow); }
.friend-avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--c-bg-1); margin-bottom: 12px; }
.friend-name { font-size: 0.95rem; font-weight: 700; margin-bottom: 4px; color: var(--c-text); }
.friend-desc { font-size: 0.75rem; color: var(--c-text-2); line-height: 1.5; margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.friend-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.friend-tag { font-size: 0.62rem; padding: 2px 8px; border-radius: 12px; background: var(--c-primary-soft); color: var(--c-primary); }

.sidebar-right { width: var(--right-w); flex-shrink: 0; padding: 24px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.right-card { background: var(--ld-bg-card); border-radius: 12px; padding: 18px; box-shadow: 0 2px 4px var(--ld-shadow); transition: all 0.2s; }
.right-card-title { font-size: 0.82rem; font-weight: 700; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); letter-spacing: 0.05em; color: var(--c-text); }

.friend-stats-list { display: flex; flex-direction: column; gap: 10px; }
.friend-stat-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--c-text); }

.apply-notice { font-size: 0.78rem; color: var(--c-text-2); line-height: 1.7; }
.apply-format { background: var(--c-bg-1); padding: 8px; border-radius: 6px; font-family: monospace; font-size: 0.72rem; margin-top: 6px; color: var(--c-text); }
</style>
