<template>
  <main class="visitor-admin admin-page-shell">
    <header class="admin-page-head">
      <div>
        <span>VISITORS / MODERATION</span>
        <h1>访客与留言</h1>
        <p>
          基于访客指纹（IP + 归属地 + 浏览器 + 设备）整理留言、漂流瓶与到访档案，关键记录一目了然。
        </p>
      </div>
      <div class="head-actions">
        <a-button href="/guestbook" target="_blank">
          <Icon name="ph:arrow-square-out-bold" />查看留言板
        </a-button>
        <a-button :loading="loading" @click="refresh">
          <Icon name="ph:arrows-clockwise-bold" />刷新
        </a-button>
      </div>
    </header>

    <a-tabs v-model:activeKey="activeTab" size="small">
      <a-tab-pane key="messages" tab="留言与漂流瓶" />
      <a-tab-pane key="profiles" tab="访客档案" />
    </a-tabs>

    <a-spin :spinning="loading">
      <!-- ============ 留言与漂流瓶 ============ -->
      <div v-show="activeTab === 'messages'">
        <div class="filter-bar">
          <a-radio-group v-model:value="messageType" size="small" button-style="solid">
            <a-radio-button value="">全部</a-radio-button>
            <a-radio-button value="message">留言</a-radio-button>
            <a-radio-button value="bottle">漂流瓶</a-radio-button>
          </a-radio-group>
          <a-radio-group v-model:value="messageStatus" size="small" button-style="solid">
            <a-radio-button value="">全部状态</a-radio-button>
            <a-radio-button value="approved">已通过</a-radio-button>
            <a-radio-button value="pending">待审</a-radio-button>
            <a-radio-button value="rejected">已拒绝</a-radio-button>
          </a-radio-group>
          <a-input-search
            v-model:value="keyword"
            size="small"
            placeholder="搜索内容或昵称"
            class="filter-search"
            allow-clear
            @search="refresh"
          />
        </div>

        <a-table
          :data-source="messageItems"
          :columns="messageColumns"
          :pagination="{
            current: messagePage,
            pageSize: messageLimit,
            total: messageTotal,
            size: 'small',
            showSizeChanger: false,
          }"
          row-key="id"
          size="small"
          @change="onMessageTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'type'">
              <a-tag :color="record.type === 'bottle' ? 'cyan' : 'green'">
                {{ record.type === "bottle" ? "漂流瓶" : "留言" }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'content'">
              <span class="msg-content">{{ record.content }}</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag
                :color="
                  record.status === 'approved'
                    ? 'success'
                    : record.status === 'pending'
                      ? 'warning'
                      : 'error'
                "
              >
                {{ statusLabel(record.status) }}
              </a-tag>
              <div v-if="record.rejectReason" class="reject-reason">
                {{ record.rejectReason }}
              </div>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space size="small">
                <a-button
                  v-if="record.status !== 'approved'"
                  size="small"
                  type="link"
                  @click="moderate(record.id, 'approved')"
                >
                  通过
                </a-button>
                <a-button
                  v-if="record.status !== 'rejected'"
                  size="small"
                  type="link"
                  danger
                  @click="moderate(record.id, 'rejected')"
                >
                  拒绝
                </a-button>
                <a-popconfirm title="确定删除这条记录？" @confirm="removeMessage(record.id)">
                  <a-button size="small" type="link" danger>删除</a-button>
                </a-popconfirm>
              </a-space>
            </template>
            <template v-else-if="column.key === 'createdAt'">
              {{ formatTime(record.createdAt) }}
            </template>
          </template>
        </a-table>
      </div>

      <!-- ============ 访客档案 ============ -->
      <div v-show="activeTab === 'profiles'">
        <div class="filter-bar">
          <a-input-search
            v-model:value="profileKeyword"
            size="small"
            placeholder="搜索昵称"
            class="filter-search"
            allow-clear
            @search="loadProfiles"
          />
        </div>
        <a-table
          :data-source="profileItems"
          :columns="profileColumns"
          :pagination="{
            current: profilePage,
            pageSize: profileLimit,
            total: profileTotal,
            size: 'small',
            showSizeChanger: false,
          }"
          row-key="id"
          size="small"
          @change="onProfileTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'nickname'">
              <span class="profile-name">{{ record.nickname }}</span>
              <span class="profile-hash">{{ shortHash(record.visitorIdHash) }}</span>
            </template>
            <template v-else-if="column.key === 'environment'">
              <span class="profile-env">{{ record.environment || record.region || "未知环境" }}</span>
            </template>
            <template v-else-if="column.key === 'visitCount'">
              {{ record.visitCount }} 次到访 · {{ record.messageCount }} 条互动
            </template>
            <template v-else-if="column.key === 'lastSeenAt'">
              {{ formatTime(record.lastSeenAt) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space size="small">
                <a-tag :color="record.isBanned ? 'error' : 'default'">
                  {{ record.isBanned ? "已封禁" : "正常" }}
                </a-tag>
                <a-popconfirm
                  :title="record.isBanned ? '解除该访客的封禁？' : '封禁后该访客将无法留言与捞瓶，确认？'"
                  @confirm="toggleBan(record)"
                >
                  <a-button size="small" type="link" :danger="!record.isBanned">
                    {{ record.isBanned ? "解封" : "封禁" }}
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </template>
        </a-table>
      </div>
    </a-spin>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import type { TableColumnsType } from "ant-design-vue";

const api = useApi();
const toast = useToast();

const activeTab = ref<"messages" | "profiles">("messages");
const loading = ref(false);

const messageType = ref("");
const messageStatus = ref("");
const keyword = ref("");
const messagePage = ref(1);
const messageLimit = 15;
const messageTotal = ref(0);
const messageItems = ref<any[]>([]);

const profileKeyword = ref("");
const profilePage = ref(1);
const profileLimit = 15;
const profileTotal = ref(0);
const profileItems = ref<any[]>([]);

const messageColumns: TableColumnsType = [
  { key: "type", title: "类型", width: 88 },
  { key: "content", title: "内容", ellipsis: true },
  { key: "nickname", title: "昵称", width: 120 },
  { key: "originRegion", title: "属地", width: 140 },
  { key: "status", title: "状态", width: 150 },
  { key: "createdAt", title: "时间", width: 150 },
  { key: "actions", title: "操作", width: 190 },
];

const profileColumns: TableColumnsType = [
  { key: "nickname", title: "访客", width: 180 },
  { key: "environment", title: "环境与属地", ellipsis: true },
  { key: "visitCount", title: "活跃", width: 180 },
  { key: "lastSeenAt", title: "最近到访", width: 160 },
  { key: "actions", title: "操作", width: 140 },
];

function statusLabel(status: string) {
  return status === "approved" ? "已通过" : status === "pending" ? "待审" : "已拒绝";
}

function formatTime(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function shortHash(hash: string) {
  return String(hash || "").slice(0, 8);
}

async function loadMessages() {
  loading.value = true;
  try {
    const result = await api.get<any>("/visitor/admin/messages", {
      type: messageType.value || undefined,
      status: messageStatus.value || undefined,
      q: keyword.value || undefined,
      page: messagePage.value,
      limit: messageLimit,
    });
    messageItems.value = result.items || [];
    messageTotal.value = result.total || 0;
  } catch (error: any) {
    toast.error(error?.message || "记录读取失败");
  } finally {
    loading.value = false;
  }
}

async function loadProfiles() {
  loading.value = true;
  try {
    const result = await api.get<any>("/visitor/admin/profiles", {
      q: profileKeyword.value || undefined,
      page: profilePage.value,
      limit: profileLimit,
    });
    profileItems.value = result.items || [];
    profileTotal.value = result.total || 0;
  } catch (error: any) {
    toast.error(error?.message || "档案读取失败");
  } finally {
    loading.value = false;
  }
}

function refresh() {
  if (activeTab.value === "messages") void loadMessages();
  else void loadProfiles();
}

function onMessageTableChange(pager: { current?: number }) {
  messagePage.value = pager.current || 1;
  void loadMessages();
}

function onProfileTableChange(pager: { current?: number }) {
  profilePage.value = pager.current || 1;
  void loadProfiles();
}

async function moderate(id: string, status: string) {
  try {
    await api.put(`/visitor/admin/messages/${id}/status`, { status });
    toast.success(status === "approved" ? "已通过" : "已拒绝");
    void loadMessages();
  } catch (error: any) {
    toast.error(error?.message || "操作失败");
  }
}

async function removeMessage(id: string) {
  try {
    await api.delete(`/visitor/admin/messages/${id}`);
    toast.success("已删除");
    void loadMessages();
  } catch (error: any) {
    toast.error(error?.message || "删除失败");
  }
}

async function toggleBan(record: any) {
  try {
    await api.put(`/visitor/admin/profiles/${record.id}/ban`, {
      banned: record.isBanned ? "false" : "true",
    });
    toast.success(record.isBanned ? "已解封" : "已封禁");
    void loadProfiles();
  } catch (error: any) {
    toast.error(error?.message || "操作失败");
  }
}

watch(messageType, () => {
  messagePage.value = 1;
  void loadMessages();
});
watch(messageStatus, () => {
  messagePage.value = 1;
  void loadMessages();
});

onMounted(() => {
  void loadMessages();
  void loadProfiles();
});

useHead({ title: "访客与留言 · 管理" });
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.filter-search {
  max-width: 220px;
}

.msg-content {
  color: var(--c-text-1);
}

.reject-reason {
  margin-top: 2px;
  color: var(--c-text-3);
  font-size: 0.62rem;
}

.profile-name {
  font-weight: 650;
}

.profile-hash {
  margin-left: 8px;
  color: var(--c-text-3);
  font-family: var(--font-mono);
  font-size: 0.58rem;
}

.profile-env {
  color: var(--c-text-2);
}
</style>
