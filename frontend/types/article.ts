export interface Reply {
  id: string
  userId?: string
  name: string
  avatar: string
  time: string
  content: string
  replyTo?: string
  replyToId?: string
  status?: 'pending' | 'approved' | 'rejected'
  createdAt?: string
}

export interface Comment {
  id: string
  userId?: string
  name: string
  avatar: string
  time: string
  content: string
  createdAt?: string
  status?: 'pending' | 'approved' | 'rejected'
  hot?: boolean
  author?: boolean
  liked?: boolean
  likes?: number
  replies?: Reply[]
  localReplies?: Reply[]
  replyCount?: number
}

export interface CommentPage {
  items: Comment[]
  total: number
  page: number
  totalPages: number
}
