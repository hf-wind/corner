<template>
  <div class="ai-admin">
    <a-tabs v-model:activeKey="tab" size="small">
      <a-tab-pane key="settings" tab="AI 配置" />
      <a-tab-pane key="chats" tab="会话管理" />
    </a-tabs>

    <div v-show="tab === 'settings'" class="tab-body">
      <a-spin :spinning="cfgLoading">
        <a-space direction="vertical" :size="16" style="width: 100%">
          <a-alert
            :type="apiConfigured ? 'success' : 'warning'"
            show-icon
            :message="apiConfigured
              ? 'AI 服务已配置，功能会优先使用后台参数。'
              : 'AI 服务暂未就绪，保存 API Key 后才能真正调用模型。'"
          />

          <a-card size="small" title="模型接入" :bordered="false" class="section-card">
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
                    <a-input-number v-model:value="form.ai_request_timeout_ms" :min="3000" :max="120000" :step="1000" style="width:100%" />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>

            <a-spin :spinning="modelsLoading">
              <div v-if="models.length" class="model-list">
                <div v-for="item in models" :key="item.id" class="model-row" :class="{ disabled: !item.enabled }">
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
                      <span>{{ item.apiKeyMasked || (item.hasApiKey ? '环境变量密钥' : '未配置密钥') }}</span>
                    </div>
                  </div>
                  <a-space class="model-actions">
                    <a-button size="small" :loading="testingModelId === item.id" @click="testModel(item)">测试</a-button>
                    <a-button size="small" @click="openEditModel(item)">编辑</a-button>
                    <a-button size="small" danger @click="removeModel(item)">删除</a-button>
                  </a-space>
                </div>
              </div>
              <a-empty v-else description="还没有模型配置" />
            </a-spin>
          </a-card>

          <a-card size="small" title="应用开关" :bordered="false" class="section-card">
            <div class="switch-grid">
                <div class="switch-item">
                  <span>聊天助手</span>
                  <a-switch v-model:checked="form.ai_pet_chat_enabled" />
                </div>
                <div class="switch-item">
                  <span>文章摘要</span>
                  <a-switch v-model:checked="form.ai_summarize_enabled" />
                </div>
                <div class="switch-item">
                  <span>文章生成</span>
                  <a-switch v-model:checked="form.ai_article_enabled" />
                </div>
                <div class="switch-item">
                  <span>瞬间润色</span>
                  <a-switch v-model:checked="form.ai_moment_enabled" />
                </div>
                <div class="switch-item">
                  <span>评论审核</span>
                  <a-switch v-model:checked="form.ai_comment_moderation_enabled" />
                </div>
                <div class="switch-item">
                  <span>友链审核</span>
                  <a-switch v-model:checked="form.ai_friend_moderation_enabled" />
                </div>
                <div class="switch-item">
                  <span>书影音资料</span>
                  <a-switch v-model:checked="form.ai_library_enabled" />
                </div>
              </div>
          </a-card>

          <a-card size="small" title="人设与兜底" :bordered="false" class="section-card">
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
                    <a-input v-model:value="form.ai_owner_username" placeholder="例如：阿风" />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-form-item label="聊天系统提示词">
                <a-textarea v-model:value="form.ai_pet_system_prompt" :rows="7" />
              </a-form-item>

              <a-form-item label="欢迎语（每行一条）">
                <a-textarea v-model:value="greetingsText" :rows="4" />
              </a-form-item>

              <a-row :gutter="16">
                <a-col :xs="24" :md="12">
                  <a-form-item label="未配置 API 时回复">
                    <a-textarea v-model:value="form.ai_fallback_unconfigured" :rows="3" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :md="12">
                  <a-form-item label="请求失败时回复">
                    <a-textarea v-model:value="form.ai_fallback_error" :rows="3" />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </a-card>

          <div class="dual-grid">
            <a-card size="small" title="文章 AI" :bordered="false" class="section-card">
              <a-form layout="vertical" size="middle">
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
                      <a-select v-model:value="form.ai_article_model_config_id" :options="modelOptions" allow-clear placeholder="默认模型" />
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
              </a-form>
            </a-card>

            <a-card size="small" title="瞬间 AI" :bordered="false" class="section-card">
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
                      <a-select v-model:value="form.ai_moment_model_config_id" :options="modelOptions" allow-clear placeholder="默认模型" />
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
            </a-card>
          </div>

          <a-card size="small" title="书影音 AI" :bordered="false" class="section-card">
            <a-form layout="vertical" size="middle">
              <a-form-item label="资料整理提示词">
                <a-textarea v-model:value="form.ai_library_prompt" :rows="6" />
              </a-form-item>
              <a-row :gutter="16">
                <a-col :xs="24" :sm="8">
                  <a-form-item label="书影音模型">
                    <a-select v-model:value="form.ai_library_model_config_id" :options="modelOptions" allow-clear placeholder="默认模型" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="temperature">
                    <a-input-number v-model:value="form.ai_library_temperature" :min="0" :max="2" :step="0.1" style="width:100%" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <a-form-item label="maxTokens">
                    <a-input-number v-model:value="form.ai_library_max_tokens" :min="512" :max="8000" style="width:100%" />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>
          </a-card>

          <div class="dual-grid">
            <a-card size="small" title="摘要与评论审核" :bordered="false" class="section-card">
              <a-form layout="vertical" size="middle">
                <a-form-item label="文章摘要提示词">
                  <a-textarea v-model:value="form.ai_summarize_prompt" :rows="5" />
                </a-form-item>
                <a-row :gutter="16">
                  <a-col :xs="24" :sm="4">
                    <a-form-item label="摘要模型">
                      <a-select v-model:value="form.ai_summarize_model_config_id" :options="modelOptions" allow-clear placeholder="默认模型" />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="4">
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
                  <a-col :xs="24" :sm="4">
                    <a-form-item label="摘要 tokens">
                      <a-input-number
                        v-model:value="form.ai_summarize_max_tokens"
                        :min="64"
                        :max="1024"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="4">
                    <a-form-item label="审核模型">
                      <a-select v-model:value="form.ai_moderate_model_config_id" :options="modelOptions" allow-clear placeholder="默认模型" />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="4">
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
                  <a-col :xs="24" :sm="4">
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
                <a-form-item label="评论审核提示词">
                  <a-textarea v-model:value="form.ai_moderate_prompt" :rows="8" />
                </a-form-item>
              </a-form>
            </a-card>

            <a-card size="small" title="聊天与友链审核" :bordered="false" class="section-card">
              <a-form layout="vertical" size="middle">
                <a-row :gutter="16">
                  <a-col :xs="24" :sm="8">
                    <a-form-item label="聊天模型">
                      <a-select v-model:value="form.ai_chat_model_config_id" :options="modelOptions" allow-clear placeholder="默认模型" />
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
                    <a-form-item label="聊天 tokens">
                      <a-input-number
                        v-model:value="form.ai_chat_max_tokens"
                        :min="64"
                        :max="4096"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>

                <a-row :gutter="16">
                  <a-col :xs="24" :sm="8">
                    <a-form-item label="历史条数">
                      <a-input-number
                        v-model:value="form.ai_history_limit"
                        :min="4"
                        :max="60"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="8">
                    <a-form-item label="历史字符预算">
                      <a-input-number
                        v-model:value="form.ai_history_char_budget"
                        :min="500"
                        :max="20000"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="8">
                    <a-form-item label="每日额度">
                      <a-input-number
                        v-model:value="form.ai_daily_quota"
                        :min="1"
                        :max="100000"
                        style="width: 100%"
                      />
                    </a-form-item>
                  </a-col>
                </a-row>

                <a-form-item label="要求对方先添加本站友链">
                  <a-switch v-model:checked="form.ai_friend_require_backlink" />
                </a-form-item>

                <a-row :gutter="16">
                  <a-col :xs="24" :sm="4">
                    <a-form-item label="友链模型">
                      <a-select v-model:value="form.ai_friend_moderate_model_config_id" :options="modelOptions" allow-clear placeholder="默认模型" />
                    </a-form-item>
                  </a-col>
                  <a-col :xs="24" :sm="4">
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
                  <a-col :xs="24" :sm="4">
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
                  <a-textarea v-model:value="form.ai_friend_moderate_prompt" :rows="8" />
                </a-form-item>
              </a-form>
            </a-card>
          </div>

          <a-card size="small" title="知识库" :bordered="false" class="section-card">
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
                    <a-input-search
                      v-model:value="previewQuery"
                      placeholder="输入问题，预览会注入的知识上下文"
                      enter-button="预览"
                      :loading="previewLoading"
                      @search="runPreview"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <pre v-if="previewText" class="preview-box">{{ previewText }}</pre>
            </a-form>
          </a-card>

          <a-card size="small" title="当前知识库文章" :bordered="false" class="section-card">
            <template #extra>
              <a-button size="small" :loading="knowledgeListLoading" @click="loadKnowledgeList">刷新</a-button>
            </template>
            <a-spin :spinning="knowledgeListLoading">
              <div v-if="knowledgeList.items.length" class="knowledge-list">
                <div v-for="item in knowledgeList.items" :key="item.id" class="knowledge-item">
                  <div class="knowledge-title">
                    <NuxtLink :to="`/article/${item.slug}`" target="_blank">{{ item.title }}</NuxtLink>
                  </div>
                  <div class="knowledge-meta">
                    <a-tag v-for="tag in item.tags" :key="tag" size="small">{{ tag }}</a-tag>
                    <span class="knowledge-category">{{ item.category }}</span>
                    <span class="knowledge-date">{{ item.publishedAt?.slice(0, 10) }}</span>
                  </div>
                  <div v-if="item.excerpt" class="knowledge-excerpt">{{ item.excerpt }}</div>
                </div>
              </div>
              <a-empty v-else description="暂无已发布文章" />
            </a-spin>
          </a-card>

          <div class="actions">
            <a-button type="primary" :loading="saving" @click="saveConfig">保存配置</a-button>
            <a-button :loading="testing" @click="testConnection">测试连接</a-button>
            <a-button @click="resetDefaults">恢复默认</a-button>
          </div>
        </a-space>
      </a-spin>
    </div>

    <div v-show="tab === 'chats'" class="tab-body chats-layout">
      <a-card size="small" :bordered="false" class="section-card conv-list">
        <template #title>会话用户</template>
        <template #extra>
          <a-input-search
            v-model:value="convQuery"
            size="small"
            placeholder="用户名 / 邮箱"
            style="width: 180px"
            allow-clear
            @search="loadConversations"
          />
        </template>
        <a-spin :spinning="convLoading">
          <a-empty v-if="!conversations.length" description="暂无对话" />
          <div
            v-for="conversation in conversations"
            :key="conversation.userId"
            class="conv-item"
            :class="{ active: selectedUserId === conversation.userId }"
            @click="selectConversation(conversation.userId)"
          >
            <div class="conv-top">
              <strong>{{ conversation.username }}</strong>
              <span class="muted">{{ conversation.messageCount }} 条</span>
            </div>
            <div class="conv-preview">{{ conversation.lastMessage?.content || '—' }}</div>
            <div class="muted tiny">{{ formatTime(conversation.lastMessage?.createdAt) }}</div>
          </div>
        </a-spin>
      </a-card>

      <a-card size="small" :bordered="false" class="section-card conv-detail">
        <template #title>
          <span v-if="detail?.user">{{ detail.user.username }} · {{ detail.total }} 条消息</span>
          <span v-else>选择左侧用户查看对话</span>
        </template>
        <template #extra>
          <a-space>
            <a-button size="small" :disabled="!selectedUserId" :loading="detailLoading" @click="loadDetail">
              刷新
            </a-button>
            <a-popconfirm
              title="确认清空这个用户的全部对话？"
              ok-text="清空"
              cancel-text="取消"
              @confirm="clearConversation"
            >
              <a-button size="small" danger :disabled="!selectedUserId">清空</a-button>
            </a-popconfirm>
          </a-space>
        </template>
        <a-spin :spinning="detailLoading">
          <div v-if="detail?.messages?.length" class="msg-list">
            <div v-for="message in detail.messages" :key="message.id" class="msg-row" :class="message.role">
              <div class="msg-meta">
                <span>{{ message.role === 'user' ? '用户' : '哆啦A梦' }}</span>
                <span class="muted">{{ formatTime(message.createdAt) }}</span>
              </div>
              <div class="msg-bubble">{{ message.content }}</div>
            </div>
          </div>
          <a-empty v-else-if="selectedUserId" description="暂无消息" />
          <a-empty v-else description="从左侧选择会话" />
        </a-spin>
      </a-card>
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
            <a-form-item label="配置名称" required><a-input v-model:value="modelDialog.name" placeholder="例如：DeepSeek Flash" /></a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item label="服务商" required>
              <a-auto-complete v-model:value="modelDialog.provider" :options="providerOptions" placeholder="deepseek / qwen" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="API Key">
          <a-input-password v-model:value="modelDialog.apiKey" :placeholder="modelDialog.id ? '留空保留原密钥' : 'sk-...'" autocomplete="new-password" />
          <div v-if="modelDialog.id && modelDialog.hasApiKey" class="field-tip">已配置密钥，留空不会覆盖。</div>
        </a-form-item>
        <a-form-item label="Base URL" required><a-input v-model:value="modelDialog.baseUrl" placeholder="https://api.deepseek.com" /></a-form-item>
        <a-form-item label="模型标识" required><a-input v-model:value="modelDialog.model" placeholder="deepseek-v4-flash" /></a-form-item>
        <a-row :gutter="16">
          <a-col :xs="24" :sm="8"><a-form-item label="启用"><a-switch v-model:checked="modelDialog.enabled" /></a-form-item></a-col>
          <a-col :xs="24" :sm="8"><a-form-item label="设为默认"><a-switch v-model:checked="modelDialog.isDefault" /></a-form-item></a-col>
          <a-col :xs="24" :sm="8"><a-form-item label="排序"><a-input-number v-model:value="modelDialog.sort" :min="0" style="width:100%" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', ssr: false })

type AiModelItem = {
  id: string
  name: string
  provider: string
  baseUrl: string
  model: string
  enabled: boolean
  isDefault: boolean
  sort: number
  hasApiKey: boolean
  apiKeyMasked: string
}

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const tab = ref((route.query.tab as string) === 'chats' ? 'chats' : 'settings')
watch(tab, (value) => {
  router.replace({ query: value === 'settings' ? {} : { tab: value } })
  if (value === 'chats' && !conversations.value.length) void loadConversations()
})

const cfgLoading = ref(true)
const saving = ref(false)
const testing = ref(false)
const apiConfigured = ref(false)
const defaults = ref<Record<string, any>>({})
const form = reactive<Record<string, any>>({})
const modelsLoading = ref(false)
const modelSaving = ref(false)
const testingModelId = ref('')
const models = ref<AiModelItem[]>([])
const providerOptions = [{ value: 'deepseek' }, { value: 'qwen' }, { value: 'openai' }]
const modelOptions = computed(() => models.value
  .filter(item => item.enabled)
  .map(item => ({
    value: item.id,
    label: `${item.name} · ${item.model}${item.isDefault ? '（默认）' : ''}`,
  })))
const modelDialog = reactive({
  open: false,
  id: '',
  name: '',
  provider: 'deepseek',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash',
  enabled: true,
  isDefault: false,
  sort: 0,
  hasApiKey: false,
})
const greetingsText = ref('')
const previewQuery = ref('')
const previewLoading = ref(false)
const previewText = ref('')

const convLoading = ref(false)
const conversations = ref<any[]>([])
const convQuery = ref('')
const selectedUserId = ref('')
const detailLoading = ref(false)
const detail = ref<any>(null)

const knowledgeListLoading = ref(false)
const knowledgeList = ref<{ total: number; items: any[] }>({ total: 0, items: [] })

onMounted(async () => {
  await Promise.all([loadConfig(), loadModels()])
  await loadKnowledgeList()
  if (tab.value === 'chats') await loadConversations()
})

async function loadModels() {
  modelsLoading.value = true
  try {
    models.value = await api.get<AiModelItem[]>('/ai/admin/models')
  } catch {
    models.value = []
    toast.error('加载模型配置失败')
  } finally {
    modelsLoading.value = false
  }
}

function resetModelDialog() {
  Object.assign(modelDialog, {
    open: true,
    id: '',
    name: '',
    provider: 'deepseek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-v4-flash',
    enabled: true,
    isDefault: !models.value.length,
    sort: models.value.length,
    hasApiKey: false,
  })
}

function openCreateModel() {
  resetModelDialog()
}

function openEditModel(item: AiModelItem) {
  Object.assign(modelDialog, {
    open: true,
    id: item.id,
    name: item.name,
    provider: item.provider,
    apiKey: '',
    baseUrl: item.baseUrl,
    model: item.model,
    enabled: item.enabled,
    isDefault: item.isDefault,
    sort: item.sort,
    hasApiKey: item.hasApiKey,
  })
}

async function saveModel() {
  if (!modelDialog.name.trim() || !modelDialog.provider.trim() || !modelDialog.baseUrl.trim() || !modelDialog.model.trim()) {
    toast.warning('请完整填写名称、服务商、Base URL 和模型标识')
    return
  }
  modelSaving.value = true
  const payload = {
    name: modelDialog.name.trim(),
    provider: modelDialog.provider.trim(),
    apiKey: modelDialog.apiKey.trim() || undefined,
    baseUrl: modelDialog.baseUrl.trim(),
    model: modelDialog.model.trim(),
    enabled: modelDialog.enabled,
    isDefault: modelDialog.isDefault,
    sort: modelDialog.sort,
  }
  try {
    if (modelDialog.id) await api.put(`/ai/admin/models/${modelDialog.id}`, payload)
    else await api.post('/ai/admin/models', payload)
    modelDialog.open = false
    toast.success('模型配置已保存')
    await loadModels()
  } catch (error: any) {
    toast.error(error?.message || '模型配置保存失败')
  } finally {
    modelSaving.value = false
  }
}

async function testModel(item: AiModelItem) {
  testingModelId.value = item.id
  try {
    const res = await api.post<any>(`/ai/admin/models/${item.id}/test`)
    if (res.success) toast.success(`${item.name} 连接成功`)
    else toast.error(res.message || '连接失败')
  } catch (error: any) {
    toast.error(error?.message || '连接失败')
  } finally {
    testingModelId.value = ''
  }
}

function removeModel(item: AiModelItem) {
  Modal.confirm({
    title: '删除模型配置',
    content: `确认删除「${item.name}」？使用它的应用将自动回退到默认模型。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await api.delete(`/ai/admin/models/${item.id}`)
        toast.success('已删除')
        await loadModels()
      } catch (error: any) {
        toast.error(error?.message || '删除失败')
      }
    },
  })
}

function applyConfig(cfg: Record<string, any>) {
  Object.keys(cfg).forEach((key) => {
    form[key] = cfg[key]
  })
  greetingsText.value = Array.isArray(cfg.ai_pet_greetings)
    ? cfg.ai_pet_greetings.join('\n')
    : String(cfg.ai_pet_greetings || '')
}

async function loadConfig() {
  cfgLoading.value = true
  try {
    const res = await api.get<any>('/ai/admin/config')
    defaults.value = res.defaults || {}
    apiConfigured.value = !!res.apiConfigured
    applyConfig(res.config || {})
  } catch {
    toast.error('加载 AI 配置失败')
  } finally {
    cfgLoading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const payload = {
      ...form,
      ai_pet_greetings: greetingsText.value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    }
    const res = await api.put<any>('/ai/admin/config', { config: payload })
    applyConfig(res.config || payload)
    apiConfigured.value = !!res.apiConfigured
    toast.success('已保存')
    return true
  } catch {
    toast.error('保存失败')
    return false
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  try {
    const saved = await saveConfig()
    if (!saved) return
    const res = await api.post<any>('/ai/admin/test')
    if (res.success) toast.success(res.message || '连接成功')
    else toast.error(res.message || '连接失败')
    apiConfigured.value = !!res.success
  } catch (error: any) {
    toast.error(error?.message || '连接失败')
  } finally {
    testing.value = false
  }
}

function resetDefaults() {
  if (!Object.keys(defaults.value || {}).length) return
  applyConfig(defaults.value)
  toast.info('已经填入默认值，记得点击保存。')
}

async function runPreview() {
  previewLoading.value = true
  try {
    await api.put('/ai/admin/config', {
      config: {
        ai_knowledge_enabled: form.ai_knowledge_enabled,
        ai_knowledge_catalog_limit: form.ai_knowledge_catalog_limit,
        ai_knowledge_top_k: form.ai_knowledge_top_k,
        ai_knowledge_snippet_len: form.ai_knowledge_snippet_len,
      },
    })
    const res = await api.post<any>('/ai/admin/knowledge/preview', {
      query: previewQuery.value,
    })
    previewText.value = res.context || ''
  } catch {
    toast.error('预览失败')
  } finally {
    previewLoading.value = false
  }
}

async function loadKnowledgeList() {
  knowledgeListLoading.value = true
  try {
    const res = await api.get<any>('/ai/admin/knowledge/list')
    knowledgeList.value = { total: res.total || 0, items: res.items || [] }
  } catch {
    toast.error('加载知识库文章失败')
  } finally {
    knowledgeListLoading.value = false
  }
}

async function loadConversations() {
  convLoading.value = true
  try {
    conversations.value = await api.get<any[]>('/ai/admin/conversations', {
      q: convQuery.value || undefined,
    })
  } catch {
    toast.error('加载会话失败')
  } finally {
    convLoading.value = false
  }
}

async function selectConversation(userId: string) {
  selectedUserId.value = userId
  await loadDetail()
}

async function loadDetail() {
  if (!selectedUserId.value) return
  detailLoading.value = true
  try {
    detail.value = await api.get(`/ai/admin/conversations/${selectedUserId.value}`, {
      page: 1,
      pageSize: 200,
    })
  } catch {
    toast.error('加载对话失败')
  } finally {
    detailLoading.value = false
  }
}

async function clearConversation() {
  if (!selectedUserId.value) return
  try {
    await api.delete(`/ai/admin/conversations/${selectedUserId.value}`)
    toast.success('已清空')
    detail.value = null
    selectedUserId.value = ''
    await loadConversations()
  } catch {
    toast.error('清空失败')
  }
}

function formatTime(value?: string) {
  if (!value) return ''
  return String(value).slice(0, 16).replace('T', ' ')
}

useHead({ title: 'AI 配置' })
</script>

<style scoped>
.ai-admin {
  max-width: 1180px;
}

.tab-body {
  margin-top: 4px;
}

.section-card {
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
  box-shadow: 0 14px 34px color-mix(in srgb, var(--ld-shadow) 16%, transparent);
}

.inline-alert {
  margin-bottom: 14px;
}

.switch-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--c-bg-2) 86%, transparent);
}

.switch-item span {
  color: var(--c-text-2);
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

  .actions {
    flex-direction: column;
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
