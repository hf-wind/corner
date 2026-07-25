export interface Reply {
  id: string
  name: string
  avatar: string
  time: string
  content: string
  replyTo?: string
  status?: 'pending' | 'approved' | 'rejected'
}

export interface Comment {
  id: string
  name: string
  avatar: string
  time: string
  content: string
  status?: 'pending' | 'approved' | 'rejected'
  hot?: boolean
  author?: boolean
  liked?: boolean
  likes?: number
  replies?: Reply[]
  replyCount?: number
}

export interface CommentPage {
  items: Comment[]
  total: number
  page: number
  totalPages: number
}
