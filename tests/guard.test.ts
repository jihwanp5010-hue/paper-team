import { expect, test } from 'claude-code/testing'

import { EMPTY_IDS, findSensitive, folderIdFrom, isDriveWrite, isMaterialsTarget, isTeamTarget, learnIds } from '../hooks/guard'

const ROOT = 'rootFolderId0001'
const IDS = { ...EMPTY_IDS, root: [ROOT] }

test('설정에 넣은 링크에서 폴더 ID를 뽑는다', async () => {
  expect(folderIdFrom('https://drive.google.com/drive/folders/abcDEF123_-xyz?usp=sharing')).toBe('abcDEF123_-xyz')
  expect(folderIdFrom('abcDEF123_-xyz')).toBe('abcDEF123_-xyz')
  expect(folderIdFrom('')).toBe('')
})

test('공유 폴더 쓰기만 검사 대상이 된다', async () => {
  expect(isDriveWrite('mcp__Google_Drive__create_file')).toBe(true)
  expect(isDriveWrite('mcp__Google_Docs__update_doc')).toBe(true)
  expect(isDriveWrite('mcp__Google_Drive__search_files')).toBe(false)
  expect(isTeamTarget({ parentId: ROOT, title: 'x' }, IDS)).toBe(true)
  expect(isTeamTarget({ title: '2026-10-09_지환_baseline' }, EMPTY_IDS)).toBe(true)
  expect(isTeamTarget({ title: '실시간로그_지환' }, EMPTY_IDS)).toBe(true)
  expect(isTeamTarget({ parentId: 'other', title: '개인 메모' }, IDS)).toBe(false)
})

test('Drive 결과에서 공유 폴더 바로 아래의 하위 폴더 ID만 알아낸다', async () => {
  const result = JSON.stringify([
    { id: 'materials01', title: '01_자료', parentId: ROOT },
    { id: 'live01', title: '00_실시간로그', parentId: ROOT },
    { id: 'elsewhere', title: '01_자료', parentId: 'someoneElse' },
  ])
  const learned = learnIds(result, IDS)
  expect(learned.materials).toEqual(['materials01'])
  expect(learned.others).toEqual(['live01'])
  expect(isMaterialsTarget({ parentId: 'materials01', title: 'a.pdf' }, learned)).toBe(true)
  expect(isTeamTarget({ parentId: 'live01', title: 'anything' }, learned)).toBe(true)
  expect(learnIds(result, EMPTY_IDS)).toEqual(EMPTY_IDS)
})

test('민감정보 형식을 찾아내고 가려서 보여준다', async () => {
  const found = findSensitive(
    {
      parentId: ROOT,
      textContent: '연락: kim.jh@snu.ac.kr, 010-1234-5678, 키 sk-abcdefghijklmnop1234, 경로 /Users/jihwan/data/exp3.csv, 비밀번호: hunter2',
    },
    IDS,
  )
  const labels = found.map(f => f.label)
  expect(labels).toContain('이메일')
  expect(labels).toContain('전화번호')
  expect(labels).toContain('API 키/토큰')
  expect(labels).toContain('사용자 이름이 든 경로')
  expect(labels).toContain('비밀번호')
  expect(found.every(f => !f.sample.includes('snu.ac.kr'))).toBe(true)
})

test('평범한 연구 노트는 통과한다', async () => {
  const found = findSensitive(
    {
      parentId: ROOT,
      title: '2026-10-09_지환_baseline',
      textContent: '# baseline\n- BERT-base로 확정 (acc 0.82, exp3)\n- 10/20 제출\n- 데이터셋 A 라벨 중복 3% 제거',
    },
    IDS,
  )
  expect(found).toEqual([])
})
