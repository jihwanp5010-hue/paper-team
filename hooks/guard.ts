// 공유 폴더에 쓰는 Drive/Docs 호출에서 민감정보 형식을 찾아낸다.
// 건강·감정·평가 같은 내용은 형식으로 잡을 수 없으므로 스킬의 판단에 맡기고,
// 여기서는 실수로 섞이기 쉬운 "형식이 있는" 정보만 확실히 막는다.
//
// 폴더 ID는 코드에 적지 않는다(공개 저장소). 공유 폴더 ID는 사용자 설정에서 받고,
// 하위 폴더 ID는 Drive 도구의 결과에서 이름을 보고 알아낸다.

export type TeamIds = { root: string[]; materials: string[]; others: string[] }

export const EMPTY_IDS: TeamIds = { root: [], materials: [], others: [] }

// 공유 폴더 안 문서·폴더의 이름 규칙
const TEAM_TITLE = /(^\d{4}-\d{2}-\d{2}_)|(^실시간로그_)|(^00_현황판)/
const KNOWN_TITLES: Record<string, keyof TeamIds> = {
  '00_실시간로그': 'others',
  '00_현황판': 'others',
  '01_자료': 'materials',
}

const PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: '이메일', pattern: /[\w.+-]+@[\w-]+(\.[\w-]+)+/g },
  { label: '주민등록번호', pattern: /\b\d{6}-?[1-4]\d{6}\b/g },
  { label: '전화번호', pattern: /\b01[016789][- .]?\d{3,4}[- .]?\d{4}\b/g },
  { label: '카드번호', pattern: /\b\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}\b/g },
  { label: 'API 키/토큰', pattern: /\b(sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|AIza[0-9A-Za-z_-]{30,}|xox[abpr]-[A-Za-z0-9-]{10,})\b/g },
  { label: '비밀번호', pattern: /(password|passwd|비밀번호|비번)\s*[:=]\s*\S+/gi },
  { label: '사용자 이름이 든 경로', pattern: /(\/Users\/[^/\s]+|\/home\/[^/\s]+|[A-Z]:\\Users\\[^\\\s]+)/g },
]

export type Finding = { label: string; sample: string }

// 설정에 넣은 폴더 링크나 ID에서 ID만 뽑는다.
export function folderIdFrom(value: string): string {
  const text = value.trim()
  const match = text.match(/folders\/([\w-]+)/) ?? text.match(/[?&]id=([\w-]+)/)
  if (match?.[1]) return match[1]
  return /^[\w-]{10,}$/.test(text) ? text : ''
}

// Drive나 Docs에 쓰는 도구인지: 서버 이름은 환경마다 달라서 이름의 모양으로 판단한다.
export function isDriveWrite(tool: string): boolean {
  return /drive|docs/i.test(tool) && /(create|update|upload|append|insert|write|edit)/i.test(tool)
}

export function isDriveTool(tool: string): boolean {
  return /drive|docs/i.test(tool)
}

function allIds(ids: TeamIds): string[] {
  return [...ids.root, ...ids.materials, ...ids.others]
}

// 공유 폴더를 향한 호출인지: 알고 있는 ID나 이름 규칙으로 판단한다.
export function isTeamTarget(input: Record<string, unknown>, ids: TeamIds): boolean {
  const raw = JSON.stringify(input)
  if (allIds(ids).some(id => raw.includes(id))) return true
  const title = typeof input.title === 'string' ? input.title : typeof input.name === 'string' ? input.name : ''
  return TEAM_TITLE.test(title)
}

// 01_자료 폴더에 새로 만드는 호출인지: 자료는 팀원만 넣는다.
export function isMaterialsTarget(input: Record<string, unknown>, ids: TeamIds): boolean {
  const parents = JSON.stringify([input.parentId ?? '', input.parents ?? ''])
  return ids.materials.some(id => parents.includes(id))
}

// Drive 도구의 결과에서 공유 폴더의 하위 폴더·문서 ID를 알아낸다.
// 공유 폴더(root) 바로 아래에 있는 알려진 이름만 받아들인다.
export function learnIds(resultText: string, ids: TeamIds): TeamIds {
  if (ids.root.length === 0) return ids
  const next: TeamIds = { root: [...ids.root], materials: [...ids.materials], others: [...ids.others] }
  for (const object of resultText.match(/\{[^{}]*\}/g) ?? []) {
    let item: Record<string, unknown>
    try {
      item = JSON.parse(object) as Record<string, unknown>
    } catch {
      continue
    }
    const { id, title, parentId } = item
    if (typeof id !== 'string' || typeof title !== 'string') continue
    const kind = KNOWN_TITLES[title]
    if (kind === undefined || typeof parentId !== 'string' || !ids.root.includes(parentId)) continue
    if (!next[kind].includes(id)) next[kind].push(id)
  }
  return next
}

// 그대로 보여주면 그 자체가 유출이므로 앞 두 글자만 남기고 가린다.
function mask(text: string): string {
  return text.length <= 2 ? '**' : `${text.slice(0, 2)}${'*'.repeat(Math.min(6, text.length - 2))}`
}

export function findSensitive(input: Record<string, unknown>, ids: TeamIds): Finding[] {
  // ID는 검사 대상이 아니므로 빼고, 쓰려는 글만 본다.
  const { parentId: _p, fileId: _f, documentId: _d, ...rest } = input
  let text = JSON.stringify(rest)
  for (const id of allIds(ids)) text = text.split(id).join('')
  const found: Finding[] = []
  for (const { label, pattern } of PATTERNS) {
    for (const match of text.match(pattern) ?? []) found.push({ label, sample: mask(match) })
  }
  return found
}

export function denyMessage(found: Finding[]): string {
  const list = found.slice(0, 5).map(f => `${f.label}(${f.sample})`).join(', ')
  return `paper-team: 공유 폴더에 올릴 내용에 민감정보로 보이는 항목이 있어 업로드를 막았습니다: ${list}${found.length > 5 ? ` 외 ${found.length - 5}건` : ''}. 해당 부분을 지우거나 일반화한 뒤 다시 올리고, 무엇을 뺐는지 사용자에게 알려 주세요. 형식만 바꿔서 우회하지 마세요.`
}
