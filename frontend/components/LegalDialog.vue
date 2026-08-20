<template>
  <a-modal v-model:open="visible" width="min(760px, calc(100vw - 24px))" :footer="null" :title="title" @cancel="close">
    <a-tabs v-model:active-key="activeTab" class="legal-tabs">
      <a-tab-pane key="terms" tab="用户协议" />
      <a-tab-pane key="privacy" tab="隐私政策" />
    </a-tabs>
    <article v-if="activeTab === 'terms'" class="legal-content">
      <p class="legal-meta">更新日期：2026 年 8 月 20 日 · 生效日期：2026 年 8 月 20 日</p>
      <h3>一、协议范围</h3><p>欢迎访问 corner.ink（以下简称“本站”）。本站为个人内容与交流站点，提供文章、瞬间、相册、留言、评论、漂流瓶及 AI 辅助功能。访问、注册或使用本站即表示你已阅读并同意本协议；不同意时请停止使用需要交互或账号的功能。</p>
      <h3>二、账号与安全</h3><p>你应提供真实可用的邮箱并妥善保管登录凭据，不得转让、出租账号或利用账号从事违法活动。因你主动泄露凭据造成的损失由你承担；发现异常请及时联系本站。本站可对异常访问、滥用、攻击或违反协议的账号采取限制、封禁或删除措施。</p>
      <h3>三、用户内容</h3><p>你对提交的评论、留言、漂流瓶、昵称及其他内容承担责任，并保证其不侵犯他人的著作权、隐私权、名誉权等合法权益。不得发布违法、有害、欺诈、骚扰、广告引流、恶意脚本或破坏服务安全的内容。为提供展示、审核、通知和备份服务，你授予本站在服务范围内存储、复制、展示和技术处理相关内容的非独占许可。</p>
      <h3>四、审核与处置</h3><p>本站可能使用规则与 AI 辅助审核，并保留人工复核、隐藏、拒绝或删除内容的权利。自动审核可能存在误判，你可通过联系邮箱申请复核。本站不承诺所有用户内容持续可用，也不对用户之间的线下行为或第三方链接内容负责。</p>
      <h3>五、AI 与第三方服务</h3><p>AI 生成内容仅供参考，可能不准确、不完整或具有时效性，不构成医疗、法律、投资等专业建议。请勿向 AI 输入密码、证件、财务、健康等敏感信息。地图、天气、验证码、统计、邮件和媒体服务可能由第三方提供，其可用性也受相应服务条款影响。</p>
      <h3>六、知识产权与合理使用</h3><p>本站原创文字、设计和程序依法受保护；另有署名或授权说明的内容从其说明。未经许可，不得批量抓取、镜像、出售、去除署名或用于训练、重分发。为个人学习而进行的合理引用应保留出处和链接。</p>
      <h3>七、服务变更与责任边界</h3><p>本站会尽力维持服务安全稳定，但不保证服务绝不中断或数据绝不丢失。因不可抗力、网络与第三方故障、维护升级或用户自身原因造成的影响，将在法律允许范围内按过错承担责任。本站不会排除法律规定不得排除的消费者权利或法定责任。</p>
      <h3>八、适用与联系</h3><p>本协议适用中华人民共和国法律。争议应先友好协商；无法解决的，依法向有管辖权的人民法院提起诉讼。协议更新会在本站公布，重大变化将以合理方式提示。联系邮箱：<a href="mailto:1833079849@qq.com">1833079849@qq.com</a>。</p>
    </article>
    <article v-else class="legal-content">
      <p class="legal-meta">更新日期：2026 年 8 月 20 日 · 生效日期：2026 年 8 月 20 日</p>
      <h3>一、我们处理的信息</h3><p>为提供服务，本站可能处理：注册邮箱、昵称、头像和个人简介；评论、留言、漂流瓶、点赞及 AI 会话内容；访问时间、页面、IP 的安全摘要、粗略地区、浏览器、操作系统、设备类型、访客标识、错误与安全日志；邮件发送状态和必要的系统操作记录。本站不主动要求身份证件、支付或精确定位信息。</p>
      <h3>二、处理目的与依据</h3><p>上述信息用于账号认证、内容展示、互动通知、反滥用与限流、内容审核、漂流瓶匹配、故障排查、用量与成本统计、服务改进和履行法定义务。我们依据你的同意、履行服务所需、合法权益或法律要求处理信息，并遵循最小必要原则。</p>
      <h3>三、Cookie、本地存储与访客标识</h3><p>本站使用 Cookie 或浏览器本地存储保存登录状态、主题偏好、访客标识、播放状态与必要的安全信息。拒绝或清除后仍可浏览大部分公开内容，但登录、限流、互动记录等功能可能受影响。统计数据以汇总分析为主。</p>
      <h3>四、IP、地域和漂流瓶数据</h3><p>服务器会接收请求 IP。本站主要保存不可逆摘要并通过网络信息推断省市级粗略地区，用于安全、访问统计、访客管理与漂流瓶流转展示，不用于精确追踪。管理员可在后台按访客档案查看投放、捞起、接力、留言、地区和设备概况，以处理审核、申诉和滥用问题。</p>
      <h3>五、AI 与第三方共享</h3><p>使用 AI 功能时，必要的提示词、对话上下文和内容片段可能发送给配置的模型服务商；本站记录调用次数、输入/输出 Token、模型、耗时和估算费用。天气、地图、验证码、邮件、访问统计等服务商仅在实现功能所需范围内接收数据。本站不会出售个人信息，也不会将其用于无关的定向广告。</p>
      <h3>六、保存与安全</h3><p>账号和用户内容在账号存续或提供服务所需期间保存；安全、审计与备份记录按合理周期保留，过期后删除或匿名化。我们采取访问控制、传输加密、凭据隔离、备份和日志审计等措施，但互联网服务无法保证绝对安全。发生可能影响你权益的安全事件时，将依法采取补救并履行通知义务。</p>
      <h3>七、你的权利</h3><p>你可依法请求访问、更正、复制或删除个人信息，撤回可撤回的同意，注销账号，或对自动审核结果申请说明和人工复核。为保护账号安全，我们可能在处理请求前核验身份。合理请求通常会在 15 个工作日内答复；法律另有规定或信息需依法留存的除外。</p>
      <h3>八、未成年人、跨境与更新</h3><p>未满 14 周岁的未成年人应在监护人同意和指导下使用。第三方模型或基础设施可能在其披露的地区处理数据；发生跨境处理时将依法采取必要保护。政策重大更新会通过站内提示等合理方式告知。</p>
      <h3>九、联系我们</h3><p>隐私咨询、权利请求、投诉或安全问题请发送至 <a href="mailto:1833079849@qq.com">1833079849@qq.com</a>。请说明相关账号、请求类型和必要的核验信息，请勿在邮件中发送密码或完整证件号码。</p>
    </article>
  </a-modal>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue:boolean; initialTab?:'terms'|'privacy' }>(), { initialTab:'terms' })
const emit = defineEmits<{ 'update:modelValue':[value:boolean] }>()
const visible = computed({ get:() => props.modelValue, set:value => emit('update:modelValue',value) })
const activeTab = ref<'terms'|'privacy'>(props.initialTab)
const title = computed(() => activeTab.value === 'terms' ? '用户协议' : '隐私政策')
watch(() => props.initialTab, value => { activeTab.value=value })
function close(){ emit('update:modelValue',false) }
</script>

<style scoped>
.legal-tabs :deep(.ant-tabs-nav){margin-bottom:10px}.legal-content{max-height:min(64vh,680px);overflow-y:auto;padding:0 8px 10px;color:var(--c-text-2);font-size:.76rem;line-height:1.85}.legal-content h3{margin:20px 0 6px;color:var(--c-text);font-size:.84rem}.legal-content p{margin:0}.legal-content a{color:var(--c-primary)}.legal-meta{padding:8px 10px;border-radius:6px;background:var(--c-bg-1);color:var(--c-text-3);font-size:.65rem}
</style>
