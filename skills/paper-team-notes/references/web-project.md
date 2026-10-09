# 웹(claude.ai 채팅, Cowork)에서 모드처럼 쓰기

웹에서는 대화가 바뀌면 모드 상태가 이어지지 않는다. 논문용 Project를 하나 만들고 아래 지침을 Project instructions에 붙여넣으면, 그 Project의 모든 새 대화가 같은 모드로 시작한다. Claude Code의 `/config` 설정에 해당한다.

## 준비
1. Settings → Connectors에서 Google Drive 연결
2. Settings → Capabilities → Skills에서 `paper-team-notes.zip` 업로드
3. 논문용 Project를 만들고 아래 지침을 붙여넣은 뒤, `○○○`와 기본 모드를 고친다

## Project instructions (복사해서 붙여넣기)

```
이 프로젝트는 논문팀 공동 작업용이야. paper-team-notes 스킬을 사용해.

[내 설정]
- 공유 폴더 링크: (팀장에게 받은 링크)
- 작성자 이름: ○○○
- 실시간로그 보관 기간: 3일

[새 대화의 기본 모드]
- 팀 모드: on
- 실시간 공유: off
- 비공개: off

대화 중에는 /team, /team-live, /team-private, /team-board, /team-note, /team-tidy 명령(또는 같은 뜻의 말)으로 바꿀게.
```

## 자주 쓰는 조합
- 평소: 팀 모드 on, 실시간 공유 off. 팀 결정을 참고하되 기록은 내가 원할 때만 남긴다.
- 같이 마감할 때: 팀 모드 on, 실시간 공유 on. 진행 상황이 자동으로 공유된다.
- 개인적인 질문이 섞일 때: 대화 시작할 때 `/team-private`
