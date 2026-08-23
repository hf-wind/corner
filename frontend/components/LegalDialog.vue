<template>
  <a-modal v-model:open="visible" class="legal-modal" width="min(760px, calc(100vw - 24px))" :footer="null" :title="title" centered @cancel="close">
    <a-tabs v-model:active-key="activeTab" class="legal-tabs">
      <a-tab-pane key="terms" tab="用户协议" />
      <a-tab-pane key="privacy" tab="隐私政策" />
    </a-tabs>
    <article v-if="activeTab === 'terms'" class="legal-content">
      <p class="legal-meta">更新日期：2026 年 8 月 20 日 · 生效日期：2026 年 8 月 20 日</p>
      <h3>一、协议范围</h3><p>欢迎访问 corner.ink（以下简称“本站”）。本站为个人内容与交流站点，提供文章、瞬间、相册、留言、评论、漂流瓶及 AI 辅助功能。访问、注册或使用本站即表示你已阅读并同意本协议；不同意时请停止使用需要交互或账号的功能。</p>
      <h3>二、定义与协议生效</h3><p>“本站”“我们”指 corner.ink 的运营者；“用户”“你”指访问或使用本站的自然人、法人或其他组织；“内容”包括文字、图片、音视频、链接、评论、留言、漂流瓶和 AI 输入输出。你完成注册、登录、发布或继续浏览，即视为接受本协议及相关规则。</p>
      <h3>三、注册资格与账号安全</h3><p>你应具备与本站服务相适应的民事行为能力；未成年人应在监护人同意和指导下使用。你应提供真实、准确、可验证的邮箱并及时更新，不得转让、出租、出借、买卖账号，不得冒用他人身份。你应妥善保管密码、验证码和登录设备，对账号下的操作负责；发现异常应立即联系我们。</p>
      <h3>四、服务功能与使用规范</h3><p>本站提供内容发布、时间星图、评论、留言、漂流瓶、相册、通知和 AI 辅助等功能，具体以当前页面实际提供为准。不得利用本站实施违法犯罪、侵害他人权益、传播虚假信息、骚扰他人、广告引流、刷量、批量抓取、反向工程、上传恶意代码或规避访问控制。不得将本站用于自动化高频请求或任何影响系统稳定的行为。</p>
      <h3>五、用户内容与授权</h3><p>你对提交的评论、留言、漂流瓶、昵称、图片、音视频及其他内容承担全部责任，并保证拥有必要权利且不侵犯第三方著作权、隐私权、肖像权、名誉权、商业秘密等。为存储、备份、审核、展示、搜索、通知和技术适配，你授予本站在服务范围内、非独占、全球、免许可费的使用许可；你删除内容或注销账号后，因缓存、备份、法律留存或他人合法引用而暂存的副本可能在合理期限内保留。</p>
      <h3>六、审核、举报与申诉</h3><p>本站可依据法律、社区规则和安全策略，对内容进行自动或人工审核，并采取提示、限流、隐藏、删除、限制功能、冻结或注销账号等措施。自动审核可能误判，你可通过联系邮箱提交具体链接、理由和必要证明申请复核；涉及侵权的投诉应提供权利证明、身份信息和准确定位，我们会按法律要求处理。</p>
      <h3>七、AI、推荐与第三方服务</h3><p>AI 输出由模型根据输入生成，可能存在错误、遗漏、偏见或过时信息，不构成医疗、法律、投资、教育或其他专业意见；使用前应自行核验，不得据此作出高风险决定。地图、天气、验证码、统计、邮件、对象存储和模型服务可能由第三方提供，其可用性、数据处理和责任边界受相应条款约束。本站不保证第三方服务持续可用，也不对外部链接内容负责。</p>
      <h3>八、知识产权与合理使用</h3><p>本站原创文字、界面、标识、星图模型、程序和数据库结构依法受保护；另有署名或授权说明的内容从其说明。未经许可不得复制、镜像、出售、批量下载、去除署名、训练模型或以误导方式使用本站标识。符合法律的合理引用应注明作者、来源和原始链接。</p>
      <h3>九、服务变更、暂停与责任边界</h3><p>本站会尽力维持安全稳定，但不保证服务绝不中断、数据绝不丢失或所有功能永久存在。因维护升级、不可抗力、网络与第三方故障、监管要求或用户自身原因造成的影响，将在法律允许范围内按过错承担责任。本站不会排除法律规定不得排除的消费者权利或法定责任；除法律另有规定外，用户因违反本协议造成本站或他人损失的，应承担相应责任。</p>
      <h3>十、协议更新、通知与终止</h3><p>我们可能根据法律、功能或安全需要更新本协议，并在本站公布更新版本；重大变更会通过站内提示、弹窗或其他合理方式告知。更新生效后继续使用即表示接受。你可以停止使用并申请注销；我们可在你严重违约、长期不活跃或法律要求时暂停或终止服务，已产生的权利义务不受影响。</p>
      <h3>十一、适用法律与联系</h3><p>本协议适用中华人民共和国法律。争议应先友好协商；无法解决的，依法向有管辖权的人民法院提起诉讼。账号、内容、侵权、未成年人保护或安全问题请联系 <a href="mailto:1833079849@qq.com">1833079849@qq.com</a>，请勿发送密码或完整证件号码。</p>
    </article>
    <article v-else class="legal-content">
      <p class="legal-meta">更新日期：2026 年 8 月 20 日 · 生效日期：2026 年 8 月 20 日</p>
      <h3>一、我们处理的信息</h3><p>为提供服务，本站可能处理：注册邮箱、昵称、头像和个人简介；评论、留言、漂流瓶、点赞及 AI 会话内容；访问时间、页面、IP 的安全摘要、粗略地区、浏览器、操作系统、设备类型、访客标识、错误与安全日志；邮件发送状态和必要的系统操作记录。本站不主动要求身份证件、支付或精确定位信息。</p>
      <h3>二、运营者与处理原则</h3><p>本站由 corner.ink 运营。我们遵循合法、正当、必要、诚信、公开透明和目的限定原则，仅处理实现具体功能所需的信息，并尽量采用去标识化、汇总化和最小化方案。部分功能属于可选服务，你可以拒绝提供非必要信息而继续浏览公开内容。</p>
      <h3>三、处理目的与法律依据</h3><p>信息用于账号认证、内容展示、互动通知、反滥用与限流、内容审核、漂流瓶匹配、故障排查、用量与成本统计、服务改进和履行法定义务。我们依据你的同意、履行服务所需、保护合法权益或法律要求处理信息；当处理目的发生变化时会重新说明并在必要时征得同意。</p>
      <h3>四、信息分类与来源</h3><p>账户信息包括邮箱、昵称、头像和简介；内容与互动信息包括文章、评论、留言、漂流瓶、点赞、相册和 AI 会话；设备与日志信息包括 IP 安全摘要、粗略地区、浏览器、操作系统、设备类型、访问时间、页面、错误和安全事件；媒体信息仅在你主动上传或选择展示时处理。信息主要来自你主动提交、设备自动产生或经你授权的第三方服务。</p>
      <h3>五、Cookie、本地存储与访客标识</h3><p>本站使用必要 Cookie 或 localStorage 保存登录状态、主题偏好、访客标识、阅读设置和安全信息。访客标识用于去重统计和反滥用，不用于跨站跟踪；清除后可能重新生成。拒绝或清除后仍可浏览大部分公开内容，但登录、限流、互动和偏好功能可能受影响。我们不使用基于敏感信息的定向广告。</p>
      <h3>六、IP、地域、媒体与漂流瓶数据</h3><p>服务器会接收请求 IP，主要保存不可逆摘要，并通过网络信息推断省市级粗略地区，用于安全、访问统计、访客管理与漂流瓶展示，不用于精确定位。管理员仅在审核、申诉和滥用处理所需范围内查看访客档案。你上传的媒体可能包含元数据，我们会按展示和存储需要处理；请在上传前移除不必要的敏感信息。</p>
      <h3>七、AI 处理、共享与委托</h3><p>使用 AI 功能时，必要的提示词、对话上下文和内容片段可能发送给配置的模型服务商；本站记录调用次数、Token、模型、耗时和估算费用。天气、地图、验证码、邮件、访问统计、对象存储等供应商仅在实现功能所需范围内接收数据，并受保密、数据安全和用途限制约束。本站不会出售个人信息。</p>
      <h3>八、保存期限、删除与匿名化</h3><p>账号和用户内容在账号存续或提供服务所需期间保存；安全、审计、备份和财务记录按法律及合理周期保留，期满后删除或匿名化。注销或删除请求生效后，在线展示会尽快移除；因备份延迟、争议处理、法律留存或他人合法引用而暂存的副本会在目的完成后清理。</p>
      <h3>九、安全措施与事件响应</h3><p>我们采取访问控制、最小权限、传输加密、凭据隔离、备份、日志审计和异常监测等措施，并要求受托方承担保密义务。互联网服务无法保证绝对安全；发生可能影响你权益的安全事件时，我们将依法采取补救、风险控制和通知措施，并配合监管要求。</p>
      <h3>十、你的权利与投诉</h3><p>你可依法请求访问、复制、更正、删除个人信息，撤回可撤回的同意，限制或反对特定处理，注销账号，获取自动审核的必要说明并申请人工复核。为保护账号安全，我们可能核验身份；合理请求通常在 15 个工作日内答复。你也可向有权机关投诉或举报。</p>
      <h3>十一、未成年人、跨境与政策更新</h3><p>未满 14 周岁的未成年人应在监护人同意和指导下使用，监护人可通过邮箱行使相关权利。第三方模型或基础设施可能在其披露的地区处理数据；发生跨境处理时，我们将依法履行告知、评估和必要保护义务。政策重大更新会通过站内提示、弹窗或其他合理方式告知。</p>
      <h3>十二、联系我们</h3><p>隐私咨询、权利请求、投诉或安全问题请发送至 <a href="mailto:1833079849@qq.com">1833079849@qq.com</a>。请说明相关账号、请求类型和必要核验信息，请勿在邮件中发送密码或完整证件号码。</p>
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

<style>
.legal-modal .ant-modal-content { overflow: hidden; border: 1px solid color-mix(in srgb, var(--c-primary) 16%, var(--border)); border-radius: var(--ui-radius-panel, 14px); background: var(--ld-bg-card) !important; color: var(--c-text) !important; box-shadow: 0 24px 80px color-mix(in srgb, var(--ld-shadow) 60%, transparent); }
.legal-modal .ant-modal-header, .legal-modal .ant-modal-body { background: var(--ld-bg-card) !important; }
.legal-modal .ant-modal-header { margin-bottom: 0; padding: 20px 24px 8px; }
.legal-modal .ant-modal-title { color: var(--c-text) !important; font-size: 1rem; }
.legal-modal .ant-modal-close { color: var(--c-text-3) !important; }
.legal-modal .ant-modal-body { padding: 0 24px 22px; color: var(--c-text-2); }
.legal-tabs .ant-tabs-nav { margin-bottom: 10px; }
.legal-tabs .ant-tabs-tab { color: var(--c-text-2) !important; font-size: .72rem; }
.legal-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: var(--c-primary) !important; }
.legal-tabs .ant-tabs-ink-bar { background: var(--c-primary) !important; }
.legal-content { max-height: min(64vh, 680px); overflow-y: auto; padding: 0 8px 10px 0; color: var(--c-text-2) !important; font-size: .76rem; line-height: 1.85; scrollbar-gutter: stable; }
.legal-content h3 { margin: 20px 0 6px; color: var(--c-text); font-size: .84rem; }
.legal-content p { margin: 0; }
.legal-content h3 { color: var(--c-text) !important; }
.legal-content a { color: var(--c-primary) !important; }
.legal-meta { padding: 8px 10px; border-radius: 6px; background: var(--c-bg-1); color: var(--c-text-3); font-size: .65rem; }
.legal-modal .ant-modal-mask { background: rgb(2 8 20 / 58%) !important; }
@media (max-width: 640px) { .legal-modal .ant-modal { max-width: calc(100vw - 20px); margin: 10px auto; } .legal-modal .ant-modal-header { padding: 16px 18px 6px; } .legal-modal .ant-modal-body { padding: 0 18px 16px; } .legal-content { max-height: min(68dvh, 560px); font-size: .72rem; line-height: 1.8; } .legal-content h3 { margin-top: 16px; font-size: .8rem; } }
@media (prefers-reduced-motion: reduce) { .legal-modal .ant-modal-wrap, .legal-modal .ant-modal { transition: none !important; animation: none !important; } }
</style>
