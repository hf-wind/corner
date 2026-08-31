<template>
  <div class="ai-admin admin-page-shell">
    <header class="admin-page-head"><div><span>AI CONTROL</span><h1>功能与模型</h1><p>统一管理模型能力、使用统计与全部用户及访客会话。</p></div></header>
    <a-tabs v-model:activeKey="tab" size="small">
      <a-tab-pane key="base" tab="基础配置" />
      <a-tab-pane key="content" tab="内容生成" />
      <a-tab-pane key="style" tab="站点文风" />
      <a-tab-pane key="chat" tab="聊天助手" />
      <a-tab-pane key="moderation" tab="审核" />
      <a-tab-pane key="chats" tab="会话管理" />
    </a-tabs>

    <div class="page-actions">
      <a-alert
        :type="apiConfigured ? 'success' : 'warning'"
        show-icon
        class="status-alert"
        :message="
          apiConfigured
            ? 'AI 服务已配置，功能会优先使用后台参数。'
            : 'AI 服务暂未就绪，保存 API Key 后才能真正调用模型。'
        "
      />
      <a-space class="page-action-buttons" :size="8">
        <a-button type="primary" :loading="saving" @click="saveConfig"
          ><Icon name="ph:floppy-disk-bold" /> 保存配置</a-button
        >
        <a-button :loading="testing" @click="testConnection"
          ><Icon name="ph:plugs-connected-bold" /> 测试连接</a-button
        >
        <a-button @click="resetDefaults"><Icon name="ph:arrow-counter-clockwise-bold" /> 恢复默认</a-button>
      </a-space>
    </div>

    <div v-show="tab === 'base'" class="tab-body">
      <a-spin :spinning="cfgLoading">
        <a-space direction="vertical" :size="16" style="width: 100%">

          <AdminCard
            icon="ph:cpu-bold"
            title="模型接入"
            desc="配置服务商与模型，各功能模块可独立选择模型"
          >
            <template #extra>
              <a-button type="primary" size="small" @click="openCreateModel">
                <Icon name="ph:plus-bold" /> 新增模型
              </a-button>
            </template>
            <a-form layout="vertical" size="middle">
              <a-row :gutter="16">
                <a-col :xs="24" :sm="12">
                  <a-form-item label="启用 AI">
                    <a-switch v-model:checked="form.ai_enabled" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12">
                  <a-form-item label="请求超时 (ms)">
                    <a-input-number
                      v-model:value="form.ai_request_timeout_ms"
                      :min="3000"
                      :max="120000"
                      :step="1000"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>

            <a-spin :spinning="modelsLoading">
              <div v-if="models.length" class="model-list">
                <div
                  v-for="item in models"
                  :key="item.id"
                  class="model-row"
                  :class="{ disabled: !item.enabled }"
                >
                  <div class="model-main">
                    <div class="model-title">
                      <strong>{{ item.name }}</strong>
                      <a-tag color="blue">{{ item.provider }}</a-tag>
                      <a-tag v-if="item.isDefault" color="green">默认</a-tag>
                      <a-tag v-if="!item.enabled">已停用</a-tag>
                    </div>
                    <div class="model-meta">
                      <code>{{ item.model }}</code>
                      <span>{{ item.baseUrl }}</span>
                      <span>{{
                        item.apiKeyMasked ||
                        (item.hasApiKey ? "环境变量密钥" : "未配置密钥")
                      }}</span>
                    </div>
                  </div>
                  <a-space class="model-actions">
                    <a-button
                      size="small"
                      :loading="testingModelId === item.id"
                      @click="testModel(item)"
                      ><Icon name="ph:plugs-connected-bold" /> 测试</a-button
                    >
                    <a-button size="small" @click="openEditModel(item)"
                      ><Icon name="ph:pencil-simple-bold" /> 编辑</a-button
                    >
                    <a-button size="small" danger @click="removeModel(item)"
                      ><Icon name="ph:trash-bold" /> 删除</a-button
                    >
                  </a-space>
                </div>
              </div>
              <a-empty v-else description="还没有模型配置" />
            </a-spin>
          </AdminCard>

          <AdminCard
            icon="ph:power-bold"
            title="应用开关"
            desc="按功能启用或停用 AI 能力，停用后该模块不再调用模型"
          >
            <div class="switch-grid">
              <div class="switch-item">
                <div class="switch-label">
                  <Icon name="ph:chat-circle-bold" class="switch-icon" />
                  <div>
                    <div class="switch-name">聊天助手</div>
                    <div class="switch-note">前台哆啦A梦对话</div>
                  </div>
                </div>
                <a-switch v-model:checked="form.ai_pet_chat_enabled" />
              </div>
              <div class="switch-item">
                <div class="switch-label">
                  <Icon name="ph:article-bold" class="switch-icon" />
                  <div>
                    <div class="switch-name">文章摘要</div>
                    <div class="switch-note">为文章生成导语摘要</div>
                  </div>
                </div>
                <a-switch v-model:checked="form.ai_summarize_enabled" />
              </div>
              <div class="switch-item">
                <div class="switch-label">
                  <Icon name="ph:pen-nib-bold" class="switch-icon" />
                  <div>
                    <div class="switch-name">文章生成</div>
                    <div class="switch-note">根据灵感生成文章草稿</div>
                  </div>
                </div>
                <a-switch v-model:checked="form.ai_article_enabled" />
              </div>
              <div class="switch-item">
                <div class="switch-label">
                  <Icon name="ph:sparkle-bold" class="switch-icon" />
                  <div>
                    <div class="switch-name">瞬间润色</div>
                    <div class="switch-note">整理发布瞬间内容</div>
                  </div>
                </div>
                <a-switch v-model:checked="form.ai_moment_enabled" />
              </div>
              <div class="switch-item">
                <div class="switch-label">
                  <Icon name="ph:shield-check-bold" class="switch-icon" />
                  <div>
                    <div class="switch-name">评论审核</div>
                    <div class="switch-note">自动拦截违规评论</div>
                  </div>
                </div>
                <a-switch
                  v-model:checked="form.ai_comment_moderation_enabled"
                />
              </div>
              <div class="switch-item">
                <div class="switch-label">
                  <Icon name="ph:handshake-bold" class="switch-icon" />
                  <div>
                    <div class="switch-name">友链审核</div>
                    <div class="switch-note">自动审核友链申请</div>
                  </div>
                </div>
                <a-switch v-model:checked="form.ai_friend_moderation_enabled" />
              </div>
              <div class="switch-item">
                <div class="switch-label">
                  <Icon name="ph:books-bold" class="switch-icon" />
                  <div>
                    <div class="switch-name">书影资料</div>
                    <div class="switch-note">整理书影作品信息</div>
                  </div>
                </div>
                <a-switch v-model:checked="form.ai_library_enabled" />
              </div>
            </div>
          </AdminCard>
        </a-space>
      </a-spin>
    </div>

    <div v-show="tab === 'content'" class="tab-body">
      <a-spin :spinning="cfgLoading">
        <a-space direction="vertical" :size="16" style="width: 100%">
          <AdminCard
            icon="ph:pen-nib-bold"
            title="文章 AI"
            desc="根据灵感生成文章正文与元数据，并为文章生成导语摘要"
          >
            <a-form layout="vertical" size="middle">
                <a-form-item label="文章封面壁纸来源">
                  <a-input
                    v-model:value="form.ai_wallpaper_source_url"
                    placeholder="https://wallhaven.cc/toplist"
                  />
                  <div class="field-hint">AI 文章与随机封面会从该壁纸站点获取，默认使用 Wallhaven 热门榜。</div>
                </a-form-item>
              <a-form-item label="正文生成提示词">
                  <a-textarea
                    v-model:value="form.ai_article_prompt"
                    :rows="7"
                    placeholder="根据灵感生成文章正文的系统提示词"
                  />
                </a-form-item>
                <a-form-item label="元数据提示词（slug / 分类 / 标签）">
                  <a-textarea
                    v-model:value="form.ai_article_meta_prompt"
                    :rows="5"
                    placeholder="推荐 slug、分类、标签的提示词"
                  />
                </a-form-item>
                <a-row :gutter="16">
                  <a-col :xs="24" :sm="8">
                    <a-form-item label="文章模型">
                      <a-select
                        v-model:value="form.ai_article_model_config_id"
                        :options="modelOptions"
                        allow-clear
                        placeholder="默认模型"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="8">
                    <a-form-item label="temperature">
                      <a-input-number
                        v-model:value="form.ai_article_temperature"
                        :min="0"
                        :max="2"
                        :step="0.1"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="8">
                    <a-form-item label="maxTokens">
                      <a-input-number
                        v-model:value="form.ai_article_max_tokens"
                        :min="512"
                        :max="16000"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>

                <a-divider class="sub-divider" orientation="left"
                  >文章摘要</a-divider
                >
                <a-form-item label="文章摘要提示词">
                  <a-textarea
                    v-model:value="form.ai_summarize_prompt"
                    :rows="5"
                  />
                </a-form-item>
                <a-row :gutter="16">
                  <a-col :xs="24" :sm="8">
                    <a-form-item label="摘要模型">
                      <a-select
                        v-model:value="form.ai_summarize_model_config_id"
                        :options="modelOptions"
                        allow-clear
                        placeholder="默认模型"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="8">
                    <a-form-item label="摘要 temp">
                      <a-input-number
                        v-model:value="form.ai_summarize_temperature"
                        :min="0"
                        :max="2"
                        :step="0.1"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="8">
                    <a-form-item label="摘要 tokens">
                      <a-input-number
                        v-model:value="form.ai_summarize_max_tokens"
                        :min="64"
                        :max="1024"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
              </a-form>
            </AdminCard>

            <AdminCard
              icon="ph:sparkle-bold"
              title="瞬间 AI"
              desc="把灵感润色成第一人称的瞬间记录"
            >
              <a-form layout="vertical" size="middle">
                <a-alert
                  type="info"
                  show-icon
                  class="inline-alert"
                  message="这里专门控制“瞬间”的润色风格。建议保持第一人称、自然、有趣，不要看起来像 AI。"
                />
                <a-form-item label="瞬间润色提示词">
                  <a-textarea
                    v-model:value="form.ai_moment_prompt"
                    :rows="8"
                    placeholder="要求第一人称、像本人在发动态、带一点幽默感的提示词"
                  />
                </a-form-item>
                <a-form-item label="瞬间摘要提示词">
                  <a-textarea
                    v-model:value="form.ai_moment_summary_prompt"
                    :rows="5"
                    placeholder="用于生成哆啦A梦视角的情景化摘要，可留空"
                  />
                </a-form-item>
                <a-row :gutter="16">
                  <a-col :xs="24" :sm="8">
                    <a-form-item label="瞬间模型">
                      <a-select
                        v-model:value="form.ai_moment_model_config_id"
                        :options="modelOptions"
                        allow-clear
                        placeholder="默认模型"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="8">
                    <a-form-item label="temperature">
                      <a-input-number
                        v-model:value="form.ai_moment_temperature"
                        :min="0"
                        :max="2"
                        :step="0.1"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="8">
                    <a-form-item label="maxTokens">
                      <a-input-number
                        v-model:value="form.ai_moment_max_tokens"
                        :min="128"
                        :max="4000"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>
              </a-form>
            </AdminCard>

          <AdminCard
            icon="ph:books-bold"
            title="书影 AI"
            desc="为书影记录整理作品资料与阅读/观影体会"
          >
            <a-form layout="vertical" size="middle">
              <a-form-item label="资料整理提示词">
                <a-textarea v-model:value="form.ai_library_prompt" :rows="6" />
              </a-form-item>
              <a-row :gutter="16">
                <a-col :xs="24" :sm="8">
                  <a-form-item label="书影模型">
                    <a-select
                      v-model:value="form.ai_library_model_config_id"
                      :options="modelOptions"
                      allow-clear
                      placeholder="默认模型"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="temperature">
                    <a-input-number
                      v-model:value="form.ai_library_temperature"
                      :min="0"
                      :max="2"
                      :step="0.1"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="maxTokens">
                    <a-input-number
                      v-model:value="form.ai_library_max_tokens"
                      :min="512"
                      :max="8000"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </AdminCard>
            
          

        </a-space>
      </a-spin>
    </div>

    <div v-show="tab === 'style'" class="tab-body">
      <a-spin :spinning="cfgLoading || styleLoading">
        <a-space direction="vertical" :size="16" style="width: 100%">
          <AdminCard
            icon="ph:signature-bold"
            title="风隅文风引擎"
            desc="统一控制文章、瞬间、书影体会、风迹与记忆叙事等内容的表达方式"
          >
            <template #extra>
              <a-button
                type="primary"
                :loading="styleRebuilding"
                :disabled="!styleStatus.eligible"
                @click="rebuildStyle"
              >
                <Icon name="ph:sparkle-bold" /> 立即建立画像
              </a-button>
            </template>
            <a-alert
              :type="styleStatus.eligible ? 'success' : 'info'"
              show-icon
              class="inline-alert"
              :message="
                styleStatus.eligible
                  ? `已达到画像门槛：${styleStatus.sampleCount} 篇已发布内容，可基于站点表达持续学习。`
                  : `当前 ${styleStatus.sampleCount} 篇已发布内容，达到 ${styleStatus.minimum} 篇后可建立站点画像；基础文风仍会生效。`
              "
              :description="
                styleStatus.updatedAt
                  ? `最近建立于 ${formatStyleTime(styleStatus.updatedAt)}`
                  : '尚未建立站点画像'
              "
            />

            <a-form layout="vertical" size="middle">
              <div class="switch-grid">
                <div class="switch-item">
                  <div class="switch-label">
                    <Icon name="ph:pen-nib-bold" class="switch-icon" />
                    <div>
                      <div class="switch-name">启用统一文风</div>
                      <div class="switch-note">不影响哆啦A梦角色内容</div>
                    </div>
                  </div>
                  <a-switch v-model:checked="form.ai_style_enabled" />
                </div>
                <div class="switch-item">
                  <div class="switch-label">
                    <Icon name="ph:arrows-clockwise-bold" class="switch-icon" />
                    <div>
                      <div class="switch-name">发布后自动重建</div>
                      <div class="switch-note">仅达到样本门槛后调用模型</div>
                    </div>
                  </div>
                  <a-switch v-model:checked="form.ai_style_auto_rebuild" />
                </div>
              </div>

              <a-row :gutter="16">
                <a-col :xs="24" :sm="12" :lg="6">
                  <a-form-item label="画像门槛">
                    <a-input-number v-model:value="form.ai_style_min_samples" :min="1" :max="100" addon-after="篇" style="width: 100%" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12" :lg="6">
                  <a-form-item label="最大样本数">
                    <a-input-number v-model:value="form.ai_style_max_samples" :min="8" :max="100" addon-after="篇" style="width: 100%" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12" :lg="6">
                  <a-form-item label="单篇采样长度">
                    <a-input-number v-model:value="form.ai_style_sample_char_limit" :min="400" :max="6000" :step="100" addon-after="字" style="width: 100%" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12" :lg="6">
                  <a-form-item label="文风强度">
                    <a-select v-model:value="form.ai_style_strength" :options="styleStrengthOptions" />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-form-item label="基础文风指南">
                <a-textarea v-model:value="form.ai_style_base_guide" :rows="9" maxlength="6000" show-count />
              </a-form-item>
              <a-form-item label="站点补充规则">
                <a-textarea
                  v-model:value="form.ai_style_custom_rules"
                  :rows="5"
                  maxlength="3000"
                  show-count
                  placeholder="填写特定栏目、用词、节奏或禁用表达；留空时只使用基础指南与站点画像"
                />
              </a-form-item>
            </a-form>
          </AdminCard>

          <AdminCard
            icon="ph:files-bold"
            title="文风样本维护"
            desc="只统计已发布且正文超过 20 字的内容；文章正文增改超过 20 字时会自动触发画像更新"
          >
            <a-table
              v-if="styleStatus.samples.length"
              :columns="styleSampleColumns"
              :data-source="styleStatus.samples"
              :pagination="false"
              :scroll="{ x: 620 }"
              row-key="id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'type'">
                  <a-tag :color="record.type === 'article' ? 'blue' : 'cyan'">
                    {{ record.type === "article" ? "文章" : "瞬间" }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'chars'">
                  {{ record.chars }} 字
                </template>
                <template v-else-if="column.key === 'updatedAt'">
                  {{ formatStyleTime(record.updatedAt) }}
                </template>
              </template>
            </a-table>
            <a-empty
              v-else
              description="还没有符合条件的已发布文风样本"
            />
          </AdminCard>

          <AdminCard
            v-if="styleStatus.profile"
            icon="ph:chart-line-up-bold"
            title="当前站点画像"
            desc="画像只总结表达习惯，不保存或复制文章原句"
          >
            <pre class="preview-box">{{ JSON.stringify(styleStatus.profile, null, 2) }}</pre>
          </AdminCard>
        </a-space>
      </a-spin>
    </div>

    <div v-show="tab === 'chat'" class="tab-body">
      <a-spin :spinning="cfgLoading">
        <a-space direction="vertical" :size="16" style="width: 100%">
          <AdminCard
            icon="ph:chat-circle-bold"
            title="聊天助手"
            desc="前台哆啦A梦的人设、欢迎语、兜底话术与聊天参数"
          >
            <a-form layout="vertical" size="middle">
              <a-row :gutter="16">
                <a-col :xs="24" :md="8">
                  <a-form-item label="显示名称">
                    <a-input v-model:value="form.ai_pet_display_name" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :md="8">
                  <a-form-item label="简介">
                    <a-input v-model:value="form.ai_pet_description" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :md="8">
                  <a-form-item label="站长用户名">
                    <a-input
                      v-model:value="form.ai_owner_username"
                      placeholder="例如：阿风"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-form-item label="聊天系统提示词">
                <a-textarea
                  v-model:value="form.ai_pet_system_prompt"
                  :rows="7"
                />
              </a-form-item>

              <a-form-item label="欢迎语（每行一条）">
                <a-textarea v-model:value="greetingsText" :rows="4" />
              </a-form-item>

              <a-row :gutter="16">
                <a-col :xs="24" :md="12">
                  <a-form-item label="未配置 API 时回复">
                    <a-textarea
                      v-model:value="form.ai_fallback_unconfigured"
                      :rows="3"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :md="12">
                  <a-form-item label="请求失败时回复">
                    <a-textarea
                      v-model:value="form.ai_fallback_error"
                      :rows="3"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-divider class="sub-divider" orientation="left">聊天参数</a-divider>
              <a-alert
                class="cost-limit-alert"
                type="info"
                show-icon
                message="聊天额度在调用模型前扣减；游客同时受浏览器标识和 IP 双重限制。"
              />
              <a-row :gutter="16">
                <a-col :xs="24" :sm="8">
                  <a-form-item label="聊天模型">
                    <a-select
                      v-model:value="form.ai_chat_model_config_id"
                      :options="modelOptions"
                      allow-clear
                      placeholder="默认模型"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="聊天 temp">
                    <a-input-number
                      v-model:value="form.ai_chat_temperature"
                      :min="0"
                      :max="2"
                      :step="0.1"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="登录用户输出 tokens">
                    <a-input-number
                      v-model:value="form.ai_chat_max_tokens"
                      :min="64"
                      :max="1024"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :xs="24" :sm="8">
                  <a-form-item label="登录用户每日额度">
                    <a-input-number
                      v-model:value="form.ai_daily_quota"
                      :min="1"
                      :max="1000"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="游客每日额度">
                    <a-input-number
                      v-model:value="form.ai_guest_daily_quota"
                      :min="1"
                      :max="100"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="单 IP 游客每日总额度">
                    <a-input-number
                      v-model:value="form.ai_guest_ip_daily_quota"
                      :min="1"
                      :max="1000"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :xs="24" :sm="8">
                  <a-form-item label="单条输入字符数">
                    <a-input-number
                      v-model:value="form.ai_chat_input_max_chars"
                      :min="100"
                      :max="1000"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="游客输出 tokens">
                    <a-input-number
                      v-model:value="form.ai_guest_chat_max_tokens"
                      :min="64"
                      :max="512"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="文章上下文字符数">
                    <a-input-number
                      v-model:value="form.ai_chat_article_context_max_chars"
                      :min="500"
                      :max="8000"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :xs="24" :sm="12">
                  <a-form-item label="历史条数">
                    <a-input-number
                      v-model:value="form.ai_history_limit"
                      :min="4"
                      :max="60"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12">
                  <a-form-item label="历史字符预算">
                    <a-input-number
                      v-model:value="form.ai_history_char_budget"
                      :min="500"
                      :max="20000"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </AdminCard>

          <AdminCard
            icon="ph:database-bold"
            title="知识库"
            desc="聊天助手回答时检索的文章上下文来源"
          >
            <a-form layout="vertical" size="middle">
              <a-row :gutter="16">
                <a-col :xs="24" :sm="8">
                  <a-form-item label="启用知识库">
                    <a-switch v-model:checked="form.ai_knowledge_enabled" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="目录条数">
                    <a-input-number
                      v-model:value="form.ai_knowledge_catalog_limit"
                      :min="1"
                      :max="50"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="Top-K">
                    <a-input-number
                      v-model:value="form.ai_knowledge_top_k"
                      :min="1"
                      :max="10"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :xs="24" :sm="8">
                  <a-form-item label="片段长度">
                    <a-input-number
                      v-model:value="form.ai_knowledge_snippet_len"
                      :min="100"
                      :max="2000"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="16">
                  <a-form-item label="预览检索">
                    <div class="knowledge-preview-search">
                      <a-input
                        v-model:value="previewQuery"
                        placeholder="输入问题，预览会注入的知识上下文"
                        @press-enter="runPreview"
                      ><template #prefix><Icon name="ph:magnifying-glass" /></template></a-input>
                      <a-button type="primary" :loading="previewLoading" @click="runPreview"><Icon name="ph:eye-bold" /> 预览</a-button>
                    </div>
                  </a-form-item>
                </a-col>
              </a-row>

              <pre v-if="previewText" class="preview-box">{{
                previewText
              }}</pre>
            </a-form>
          </AdminCard>

          <AdminCard
            icon="ph:archive-bold"
            title="当前知识库文章"
            desc="已发布并纳入知识库检索的文章清单"
          >
            <template #extra>
              <AdminRefreshButton
                size="small"
                :loading="knowledgeListLoading"
                @click="loadKnowledgeList"
              />
            </template>
            <a-spin :spinning="knowledgeListLoading">
              <div v-if="knowledgeList.items.length" class="knowledge-list">
                <div
                  v-for="item in knowledgeList.items"
                  :key="item.id"
                  class="knowledge-item"
                >
                  <div class="knowledge-title">
                    <AppLink :to="`/article/${item.slug}`" target="_blank">{{
                      item.title
                    }}</AppLink>
                  </div>
                  <div class="knowledge-meta">
                    <a-tag v-for="tag in item.tags" :key="tag" size="small">{{
                      tag
                    }}</a-tag>
                    <span class="knowledge-category">{{ item.category }}</span>
                    <span class="knowledge-date">{{
                      item.publishedAt?.slice(0, 10)
                    }}</span>
                  </div>
                  <div v-if="item.excerpt" class="knowledge-excerpt">
                    {{ item.excerpt }}
                  </div>
                </div>
              </div>
              <a-empty v-else description="暂无已发布文章" />
            </a-spin>
          </AdminCard>
        </a-space>
      </a-spin>
    </div>

    <div v-show="tab === 'moderation'" class="tab-body">
      <a-spin :spinning="cfgLoading">
        <a-space direction="vertical" :size="16" style="width: 100%">
          <AdminCard
            icon="ph:shield-check-bold"
            title="评论审核"
            desc="全站通用：自动拦截违规评论，可接 AI 模型判别"
          >
            <a-form layout="vertical" size="middle">
              <a-form-item label="评论审核提示词">
                <a-textarea
                  v-model:value="form.ai_moderate_prompt"
                  :rows="8"
                />
              </a-form-item>
              <a-row :gutter="16">
                <a-col :xs="24" :sm="8">
                  <a-form-item label="审核模型">
                    <a-select
                      v-model:value="form.ai_moderate_model_config_id"
                      :options="modelOptions"
                      allow-clear
                      placeholder="默认模型"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="审核 temp">
                    <a-input-number
                      v-model:value="form.ai_moderate_temperature"
                      :min="0"
                      :max="2"
                      :step="0.1"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="审核 tokens">
                    <a-input-number
                      v-model:value="form.ai_moderate_max_tokens"
                      :min="64"
                      :max="1024"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </AdminCard>

          <AdminCard
            icon="ph:handshake-bold"
            title="友链审核"
            desc="自动审核友链申请，支持要求对方先加本站友链"
          >
            <a-form layout="vertical" size="middle">
              <a-form-item label="要求对方先添加本站友链">
                <a-switch v-model:checked="form.ai_friend_require_backlink" />
              </a-form-item>

              <a-row :gutter="16">
                <a-col :xs="24" :sm="8">
                  <a-form-item label="友链模型">
                    <a-select
                      v-model:value="form.ai_friend_moderate_model_config_id"
                      :options="modelOptions"
                      allow-clear
                      placeholder="默认模型"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="友链 temp">
                    <a-input-number
                      v-model:value="form.ai_friend_moderate_temperature"
                      :min="0"
                      :max="1"
                      :step="0.1"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="友链 tokens">
                    <a-input-number
                      v-model:value="form.ai_friend_moderate_max_tokens"
                      :min="64"
                      :max="1024"
                      style="width: 100%"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
              <a-form-item label="友链审核提示词">
                <a-textarea
                  v-model:value="form.ai_friend_moderate_prompt"
                  :rows="8"
                />
              </a-form-item>
            </a-form>
          </AdminCard>
        </a-space>
      </a-spin>
    </div>

    <div v-show="tab === 'chats'" class="tab-body chats-tab">
      <AdminAiUsage />
    </div>

    <a-modal
      v-model:open="modelDialog.open"
      :title="modelDialog.id ? '编辑模型配置' : '新增模型配置'"
      :confirm-loading="modelSaving"
      ok-text="保存"
      cancel-text="取消"
      width="620px"
      @ok="saveModel"
    >
      <a-form layout="vertical" :model="modelDialog">
        <a-row :gutter="16">
          <a-col :xs="24" :sm="12">
            <a-form-item label="配置名称" required
              ><a-input
                v-model:value="modelDialog.name"
                placeholder="例如：DeepSeek Flash"
            /></a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item label="服务商" required>
              <a-auto-complete
                v-model:value="modelDialog.provider"
                :options="providerOptions"
                placeholder="deepseek / qwen"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="API Key">
          <a-input-password
            v-model:value="modelDialog.apiKey"
            :placeholder="modelDialog.id ? '留空保留原密钥' : 'sk-...'"
            autocomplete="new-password"
          />
          <div v-if="modelDialog.id && modelDialog.hasApiKey" class="field-tip">
            已配置密钥，留空不会覆盖。
          </div>
        </a-form-item>
        <a-form-item label="Base URL" required
          ><a-input
            v-model:value="modelDialog.baseUrl"
            placeholder="https://api.deepseek.com"
        /></a-form-item>
        <a-form-item label="模型标识" required
          ><a-input
            v-model:value="modelDialog.model"
            placeholder="deepseek-v4-flash"
        /></a-form-item>
        <a-row :gutter="16">
          <a-col :xs="24" :sm="8"
            ><a-form-item label="启用"
              ><a-switch v-model:checked="modelDialog.enabled" /></a-form-item
          ></a-col>
          <a-col :xs="24" :sm="8"
            ><a-form-item label="设为默认"
              ><a-switch v-model:checked="modelDialog.isDefault" /></a-form-item
          ></a-col>
          <a-col :xs="24" :sm="8"
            ><a-form-item label="排序"
              ><a-input-number
                v-model:value="modelDialog.sort"
                :min="0"
                style="width: 100%" /></a-form-item
          ></a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin", middleware: "auth", ssr: false });

type AiModelItem = {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  isDefault: boolean;
  sort: number;
  hasApiKey: boolean;
  apiKeyMasked: string;
};

const route = useRoute();
const router = useRouter();
const api = useApi();
const toast = useToast();

const validTabs = new Set(["base", "content", "style", "chat", "moderation", "chats"]);
const tab = ref(validTabs.has(String(route.query.tab)) ? String(route.query.tab) : "base");
watch(tab, (value) => {
  const query = { ...route.query };
  if (value === "base") delete query.tab;
  else query.tab = value;
  router.replace({ query });
});
watch(() => route.query.tab, (value) => {
  const nextTab = validTabs.has(String(value)) ? String(value) : "base";
  if (nextTab !== tab.value) tab.value = nextTab;
});

const cfgLoading = ref(true);
const saving = ref(false);
const testing = ref(false);
const apiConfigured = ref(false);
const defaults = ref<Record<string, any>>({});
const form = reactive<Record<string, any>>({});
const modelsLoading = ref(false);
const modelSaving = ref(false);
const testingModelId = ref("");
const models = ref<AiModelItem[]>([]);
const providerOptions = [
  { value: "deepseek" },
  { value: "qwen" },
  { value: "openai" },
];
const modelOptions = computed(() =>
  models.value
    .filter((item) => item.enabled)
    .map((item) => ({
      value: item.id,
      label: item.name || "DeepSeek Flash",
    })),
);
const modelDialog = reactive({
  open: false,
  id: "",
  name: "",
  provider: "deepseek",
  apiKey: "",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-v4-flash",
  enabled: true,
  isDefault: false,
  sort: 0,
  hasApiKey: false,
});
const greetingsText = ref("");
const previewQuery = ref("");
const previewLoading = ref(false);
const previewText = ref("");
const styleLoading = ref(false);
const styleRebuilding = ref(false);
const styleStatus = reactive({
  enabled: true,
  eligible: false,
  sampleCount: 0,
  minimum: 8,
  profile: null as Record<string, unknown> | null,
  updatedAt: "" as string | null,
  samples: [] as Array<{
    id: string;
    type: "article" | "moment";
    title: string;
    chars: number;
    updatedAt: string;
    publishedAt: string | null;
  }>,
});
const styleSampleColumns = [
  { title: "类型", key: "type", width: 90 },
  { title: "样本内容", dataIndex: "title", key: "title" },
  { title: "正文长度", key: "chars", width: 110 },
  { title: "最后更新", key: "updatedAt", width: 180 },
];
const styleStrengthOptions = [
  { value: "light", label: "轻度参考" },
  { value: "balanced", label: "平衡" },
  { value: "strong", label: "明显保持" },
];

const knowledgeListLoading = ref(false);
const knowledgeList = ref<{ total: number; items: any[] }>({
  total: 0,
  items: [],
});

onMounted(async () => {
  await Promise.all([loadConfig(), loadModels(), loadStyleStatus()]);
  await loadKnowledgeList();
});

async function loadStyleStatus() {
  styleLoading.value = true;
  try {
    Object.assign(styleStatus, await api.get<any>("/ai/admin/style"));
  } catch {
    toast.error("加载站点文风状态失败");
  } finally {
    styleLoading.value = false;
  }
}

async function rebuildStyle() {
  styleRebuilding.value = true;
  try {
    await api.post("/ai/admin/style/rebuild");
    await loadStyleStatus();
    toast.success("站点文风画像已更新");
  } catch (error: any) {
    toast.error(error?.message || "站点文风画像建立失败");
  } finally {
    styleRebuilding.value = false;
  }
}

function formatStyleTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function loadModels() {
  modelsLoading.value = true;
  try {
    models.value = await api.get<AiModelItem[]>("/ai/admin/models");
  } catch {
    models.value = [];
    toast.error("加载模型配置失败");
  } finally {
    modelsLoading.value = false;
    applySingleModelDefaults();
  }
}

function applySingleModelDefaults() {
  const enabledModels = models.value.filter((item) => item.enabled);
  if (enabledModels.length !== 1) return;
  const modelId = enabledModels[0].id;
  const modelKeys = [
    "ai_chat_model_config_id",
    "ai_summarize_model_config_id",
    "ai_moderate_model_config_id",
    "ai_friend_moderate_model_config_id",
    "ai_article_model_config_id",
    "ai_moment_model_config_id",
    "ai_library_model_config_id",
  ];
  modelKeys.forEach((key) => {
    if (!form[key]) form[key] = modelId;
  });
}

function resetModelDialog() {
  Object.assign(modelDialog, {
    open: true,
    id: "",
    name: "",
    provider: "deepseek",
    apiKey: "",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-flash",
    enabled: true,
    isDefault: !models.value.length,
    sort: models.value.length,
    hasApiKey: false,
  });
}

function openCreateModel() {
  resetModelDialog();
}

function openEditModel(item: AiModelItem) {
  Object.assign(modelDialog, {
    open: true,
    id: item.id,
    name: item.name,
    provider: item.provider,
    apiKey: "",
    baseUrl: item.baseUrl,
    model: item.model,
    enabled: item.enabled,
    isDefault: item.isDefault,
    sort: item.sort,
    hasApiKey: item.hasApiKey,
  });
}

async function saveModel() {
  if (
    !modelDialog.name.trim() ||
    !modelDialog.provider.trim() ||
    !modelDialog.baseUrl.trim() ||
    !modelDialog.model.trim()
  ) {
    toast.warning("请完整填写名称、服务商、Base URL 和模型标识");
    return;
  }
  modelSaving.value = true;
  const payload = {
    name: modelDialog.name.trim(),
    provider: modelDialog.provider.trim(),
    apiKey: modelDialog.apiKey.trim() || undefined,
    baseUrl: modelDialog.baseUrl.trim(),
    model: modelDialog.model.trim(),
    enabled: modelDialog.enabled,
    isDefault: modelDialog.isDefault,
    sort: modelDialog.sort,
  };
  try {
    if (modelDialog.id)
      await api.put(`/ai/admin/models/${modelDialog.id}`, payload);
    else await api.post("/ai/admin/models", payload);
    modelDialog.open = false;
    toast.success("模型配置已保存");
    await loadModels();
  } catch (error: any) {
    toast.error(error?.message || "模型配置保存失败");
  } finally {
    modelSaving.value = false;
  }
}

async function testModel(item: AiModelItem) {
  testingModelId.value = item.id;
  try {
    const res = await api.post<any>(`/ai/admin/models/${item.id}/test`);
    if (res.success) toast.success(`${item.name} 连接成功`);
    else toast.error(res.message || "连接失败");
  } catch (error: any) {
    toast.error(error?.message || "连接失败");
  } finally {
    testingModelId.value = "";
  }
}

function removeModel(item: AiModelItem) {
  Modal.confirm({
    title: "删除模型配置",
    content: `确认删除「${item.name}」？使用它的应用将自动回退到默认模型。`,
    okText: "删除",
    okType: "danger",
    cancelText: "取消",
    onOk: async () => {
      try {
        await api.delete(`/ai/admin/models/${item.id}`);
        toast.success("已删除");
        await loadModels();
      } catch (error: any) {
        toast.error(error?.message || "删除失败");
      }
    },
  });
}

function applyConfig(cfg: Record<string, any>) {
  Object.keys(cfg).forEach((key) => {
    form[key] = cfg[key];
  });
  greetingsText.value = Array.isArray(cfg.ai_pet_greetings)
    ? cfg.ai_pet_greetings.join("\n")
    : String(cfg.ai_pet_greetings || "");
}

async function loadConfig() {
  cfgLoading.value = true;
  try {
    const res = await api.get<any>("/ai/admin/config");
    defaults.value = res.defaults || {};
    apiConfigured.value = !!res.apiConfigured;
    applyConfig(res.config || {});
  } catch {
    toast.error("加载 AI 配置失败");
  } finally {
    cfgLoading.value = false;
    applySingleModelDefaults();
  }
}

async function saveConfig() {
  saving.value = true;
  try {
    const payload = {
      ...form,
      ai_pet_greetings: greetingsText.value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    };
    const res = await api.put<any>("/ai/admin/config", { config: payload });
    applyConfig(res.config || payload);
    await loadStyleStatus();
    apiConfigured.value = !!res.apiConfigured;
    toast.success("已保存");
    return true;
  } catch {
    toast.error("保存失败");
    return false;
  } finally {
    saving.value = false;
  }
}

async function testConnection() {
  testing.value = true;
  try {
    const saved = await saveConfig();
    if (!saved) return;
    const res = await api.post<any>("/ai/admin/test");
    if (res.success) toast.success(res.message || "连接成功");
    else toast.error(res.message || "连接失败");
    apiConfigured.value = !!res.success;
  } catch (error: any) {
    toast.error(error?.message || "连接失败");
  } finally {
    testing.value = false;
  }
}

function resetDefaults() {
  if (!Object.keys(defaults.value || {}).length) return;
  applyConfig(defaults.value);
  toast.info("已经填入默认值，记得点击保存。");
}

async function runPreview() {
  previewLoading.value = true;
  try {
    const res = await api.post<any>("/ai/admin/knowledge/preview", {
      query: previewQuery.value,
      enabled: form.ai_knowledge_enabled,
      catalogLimit: form.ai_knowledge_catalog_limit,
      topK: form.ai_knowledge_top_k,
      snippetLen: form.ai_knowledge_snippet_len,
    });
    previewText.value = res.context || "";
  } catch {
    toast.error("预览失败");
  } finally {
    previewLoading.value = false;
  }
}

async function loadKnowledgeList() {
  knowledgeListLoading.value = true;
  try {
    const res = await api.get<any>("/ai/admin/knowledge/list");
    knowledgeList.value = { total: res.total || 0, items: res.items || [] };
  } catch {
    toast.error("加载知识库文章失败");
  } finally {
    knowledgeListLoading.value = false;
  }
}

function formatTime(value?: string) {
  if (!value) return "";
  return String(value).slice(0, 16).replace("T", " ");
}

useHead({ title: "功能与模型" });
</script>

<style scoped>
.ai-admin {
  width: 100%;
}

.tab-body {
  margin-top: 4px;
}
.knowledge-preview-search { display:flex; align-items:center; gap:8px; }
.knowledge-preview-search :deep(.ant-input-affix-wrapper) { flex:1; min-width:0; }

.cost-limit-alert {
  margin-bottom: 16px;
}
.section-card {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--ld-shadow) 16%, transparent);
}

.inline-alert {
  margin-bottom: 14px;
}

.sub-divider {
  margin: 6px 0 14px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--c-primary);
}
.sub-divider::before,
.sub-divider::after {
  border-color: color-mix(in srgb, var(--border) 80%, transparent);
}

/* ===== 顶部操作区 ===== */
.page-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.status-alert {
  flex: 1;
  min-width: 260px;
}
.page-action-buttons {
  flex-shrink: 0;
}

.switch-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--c-bg-2) 86%, transparent);
  transition: border 0.2s;
  border: 1px solid transparent;
}
.switch-item:hover {
  border-color: color-mix(in srgb, var(--c-primary) 22%, var(--border));
}
.switch-label {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.switch-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--c-bg-1);
  color: var(--c-primary);
  font-size: 1rem;
}
.switch-name {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--c-text);
  line-height: 1.3;
}
.switch-note {
  font-size: 0.7rem;
  color: var(--c-text-3);
  line-height: 1.3;
}

.model-list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
}

.model-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 15px 2px;
  border-bottom: 1px solid var(--border);
}

.model-row.disabled {
  opacity: 0.62;
}

.model-main {
  min-width: 0;
}

.model-title,
.model-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.model-title strong {
  color: var(--c-text);
}

.model-meta {
  margin-top: 7px;
  color: var(--c-text-3);
  font-size: 0.76rem;
}

.model-meta code {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--c-bg-1);
  color: var(--c-primary);
}

.field-tip {
  margin-top: 5px;
  color: var(--c-text-3);
  font-size: 0.74rem;
}

.dual-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.actions {
  display: flex;
  gap: 10px;
}

.preview-box {
  margin: 0;
  padding: 12px;
  max-height: 320px;
  overflow: auto;
  border-radius: 12px;
  background: var(--c-bg-1);
  border: 1px solid var(--border);
  font-size: 0.78rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.knowledge-item {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--c-bg-1);
}

.knowledge-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.knowledge-title a {
  color: var(--c-primary);
  text-decoration: none;
}

.knowledge-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 0.78rem;
  color: var(--c-text-2);
}

.knowledge-category,
.knowledge-date {
  color: var(--c-text-3);
}

.knowledge-excerpt {
  font-size: 0.82rem;
  color: var(--c-text-2);
  line-height: 1.55;
}

.chats-layout {
  display: grid;
  grid-template-columns: minmax(260px, 320px) 1fr;
  gap: 12px;
  min-height: 520px;
}

.conv-list :deep(.ant-card-body) {
  max-height: 640px;
  overflow-y: auto;
  padding: 8px;
}

.conv-item {
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  margin-bottom: 6px;
}

.conv-item:hover {
  background: var(--c-bg-1);
}

.conv-item.active {
  background: var(--c-primary-soft);
  border-color: color-mix(in srgb, var(--c-primary) 30%, transparent);
}

.conv-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.conv-preview {
  font-size: 0.78rem;
  color: var(--c-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted {
  color: var(--c-text-3);
  font-size: 0.75rem;
}

.tiny {
  font-size: 0.7rem;
  margin-top: 2px;
}

.conv-detail :deep(.ant-card-body) {
  max-height: 640px;
  overflow-y: auto;
}

.msg-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 88%;
}

.msg-row.user {
  align-self: flex-end;
  align-items: flex-end;
}

.msg-row.assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.msg-meta {
  display: flex;
  gap: 8px;
  font-size: 0.7rem;
  color: var(--c-text-3);
}

.msg-bubble {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 0.84rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.msg-row.user .msg-bubble {
  background: var(--c-primary);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.msg-row.assistant .msg-bubble {
  background: var(--c-bg-1);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
}

@media (max-width: 980px) {
  .dual-grid,
  .chats-layout {
    grid-template-columns: 1fr;
  }

  .switch-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .switch-grid {
    grid-template-columns: 1fr;
  }

  .page-actions {
    flex-direction: column;
  }
  .page-action-buttons {
    width: 100%;
  }
  .page-action-buttons .ant-btn {
    flex: 1;
  }

  .model-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .model-actions {
    width: 100%;
  }
}
</style>
