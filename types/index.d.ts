export type PaperTeamBoard = {
  board: string
  live: string
  readAt: string
}

declare module 'claude-code' {
  interface PluginState {
    'paper-team': {
      teamMode: boolean
      liveShare: boolean
      isPrivate: boolean
      board: PaperTeamBoard | null
    }
  }
}
