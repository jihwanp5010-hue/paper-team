# 팀원 설정 가이드

## 1. 폴더 접근
- 폴더 링크는 팀장에게 받는다. 공개 저장소에 올라가지 않도록 스킬이나 모드에는 들어 있지 않다. 웹은 Project 지침에, Claude Code는 `/config`의 paper-team `공유 폴더 링크`에 넣는다(넣지 않아도 폴더 이름으로 찾는다).
- 링크를 열었을 때 권한이 없으면 폴더 주인에게 **편집자** 권한을 요청한다.
- 폴더를 "내 드라이브"에 바로가기로 추가해 두면 검색이 잘 된다.

## 1-1. 자료 올리기
- 논문 PDF, 데이터, 초안, 그림은 팀원이 직접 `01_자료` 폴더에 넣는다. 이름이나 하위 폴더 규칙은 따로 없다. Claude는 이 폴더에 올리지 않는다.
- 개인정보가 든 원본 데이터는 꼭 필요할 때만 올린다.

## 2. Google Drive 커넥터 연결
- claude.ai / Cowork: Settings → Connectors → Google Drive 연결
- 같은 Google 계정으로 폴더 권한을 받았는지 확인한다.

## 3. 스킬 설치
- claude.ai / Cowork: Settings → Capabilities → Skills에서 `paper-team-notes.zip` 업로드 (Code execution 옵션이 켜져 있어야 함)
- Claude Code: `~/.claude/skills/paper-team-notes/` 폴더에 그대로 복사

## 4. 모드 설정
- Claude Code: `/plugin install paper-team --marketplace jihwanp5010-hue/work`로 모드를 설치하고 `/config`에서 작성자 이름을 설정한다. 스킬이 함께 들어 있다.
- 웹(claude.ai 채팅, Cowork): `references/web-project.md`의 Project 지침을 붙여넣는다.

## 명령
| 명령 | 하는 일 |
|---|---|
| `/team` | 팀 모드 켜기/끄기 |
| `/team-live` | 실시간 공유 켜기/끄기 |
| `/team-private` | 이 대화 비공개 |
| `/team-board` | 현황판과 실시간로그 보기 |
| `/team-note` | 이 대화를 노트로 정리해서 바로 업로드하고 알림 |
| `/team-tidy` | 현황판 정리 (주 1회) |

`01_자료`의 파일은 Claude가 필요하다고 판단할 때 알아서 찾아 읽는다.
