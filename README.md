# 🎭 Expression Extractor · 표정 추출기 (SillyTavern)

VN Studio의 "카드 이미지 → 표정 이미지" 기능만 따로 뗀 확장이에요.
캐릭터 카드 PNG에서 외형을 읽고, Gemini로 표정을 한 장씩 만들어서 **SillyTavern 기본 표정 스프라이트 폴더**에 저장해요. 그래서 기본 *Character Expressions* 확장이 그대로 사용해요.

## 설치
`SillyTavern/data/<유저>/extensions/expression-extractor/`에 폴더째 넣거나 GitHub 주소로 설치 → 새로고침.
VN Studio가 설치돼 있으면 **API 키·모델 설정을 처음 한 번 자동으로 가져와요.** (설정 패널의 "VN Studio에서 설정 가져오기"로 다시 가져올 수도 있어요.)

## 사용
지팡이 메뉴 → **표정 추출기** (또는 확장 설정 → 표정 추출기 열기)
1. 캐릭터 선택 → 외형 태그 확인 (비워 두면 첫 생성 때 카드 PNG+설명에서 자동으로 뽑아 저장)
2. 만들 표정 선택 (기본 6 / 핵심 10 / 전체 28)
3. **선택한 표정 만들기** → neutral부터 만들어 기준으로 삼고 나머지는 한 장씩 천천히 생성
4. 결과는 바로 ST 스프라이트로 저장. 각 이미지의 ↻ 다시 생성 / ✂ 배경 제거 / ✕ 삭제

## VN Studio에서 가져온 것
| 기능 | 원본 함수 |
|---|---|
| 외형 태그 추출 (카드 이미지 우선) | `extractLook`, `cleanLook`, `geminiText` |
| 표정 이미지 생성 프롬프트(28종 포즈 설명) | `EMO_DESC`, `genSpriteImage` |
| 참조 이미지(neutral+카드)로 외형 일관성 유지 | `charRefs`, `refInline` |
| 배경 제거 | `cutoutPixels`, `cutoutImage` |
| 429 대기열·재시도 | `imgQueue`, `geminiGenerate` |

빠진 것: 호감도·장소·선택지·이벤트·영상·의상 세트 관리·Scene Studio 연동·표정 선택(분류)·연출.
달라진 것: 결과를 확장 전용 폴더 대신 `/api/sprites/upload`로 ST 스프라이트 폴더에 저장해요.

## 참고
- 스프라이트 폴더는 캐릭터 이름이에요. ST 표정 확장의 "스프라이트 폴더 덮어쓰기"를 쓰면 그 경로를 따라가요.
- 키는 `settings.json`에 평문으로 저장돼요.
- 이미지 1장 = 이미지 API 1회 호출(요금 발생)이에요.
