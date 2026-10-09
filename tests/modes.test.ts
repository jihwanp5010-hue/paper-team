import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const START = { cwd: '/tmp', surface: 'terminal', isInteractive: true } as const
function bottoms(on: On) {
  mock.store(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('prompt.compose', () => ({ sections: [] }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('tool.register', (_$, e) => ({ value: { tool: e.name } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }) as const)
  on('prompt.submit', () => ({ value: undefined }) as never)
}

function modeText(sections: readonly { id: string; text: string }[]) {
  return sections.find(s => s.id === 'paper-team:mode')?.text ?? ''
}

const PRESENTATION = { isFullscreen: false, columns: 80 }

function command(name: string, args: string) {
  return { command: name, args, origin: { kind: 'composer' as const }, presentation: PRESENTATION }
}

const OPTIONS = { folderUrl: 'https://drive.google.com/drive/folders/rootFolderId0001' }

const COMPOSE = {
  model: 'test-model',
  promptModel: 'test-model',
  surfaces: ['terminal'],
  tools: [],
  outputStyle: null,
  traits: [],
} as const

test('팀 모드와 실시간 공유를 켜면 시스템 프롬프트에 상태가 들어간다', async ($, on) => {
  bottoms(on)
  await $.session.start(START)

  const off = await $.prompt.compose(COMPOSE)
  expect(off.sections.some(s => s.id === 'paper-team:mode')).toBe(false)

  await $.command.run(command('team-live', 'on'))
  const on1 = await $.prompt.compose(COMPOSE)
  const text = on1.sections.find(s => s.id === 'paper-team:mode')?.text ?? ''
  expect(text).toContain('팀 모드 ON')
  expect(text).toContain('실시간 공유 ON')
  expect(text).toContain('다른 팀원의 파일은 어떤 경우에도 수정하거나 지우지 않는다')
})

test('비공개를 켜면 이 세션의 실시간 공유가 꺼지고, 끄면 저장된 설정으로 돌아간다', async ($, on) => {
  bottoms(on)
  await $.session.start(START)

  await $.command.run(command('team-live', 'on'))
  await $.command.run(command('team-private', 'on'))
  let text = (await $.prompt.compose(COMPOSE)).sections.find(s => s.id === 'paper-team:mode')?.text ?? ''
  expect(text).toContain('실시간 공유 OFF')
  expect(text).toContain('비공개 ON')

  const refused = await $.command.run(command('team-live', 'on'))
  expect(refused.text).toContain('비공개')

  await $.command.run(command('team-private', 'off'))
  text = (await $.prompt.compose(COMPOSE)).sections.find(s => s.id === 'paper-team:mode')?.text ?? ''
  expect(text).toContain('실시간 공유 ON')
})

test('팀 모드를 끄면 실시간 공유도 꺼진다', async ($, on) => {
  bottoms(on)
  await $.session.start(START)

  await $.command.run(command('team-live', 'on'))
  await $.command.run(command('team', 'off'))
  await $.command.run(command('team', 'on'))
  expect(modeText((await $.prompt.compose(COMPOSE)).sections)).toContain('실시간 공유 OFF')
  await $.command.run(command('team', 'off'))
  const composed = await $.prompt.compose(COMPOSE)
  expect(composed.sections.some(s => s.id === 'paper-team:mode')).toBe(false)
})

test('비공개 중에는 /team-note가 노트를 올리지 않는다', async ($, on) => {
  bottoms(on)
  await $.session.start(START)
  await $.command.run(command('team-private', 'on'))
  const result = await $.command.run(command('team-note', ''))
  expect(result.text).toContain('비공개')
})

test('민감정보가 든 공유 폴더 업로드는 막히고, 비공개 중에는 모두 막힌다', { options: OPTIONS }, async ($, on) => {
  bottoms(on)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('tool.call', () => ({ result: 'uploaded' }) as never)
  await $.session.start(START)

  const call = (textContent: string) =>
    $.tool.call({
      tool: 'mcp__Google_Drive__create_file',
      parentId: 'rootFolderId0001',
      title: '실시간로그_지환',
      textContent,
    } as never)

  const blocked = await call('[10/09 14:20] 문의는 kim@snu.ac.kr 로')
  expect(blocked.deny).toContain('이메일')

  const passed = await call('[10/09 14:20] 2.2절 정리 시작')
  expect(passed.deny).toBeUndefined()

  await $.command.run(command('team-private', 'on'))
  const privateBlocked = await call('[10/09 14:30] 2.2절 정리 중')
  expect(privateBlocked.deny).toContain('비공개')
})

test('Claude는 01_자료에 파일을 올리지 못한다', { options: OPTIONS }, async ($, on) => {
  bottoms(on)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('tool.call', ($, e) =>
    (String(e.tool).includes('search')
      ? { result: 'ok', text: JSON.stringify([{ id: 'materials01', title: '01_자료', parentId: 'rootFolderId0001' }]) }
      : { result: 'uploaded' }) as never,
  )
  await $.session.start(START)

  // 폴더를 검색한 결과에서 01_자료의 ID를 알아낸다.
  await $.tool.call({ tool: 'mcp__Google_Drive__search_files', query: "title = '01_자료'" } as never)

  const result = await $.tool.call({
    tool: 'mcp__Google_Drive__create_file',
    parentId: 'materials01',
    title: 'summary.md',
    textContent: '요약',
  } as never)
  expect(result.deny).toContain('01_자료')
})
