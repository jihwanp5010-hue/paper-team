# paper-team

논문팀이 각자 Claude와 나눈 대화의 결론을 팀 Google Drive 폴더에 모으고, 서로의 Claude가 그 내용을 이어받게 하는 Claude Code 모드와 웹(claude.ai 채팅·Cowork)용 스킬입니다.

- 웹 사용 가이드: [`guides/논문팀공유노트_웹가이드.pdf`](guides/논문팀공유노트_웹가이드.pdf)
- Claude Code 사용 가이드: [`guides/논문팀공유노트_ClaudeCode가이드.pdf`](guides/논문팀공유노트_ClaudeCode가이드.pdf)
- 웹용 스킬 파일: [`paper-team-notes.zip`](paper-team-notes.zip)

## Claude Code 모드

논문팀 공유노트를 Claude Code에서 쓰기 위한 모드입니다. `paper-team-notes` 스킬이 함께 들어 있습니다.

## 설치

```
/plugin install paper-team --marketplace jihwanp5010-hue/paper-team
```

`y`로 마켓플레이스를 추가하고 user 범위를 고르면 됩니다. 설치 후 `/config`에서 `paper-team`의 **공유 폴더 링크**(팀장에게 받기), **작성자 이름**, **실시간로그 보관 기간(일, 기본 3)**을 설정하세요. 폴더 링크는 내 설정에만 저장되고 이 저장소에는 들어 있지 않습니다. 비워 두면 Drive에서 폴더 이름으로 찾습니다. Google Drive MCP 커넥터가 연결되어 있어야 Drive를 읽고 쓸 수 있습니다.

## 명령

| 명령 | 하는 일 |
|---|---|
| `/team [on\|off]` | 팀 모드. 현황판과 실시간로그를 참고하고, 팀 결정과 충돌하면 알려줌. 다음 세션에도 유지 |
| `/team-live [on\|off]` | 실시간 공유. 진행 상황을 **내** 실시간로그 파일에 한 줄씩 쓰고, 보관 기간이 지난 **내** 줄은 쓸 때 지움. 다음 세션에도 유지 |
| `/team-private [on\|off]` | 이 세션만 비공개. 노트·로그에 올리지 않음 |
| `/team-board` | 현황판과 실시간로그를 읽어 패널에 표시 |
| `/team-note` | 이 대화를 팀 노트로 정리해 바로 업로드하고 알림 (비공개 중엔 안 함) |
| `/team-tidy` | 현황판 정리 (주 1회) |

상태줄에 `📚 팀 모드 · 실시간 공유`처럼 현재 모드가 표시됩니다.

## 자료
`01_자료`에는 팀원들이 직접 논문 PDF, 데이터, 초안을 넣습니다(이름 규칙 없음). 자료를 볼지는 Claude가 판단해서, 필요할 때 관련 파일만 찾아 읽고 출처(파일명, 페이지)를 밝힙니다. Claude는 자료를 고치거나 지우지 않고, 모드가 Claude의 `01_자료` 업로드를 막습니다.

## 규칙
- 실시간로그는 사람마다 파일 하나(`00_실시간로그/실시간로그_이름`). 각자 자기 파일에만 쓰고 지웁니다.
- 다른 팀원의 파일은 어떤 경우에도 수정하거나 지우지 않습니다.
- 공유 폴더에 쓰는 요청은 모드가 자동으로 검사합니다. 이메일, 전화번호, 주민번호, 카드번호, API 키/토큰, 비밀번호, 사용자 이름이 든 경로가 보이면 업로드를 막고, Claude가 그 부분을 빼고 다시 올립니다. 비공개 중에는 공유 폴더 쓰기를 모두 막습니다.

## 웹(claude.ai 채팅, Cowork)
같은 명령을 웹에서도 쓸 수 있습니다. 이 저장소의 `paper-team-notes.zip`을 받아 Settings → Capabilities → Skills에 올리고, `skills/paper-team-notes/references/web-project.md`의 Project 지침을 붙여넣으세요(폴더 링크는 지침에만 넣기). 상태줄 대신 답변 첫 줄에 `📚 팀 모드 · 실시간 공유`처럼 상태가 표시됩니다.
