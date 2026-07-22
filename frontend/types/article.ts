export interface Reply {
  name: string
  avatar: string
  time: string
  content: string
}

export interface Comment {
  id: string
  name: string
  avatar: string
  time: string
  content: string
  hot?: boolean
  author?: boolean
  liked?: boolean
  likes?: number
  replies?: Reply[]
}
