import Antd from 'ant-design-vue'
import {
  AppstoreOutlined, AudioOutlined, BankOutlined, BookOutlined, BulbOutlined,
  CameraOutlined, CheckOutlined, ClockCircleOutlined, CloudOutlined, CodeOutlined,
  CoffeeOutlined, CompassOutlined, CopyrightOutlined, CrownOutlined,
  DeleteOutlined,
  EditOutlined, EnvironmentOutlined, ExperimentOutlined, EyeOutlined,
  FileOutlined, FileTextOutlined, FileUnknownOutlined, FireOutlined, FlagOutlined,
  FolderAddOutlined, FolderFilled, FolderOpenOutlined, FolderOutlined, FrownOutlined,
  GiftOutlined, GlobalOutlined,
  HeartOutlined, HomeOutlined,
  InboxOutlined,
  KeyOutlined,
  LinkOutlined,
  MailOutlined, MehOutlined, MessageOutlined,
  NotificationOutlined,
  PaperClipOutlined, PhoneOutlined, PictureOutlined, PlaySquareOutlined, PlusOutlined, PushpinOutlined,
  ReadOutlined, RiseOutlined, RocketOutlined,
  SafetyOutlined, ScanOutlined, SendOutlined, SettingOutlined, ShoppingOutlined, SkinOutlined, SmileOutlined, SoundOutlined, StarOutlined, SwapOutlined, SyncOutlined,
  TagOutlined, TagsOutlined, TeamOutlined, ThunderboltOutlined, ToolOutlined, TrophyOutlined,
  UploadOutlined, UserOutlined,
  VideoCameraOutlined,
  WalletOutlined, WifiOutlined,
} from '@ant-design/icons-vue'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Antd)
  const icons = {
    AppstoreOutlined, AudioOutlined, BankOutlined, BookOutlined, BulbOutlined,
    CameraOutlined, CheckOutlined, ClockCircleOutlined, CloudOutlined, CodeOutlined,
    CoffeeOutlined, CompassOutlined, CopyrightOutlined, CrownOutlined,
    DeleteOutlined,
    EditOutlined, EnvironmentOutlined, ExperimentOutlined, EyeOutlined,
    FileOutlined, FileTextOutlined, FileUnknownOutlined, FireOutlined, FlagOutlined,
    FolderAddOutlined, FolderFilled, FolderOpenOutlined, FolderOutlined, FrownOutlined,
    GiftOutlined, GlobalOutlined,
    HeartOutlined, HomeOutlined,
    InboxOutlined,
    KeyOutlined,
    LinkOutlined,
    MailOutlined, MehOutlined, MessageOutlined,
    NotificationOutlined,
    PaperClipOutlined, PhoneOutlined, PictureOutlined, PlaySquareOutlined, PlusOutlined, PushpinOutlined,
    ReadOutlined, RiseOutlined, RocketOutlined,
    SafetyOutlined, ScanOutlined, SendOutlined, SettingOutlined, ShoppingOutlined, SkinOutlined, SmileOutlined, SoundOutlined, StarOutlined, SwapOutlined, SyncOutlined,
    TagOutlined, TagsOutlined, TeamOutlined, ThunderboltOutlined, ToolOutlined, TrophyOutlined,
    UploadOutlined, UserOutlined,
    VideoCameraOutlined,
    WalletOutlined, WifiOutlined,
  }
  for (const [key, component] of Object.entries(icons)) {
    nuxtApp.vueApp.component(key, component)
  }
})
