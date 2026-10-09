import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { PaperTeamBoard } from '../types'
import type { TeamIds } from './guard'
import { EMPTY_IDS, denyMessage, findSensitive, folderIdFrom, isDriveTool, isDriveWrite, isMaterialsTarget, isTeamTarget, learnIds } from './guard'

const PANE = 'paper-team-board'

const teamMode = atom({ plugin: 'paper-team', key: 'teamMode' } as const, false)
const liveShare = atom({ plugin: 'paper-team', key: 'liveShare' } as const, false)
const isPrivate = atom({ plugin: 'paper-team', key: 'isPrivate' } as const, false)
const board = atom({ plugin: 'paper-team', key: 'board' } as const, null as PaperTeamBoard | null)

// 공유 폴더와 하위 폴더 ID. 하위 폴더 ID는 Drive 결과에서 알아내 $.store에 둔다.
// 검사가 실패했을 때(.catch)는 $를 쓸 수 없으므로 마지막으로 읽은 값을 여기 둔다.
let lastIds: TeamIds = EMPTY_IDS

async function loadIds($: EngineInterface, rootId: string): Promise<TeamIds> {
  if (!rootId) return lastIds
  const stored = (await $.store.get(`ids:${rootId}`)) as Partial<TeamIds> | undefined
  lastIds = { root: [rootId], materials: stored?.materials ?? [], others: stored?.others ?? [] }
  return lastIds
}

// Drive 결과에서 공유 폴더의 하위 폴더 ID를 알아내 저장한다.
async function remember<R extends { text?: string }>($: EngineInterface, ran: R, known: TeamIds, rootId: string): Promise<R> {
  if (!rootId || typeof ran.text !== 'string') return ran
  const learned = learnIds(ran.text, known)
  if (learned.materials.length !== known.materials.length || learned.others.length !== known.others.length) {
    lastIds = learned
    await $.store.set(`ids:${rootId}`, { materials: learned.materials, others: learned.others })
  }
  return ran
}

// 인자가 on/off면 그대로, 비어 있으면 현재 값을 뒤집는다.
function nextValue(args: string, current: boolean): boolean {
  const word = args.trim().toLowerCase()
  if (['on', '켜', 'true', '1'].includes(word)) return true
  if (['off', '꺼', 'false', '0'].includes(word)) return false
  return !current
}

async function showStatus($: EngineInterface) {
  const parts: string[] = []
  if (await read($, teamMode)) parts.push('팀 모드')
  if (await read($, liveShare)) parts.push('실시간 공유')
  if (await read($, isPrivate)) parts.push('비공개')
  $.ui.status(parts.length === 0 ? undefined : `📚 ${parts.join(' · ')}`)
}

export const register: Register = (on, options) => {
  const author = String(options.authorName ?? '').trim()
  const days = Number(options.retentionDays ?? 3) > 0 ? Number(options.retentionDays) : 3
  const folderName = String(options.folderName ?? '').trim() || '논문팀 Claude 공유노트'
  const rootId = folderIdFrom(String(options.folderUrl ?? ''))
  lastIds = { ...EMPTY_IDS, root: rootId ? [rootId] : [] }

  on('session.start', async ($, e, next) => {
    // 팀 모드와 실시간 공유는 세션을 넘어 유지하고, 비공개는 세션마다 꺼진 채로 시작한다.
    const storedTeam = (await $.store.get('teamMode')) === true
    const storedLive = (await $.store.get('liveShare')) === true
    await update($, teamMode, () => storedTeam)
    await update($, liveShare, () => storedTeam && storedLive)
    await update($, isPrivate, () => false)

    await $.command.register({ name: 'team', description: '팀 모드 켜기/끄기 (현황판·실시간로그 참고)', argumentHint: '[on|off]' })
    await $.command.register({ name: 'team-live', description: '실시간 공유 켜기/끄기 (진행 상황을 내 실시간로그에 한 줄씩)', argumentHint: '[on|off]' })
    await $.command.register({ name: 'team-private', description: '이 세션 비공개 켜기/끄기 (노트·로그에 올리지 않음)', argumentHint: '[on|off]' })
    await $.command.register({ name: 'team-board', description: '현황판과 실시간로그를 읽어 패널에 표시' })
    await $.command.register({ name: 'team-note', description: '이 대화를 팀 노트로 정리해서 업로드' })
    await $.command.register({ name: 'team-tidy', description: '현황판 정리 (주 1회)' })
    await $.tool.register({
      name: 'board_show',
      description:
        '논문팀 현황판과 실시간로그를 Drive에서 읽은 뒤, 그 요약을 사용자의 패널에 표시한다. board에는 현황판의 결정사항과 미해결 질문을, live에는 보관 기간 안의 실시간로그 줄을 작성자와 함께 시간순으로 넣는다.',
      inputSchema: {
        type: 'object',
        properties: {
          board: { type: 'string', description: '현황판 요약 (마크다운)' },
          live: { type: 'string', description: '실시간로그 줄들 (마크다운, 작성자 포함, 시간순)' },
        },
        required: ['board', 'live'],
      },
      isDeferred: false,
    })

    await showStatus($)
    return next(e)
  })

  on('command.run', { command: 'team' }, async ($, e) => {
    const value = nextValue(e.args, await read($, teamMode))
    await update($, teamMode, () => value)
    await $.store.set('teamMode', value)
    if (!value) {
      // 팀 모드를 끄면 실시간 공유도 함께 끈다.
      await update($, liveShare, () => false)
      await $.store.set('liveShare', false)
    }
    await showStatus($)
    return {
      text: value
        ? `[팀 모드 ON] 다음 세션에서도 유지됩니다.${author ? '' : ' /config에서 paper-team 작성자 이름을 설정해 주세요.'}`
        : '[팀 모드 OFF]',
    }
  })

  on('command.run', { command: 'team-live' }, async ($, e) => {
    const value = nextValue(e.args, await read($, liveShare))
    if (value && (await read($, isPrivate))) {
      return { text: '이 세션은 비공개 모드라 실시간 공유를 켤 수 없어요. /team-private off 후 다시 켜 주세요.' }
    }
    if (value && !(await read($, teamMode))) {
      await update($, teamMode, () => true)
      await $.store.set('teamMode', true)
    }
    await update($, liveShare, () => value)
    await $.store.set('liveShare', value)
    await showStatus($)
    return { text: value ? `[실시간 공유 ON] 내 실시간로그에만 쓰고, ${days}일 지난 내 줄은 쓸 때 지웁니다.` : '[실시간 공유 OFF]' }
  })

  on('command.run', { command: 'team-private' }, async ($, e) => {
    const value = nextValue(e.args, await read($, isPrivate))
    // 비공개는 이 세션에만 적용한다. 저장된 실시간 공유 설정은 두고, 이 세션에서만 끈다.
    const restoreLive = (await $.store.get('liveShare')) === true && (await read($, teamMode))
    await update($, isPrivate, () => value)
    await update($, liveShare, () => (value ? false : restoreLive))
    await showStatus($)
    return { text: value ? '[비공개 ON] 이 세션 내용은 노트와 실시간로그에 올리지 않습니다.' : '[비공개 OFF]' }
  })

  on('command.run', { command: 'team-board' }, async $ => {
    await $.ui.open({ id: PANE, title: '논문팀 현황판' })
    await $.prompt.submit({
      text: 'paper-team-notes 스킬로 현황판과 실시간로그를 읽고, board_show 도구로 패널에 표시해 줘. 다른 설명은 짧게.',
    })
    return { text: '현황판을 읽어서 패널에 표시할게요.' }
  })

  on('command.run', { command: 'team-note' }, async $ => {
    if (await read($, isPrivate)) return { text: '이 세션은 비공개 모드라 노트를 올리지 않아요.' }
    await $.prompt.submit({ text: 'paper-team-notes 스킬의 노트 작성 절차대로 이 대화를 노트로 정리해서 올리고, 올린 내용을 알려줘.' })
    return { text: '노트를 정리해서 올릴게요.' }
  })

  on('command.run', { command: 'team-tidy' }, async $ => {
    await $.prompt.submit({ text: 'paper-team-notes 스킬의 현황판 정리 절차대로 현황판을 정리하고, 바꾼 내용을 알려줘.' })
    return { text: '현황판을 정리할게요.' }
  })

  on('tool.call', { tool: 'mcp__paper-team__board_show' }, async ($, e) => {
    const input = e as unknown as { board?: unknown; live?: unknown }
    const value: PaperTeamBoard = {
      board: String(input.board ?? ''),
      live: String(input.live ?? ''),
      readAt: new Date().toISOString(),
    }
    await update($, board, () => value)
    await $.ui.open({ id: PANE, title: '논문팀 현황판' })
    return { result: '패널에 표시했습니다.' }
  })

  // 공유 폴더에 쓰는 호출을 검사한다. 비공개 중이면 막고, 민감정보 형식이 보이면 막는다.
  on('tool.call', async ($, e, next) => {
    if (!isDriveTool(String(e.tool))) return next(e)
    const known = await loadIds($, rootId)
    const { tool: _tool, tool_use_id: _id, ...input } = e as unknown as Record<string, unknown>
    if (!isDriveWrite(String(e.tool)) || !isTeamTarget(input, known)) return remember($, await next(e), known, rootId)

    if (isMaterialsTarget(input, known)) {
      return { deny: 'paper-team: 01_자료는 팀원들이 직접 파일을 넣는 곳이라 Claude는 올리거나 고치지 않습니다. 필요하면 사용자에게 직접 넣는 방법을 안내하세요.' }
    }

    if (await read($, isPrivate)) {
      $.ui.toast('📚 비공개 모드라 공유 폴더 업로드를 막았어요')
      return { deny: 'paper-team: 이 세션은 비공개 모드라 공유 폴더에 쓸 수 없습니다. 사용자가 /team-private off 를 하기 전에는 다시 시도하지 마세요.' }
    }
    const found = findSensitive(input, known)
    if (found.length > 0) {
      $.ui.toast(`📚 민감정보 ${found.length}건이 보여 업로드를 막았어요`)
      return { deny: denyMessage(found) }
    }
    return remember($, await next(e), known, rootId)
  }).catch(($, e, next) => {
    // 검사 자체가 실패하면, 공유 폴더를 향한 쓰기는 안전하게 막는다.
    if (next.called) return next(e)
    const { tool: _tool, tool_use_id: _id, ...input } = e as unknown as Record<string, unknown>
    return isDriveWrite(String(e.tool)) && isTeamTarget(input, lastIds)
      ? { deny: 'paper-team: 민감정보 검사를 하지 못해 공유 폴더 업로드를 막았습니다. 다시 시도해 주세요.' }
      : next(e)
  })

  // 모드 상태를 시스템 프롬프트에 알려서 Claude가 paper-team-notes 스킬을 그 상태대로 쓰게 한다.
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    const isTeam = await read($, teamMode)
    const isLive = await read($, liveShare)
    const isSecret = await read($, isPrivate)
    if (!isTeam && !isSecret) return composed

    const lines = [
      '# 논문팀 모드 (paper-team)',
      `현재 상태: 팀 모드 ${isTeam ? 'ON' : 'OFF'}, 실시간 공유 ${isLive ? 'ON' : 'OFF'}, 비공개 ${isSecret ? 'ON' : 'OFF'}.`,
      `작성자 이름: ${author || '(미설정: 처음 노트나 로그를 쓸 때 물어볼 것)'}. 실시간로그 보관 기간: ${days}일.`,
      rootId
        ? `공유 폴더: https://drive.google.com/drive/folders/${rootId} (이름 ${folderName}). 이 링크는 노트나 로그에 적지 않는다.`
        : `공유 폴더: Drive에서 이름 "${folderName}"으로 찾는다(공유 문서함 포함). 사용자가 /config에서 paper-team의 공유 폴더 링크를 넣으면 더 정확하다.`,
      '공동 논문 작업과 관련된 요청이면 paper-team-notes 스킬을 불러서 그 절차를 따른다. 모드 전환은 /team, /team-live, /team-private 명령으로 하며 이 모드가 처리한다. 상태는 여기 적힌 것을 따르고, 웹용 상태 표시 줄은 붙이지 않는다.',
      '실시간로그는 자기 파일(실시간로그_작성자)에만 쓰고 지운다. 다른 팀원의 파일은 어떤 경우에도 수정하거나 지우지 않는다.',
      '현황판과 실시간로그를 읽었으면 mcp__paper-team__board_show 도구로 요약을 패널에 표시한다.',
      '논문 자료(PDF, 데이터, 초안)는 팀원들이 공유 폴더의 01_자료에 넣는다. 사용자가 말하지 않아도 자료를 보면 답이 나아질 때는 스스로 관련 파일 1~3개를 찾아 읽고 출처(파일명, 페이지)를 밝힌다. 자료는 읽기 전용이고 Claude는 거기에 올리지 않는다.',
      '노트와 현황판은 확인을 묻지 않고 바로 올린 뒤, 올린 내용을 답변 끝에 알린다. 민감정보 점검은 매번 한다.',
    ]
    if (isSecret) lines.push('비공개 모드: 이 세션의 내용은 노트나 실시간로그에 올리지 않고, 올리자고 제안하지도 않는다. 팀 노트 읽기는 된다.')
    if (!isTeam) lines.push('팀 모드가 꺼져 있으므로 사용자가 요청할 때만 팀 노트를 읽는다.')

    return {
      sections: [...composed.sections, { id: 'paper-team:mode', text: lines.join('\n'), scope: 'session' as const }],
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Markdown } = $.ui.resolve(e)
    const value = await read($, board)
    if (value === null) {
      return (
        <Box flexDirection="column">
          <Text dimColor>아직 읽은 내용이 없어요. /team-board 로 불러오세요.</Text>
        </Box>
      )
    }
    return (
      <Box flexDirection="column">
        <Text dimColor>읽은 시각 {value.readAt.slice(0, 16).replace('T', ' ')} (UTC)</Text>
        <Text bold>현황판</Text>
        <Markdown text={value.board || '(비어 있음)'} />
        <Text bold>실시간로그</Text>
        <Markdown text={value.live || '(최근 기록 없음)'} />
      </Box>
    )
  })
}
