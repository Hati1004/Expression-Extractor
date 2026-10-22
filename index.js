/* Expression Extractor 1.2.0 · 표정 추출기 (SillyTavern)
 * 캐릭터 카드에서 외형을 읽고 → Gemini로 감정별 표정 이미지를 만들고 → (선택) 배경을 지운 뒤
 * SillyTavern 기본 표정 스프라이트 폴더( characters/<캐릭터 이름>/<감정>.png )에 자동으로 저장해요.
 * 기본 "Character Expressions" 확장이 그대로 읽어 가요.
 * - 창: [표정] [설정] [기록] 탭. 끌어서 옮기고 모서리로 크기 조절
 * - 외형 태그 추출 / 화풍 프리셋 / 제외 요소: 장면 생성기(Scene Studio)와 같은 방식 + 설정 가져오기
 * - 배경 제거 + 가장자리 조절(흰 테두리 제거 / 줄이기 / 부드럽게): 미리보기 포함
 * - 생성 중에는 창을 닫아도 작은 알림(진행 상황 + 취소)이 떠요
 * - 이미지는 Agent Platform(구 Vertex AI) API 키 전용(express) 방식으로 호출해요
 */
(() => {
  'use strict';
  const MODULE = 'expr_extractor';
  const DEFAULT_MODEL = 'gemini-3.1-flash-image';
  const ctx = () => SillyTavern.getContext();
  /* ================= 언어 (자동 / 한국어 / English) ================= */
  /* 한국어 문장이 그대로 번역 키예요. 영어일 때만 아래 표에서 찾아 바꾸고, 없으면 한국어 그대로 보여요. {0} {1}은 자리표시자예요. */
  const EN = {
    "장면 생성기(Scene Studio) 설정을 찾지 못했어요. 설치돼 있고 한 번 열어 본 적이 있는지 확인해 주세요.": "Couldn't find the Scene Studio settings. Make sure it's installed and has been opened at least once.",
    "API 키": "API key",
    "텍스트 모델 프로필": "text model profile",
    "화풍 프리셋 {0}개": "{0} style preset(s)",
    "화풍 프롬프트": "style prompt",
    "제외 요소": "excluded elements",
    "외형 태그 {0}개": "{0} appearance tag set(s)",
    "장면 생성기는 Agent Platform이 아닌 방식(AI Studio 등)을 쓰고 있어요. 이 확장은 Agent Platform API 키만 지원해서, 키가 안 맞으면 연결 테스트가 실패할 수 있어요.": "Scene Studio uses a provider other than Agent Platform (e.g. AI Studio). This extension only supports Agent Platform API keys, so the connection test may fail if the key doesn't match.",
    "프로젝트 ID는 쓰지 않아요. API 키 전용 방식으로 호출해요.": "The project ID isn't used. Requests are made in API-key-only mode.",
    "장면 생성기에서 가져왔어요: {0}": "Imported from Scene Studio: {0}",
    "가져올 설정이 없었어요.": "Nothing to import.",
    "스프라이트 저장 실패 (": "Failed to save the sprite (",
    "파일 목록을 불러오지 못했어요 (": "Couldn't load the file list (",
    "끌어서 옮기기 · 누르면 표정 추출기 창을 열어요": "Drag to move · click to open the Expression Extractor window",
    "취소": "Cancel",
    "취소하는 중…": "Cancelling…",
    "PNG 변환 실패": "PNG conversion failed",
    "이미지를 불러오지 못했어요 (": "Couldn't load the image (",
    "배경 제거를 건너뛰었어요 (배경이 균일하지 않아요, 인식 {0}%). 원본으로 저장했어요.": "Skipped background removal (the background isn't uniform, detected {0}%). Saved the original instead.",
    "취소됨": "Cancelled",
    "요청이 몰려 {0}초 뒤 다시 시도해요 ({1})": "Too many requests — retrying in {0}s ({1})",
    "표정": "Expressions",
    "API 키를 입력해 주세요 (확장 프로그램 → 표정 추출기)": "Please enter an API key (Extensions → Expression Extractor)",
    "요청 실패": "Request failed",
    "요청이 차단됐어요 ({0})": "The request was blocked ({0})",
    "이미지가 생성되지 않았어요 ({0}). 안전 필터에 걸렸을 수 있어요.": "No image was generated ({0}). It may have been caught by a safety filter.",
    "응답에 이미지가 없어요": "The response contained no image",
    "API 키를 먼저 입력해 주세요.": "Please enter an API key first.",
    "연결 성공: {0}": "Connected: {0}",
    "실패": "Failed",
    "요청 실패 (네트워크/CORS): ": "Request failed (network/CORS): ",
    "프로필 응답이 비어 있어요": "The profile returned an empty response",
    "연결 프로필 \"{0}\" 호출에 실패해서 채팅 모델로 대신 실행해요: {1}": "Connection profile \"{0}\" failed, so the chat model is used instead: {1}",
    "선택한 연결 프로필을 찾지 못해 채팅 모델로 실행해요. (Connection Manager 확장이 켜져 있는지 확인해 주세요)": "Couldn't find the selected connection profile, so the chat model is used. (Check that the Connection Manager extension is enabled.)",
    "모델 응답이 비어 있어요": "The model returned an empty response",
    "텍스트": "Text",
    "외형 태그를 뽑는 중…": "Extracting appearance tags…",
    "외형 추출 · ": "Appearance · ",
    "외형 추출에 실패해서 카드 설명을 그대로 써요: ": "Appearance extraction failed, so the card description is used as-is: ",
    "직접 입력": "Custom",
    "끌어서 옮기기": "Drag to move",
    "🎭 표정 추출기": "🎭 Expression Extractor",
    "닫기": "Close",
    "설정": "Settings",
    "기록": "Log",
    "끌어서 크기 조절": "Drag to resize",
    "표정 추출기가 꺼져 있어요. 확장 설정에서 \"사용\"을 켜 주세요.": "Expression Extractor is turned off. Turn on \"Enable\" in the extension settings.",
    "이 캐릭터 전용 폴더를 쓰고 있어요. (ST 표정 확장의 \"폴더 덮어쓰기\"로 등록돼 있어요)": "This character uses its own folder. (Registered as a \"Sprite folder override\" in the ST expressions extension.)",
    "전용 폴더 설정을 해제하고 캐릭터 이름 폴더를 다시 써요": "Remove the dedicated-folder setting and use the character-name folder again",
    "공유 폴더로 되돌리기": "Back to the shared folder",
    "characters/{0}/ 폴더를 따로 쓰도록 설정해요": "Sets this character to use its own characters/{0}/ folder",
    "⚠ 이름이 같은 캐릭터 {0}명과 표정 폴더({1})를 같이 써요. 서로의 표정이 섞여 보여요.": "⚠ Shares the expression folder ({1}) with {0} other character(s) of the same name. Their expressions get mixed together.",
    "이 캐릭터 전용 폴더로 분리": "Separate into a dedicated folder for this character",
    "이 캐릭터는 이제 characters/{0}/ 폴더를 써요. ST 표정 확장도 채팅에서 이 폴더를 읽어요. (기존 공유 폴더의 표정은 그대로 남아 있어요)": "This character now uses the characters/{0}/ folder. The ST expressions extension reads this folder in chat too. (Expressions in the old shared folder are left as they are.)",
    "전용 폴더 설정을 해제했어요. 다시 characters/{0}/ 폴더를 써요. (전용 폴더의 표정 파일은 그대로 남아 있어요)": "Dedicated-folder setting removed. Using the characters/{0}/ folder again. (Files in the dedicated folder are kept.)",
    "이름이 같은 캐릭터 {0}명과 표정 폴더({1})를 같이 써서 이미 있는 표정 {2}장과 섞여요.\n이 캐릭터 전용 폴더({3})를 만들어 저장할까요?\n\n[확인] 전용 폴더에 저장   [취소] 지금 폴더에 그대로 저장": "{0} other character(s) with the same name share the expression folder ({1}), and it already has {2} expression(s) that would get mixed.\nSave to a dedicated folder ({3}) for this character instead?\n\n[OK] Save to the dedicated folder   [Cancel] Keep saving to the current folder",
    "캐릭터가 없어요. SillyTavern에서 캐릭터를 먼저 만들어 주세요.": "No characters found. Please create a character in SillyTavern first.",
    "직접 고른 사진": "your own photo",
    "카드 PNG": "card PNG",
    "카드 PNG로": "Use card PNG",
    "캐릭터": "Character",
    "저장 폴더:": "Save folder:",
    "기준 사진": "Base photo",
    "표정 생성의 기준 사진 (클릭하면 크게 보기)": "Base photo for expression generation (click to enlarge)",
    "기준 사진: {0}": "Base photo: {0}",
    "사진 바꾸기": "Change photo",
    "외형 태그": "Appearance tags",
    "비워 두면 표정을 만들 때 카드 설명에서 영어 외형 태그를 한 번 만들어 저장해요. 직접 고치면 그 내용으로 고정돼요.": "If left empty, English appearance tags are generated once from the card description when you make expressions, then saved. If you edit them, your text is locked in.",
    "카드 설명에서 외형 다시 추출 (텍스트 모델 1회)": "Re-extract appearance from the card description (1 text-model call)",
    "장면 생성기에 이미 추출된 이 캐릭터의 외형 태그를 가져와요": "Import this character's appearance tags already extracted by Scene Studio",
    "Scene Studio에서 외형 가져오기 (호출 없음)": "Import appearance from Scene Studio (no call)",
    "의상 (선택, 영어 권장)": "Outfit (optional, English recommended)",
    "비우면 카드의 기본 의상 그대로. 예: white sailor school uniform with red ribbon": "Leave empty to keep the card's default outfit. e.g. white sailor school uniform with red ribbon",
    "화풍 프롬프트 · 제외 요소": "Style prompt · Excluded elements",
    "이름": "Name",
    "저장 (같은 이름이면 덮어써요)": "Save (overwrites if the name already exists)",
    "이 프리셋 삭제": "Delete this preset",
    "\"직접 입력\"에 글을 쓰고 이름을 정해 저장 아이콘을 누르면 프리셋으로 저장돼요. 같은 이름이면 덮어써요.": "Write text in \"Custom\", enter a name and press the save icon to store it as a preset. Saving with the same name overwrites it.",
    "생성에서 빼고 싶은 요소 (선택). 줄을 바꿔 적어도 한 줄로 합쳐 보내요.": "Things you want left out of the generation (optional). Multiple lines are joined into one.",
    "만들 표정 선택": "Choose expressions to make",
    "기본 6": "Basic 6",
    "핵심 10": "Core 10",
    "전체 28": "All 28",
    "해제": "Clear",
    "SillyTavern 기본 표정 확장과 같은 28개 이름이에요.": "Same 28 names as the SillyTavern expressions extension.",
    "노란색": "Yellow",
    "이미 만든 표정 ·": "= already made ·",
    "초록색": "Green",
    "이번에 만들 표정 ·": "= will be made now ·",
    "노란색+초록 테두리": "Yellow + green border",
    "선택했지만 이미 있어서 건너뛰는 표정 (아래 \"덮어쓰기\"를 켜면 다시 만들어요)": "= selected but already exists, so it's skipped (turn on \"Overwrite\" below to make it again)",
    "이미 있는 표정도 다시 만들어 덮어쓰기": "Also overwrite expressions that already exist",
    "중지": "Stop",
    "현재 스프라이트": "Current sprites",
    "만든 표정은 확인 없이 바로 스프라이트 폴더에": "Expressions you make are saved straight into the sprite folder as",
    "감정이름.png": "emotion-name.png",
    "로 저장돼요. 이미지 1장마다 이미지 API가 1번 호출돼서 요금이 발생해요. ↻ 다시 생성 · ✂ 배경/가장자리 조절 · ✕ 삭제": ". Each image is 1 image API call, which costs money. ↻ Regenerate · ✂ Background/edge tuning · ✕ Delete",
    "기준 사진을 바꾸면 이후에 만드는 표정부터 새 사진을 기준으로 해요. neutral이 이미 있으면 neutral도 함께 기준이 되니, 새 사진으로 통일하려면 neutral부터 다시 만들어 주세요.": "If you change the base photo, new expressions are made from the new photo. If neutral already exists, neutral is also used as a reference, so to unify on the new photo, remake neutral first.",
    "· 아직 없음 (표정을 만들 때 자동 추출)": "· none yet (extracted automatically when you make expressions)",
    "· 직접 수정함 (고정)": "· edited by you (locked)",
    "· 장면 생성기에서 가져옴": "· imported from Scene Studio",
    "· 자동 추출됨": "· auto-extracted",
    "(선택 {0}/{1} · 만든 표정 {2}/{3})": "(selected {0}/{1} · made {2}/{3})",
    "({0}장)": "({0})",
    "클릭하면 크게 보기": "Click to enlarge",
    "삭제": "Delete",
    "이 표정 다시 생성": "Regenerate this expression",
    "다시 생성": "Regenerate",
    "배경 제거 · 가장자리 조절": "Background removal · edge tuning",
    "가장자리 조절": "Edge tuning",
    "아직 스프라이트가 없어요. 위에서 표정을 골라 만들어 보세요.": "No sprites yet. Pick expressions above and make them.",
    "선택한 표정 만들기 ({0}장)": "Make selected expressions ({0})",
    "만들 표정이 없어요": "Nothing to make",
    "API 키를 입력해 주세요. (확장 프로그램 → 표정 추출기)": "Please enter an API key. (Extensions → Expression Extractor)",
    "표정 {0}장을 만들어요.\n이미지 API가 {1}번 호출되고 요금이 발생해요. 계속할까요?": "This will make {0} expression(s).\nThat's {1} image API call(s) and will cost money. Continue?",
    "표정 생성 {0}/{1} · {2} · {3}": "Generating {0}/{1} · {2} · {3}",
    "{0}/{1} · {2} 만드는 중…": "{0}/{1} · making {2}…",
    "{0} 생성 실패: {1}": "{0} failed: {1}",
    "취소했어요 ({0}장 완료)": "Cancelled ({0} done)",
    "끝! {0}장을 스프라이트 폴더에 저장했어요.{1}": "Done! Saved {0} expression image(s) to the sprite folder.{1}",
    "표정 생성을 취소했어요 ({0}장 저장됨). 이미 Google에 전달된 요청은 서버에서 계속돼 요금이 나올 수 있어요.": "Cancelled generation ({0} saved). Requests already sent to Google may still run on the server and incur charges.",
    "표정 {0}장을 {1} 폴더에 저장했어요. 안 보이면 채팅을 다시 열어 주세요.": "Saved {0} expression(s) to the {1} folder. If they don't show up, reopen the chat.",
    "저장된 표정이 없어요. 위의 오류를 확인해 주세요.": "Nothing was saved. Please check the errors above.",
    "\"{0}\" 표정을 다시 만들어요. 이미지 API 1회 호출이에요. 계속할까요?": "This will regenerate \"{0}\". It's 1 image API call. Continue?",
    "표정 다시 생성 · {0} · {1}": "Regenerating · {0} · {1}",
    "{0} 다시 만드는 중…": "Regenerating {0}…",
    "{0} 완료. {1}": "{0} done. {1}",
    "{0} 표정을 다시 만들었어요.": "Regenerated {0}.",
    "취소했어요": "Cancelled",
    "취소했어요. 이미 Google에 전달된 요청은 서버에서 계속돼 요금이 나올 수 있어요.": "Cancelled. Requests already sent to Google may still run on the server and incur charges.",
    "\"{0}\" 스프라이트를 삭제할까요?": "Delete the \"{0}\" sprite?",
    "삭제하지 못했어요.": "Couldn't delete it.",
    "장면 생성기(Scene Studio) 설정을 찾지 못했어요.": "Couldn't find the Scene Studio settings.",
    "장면 생성기에 \"{0}\"의 외형 태그가 아직 없어요. 장면 생성기에서 먼저 추출하거나, 옆의 추출 버튼을 눌러 주세요.": "Scene Studio has no appearance tags for \"{0}\" yet. Extract them in Scene Studio first, or use the extract button next to this one.",
    "직접 고친 외형이 있어요. 장면 생성기의 외형으로 덮어쓸까요?": "You have a manually edited appearance. Overwrite it with Scene Studio's?",
    "장면 생성기의 외형 태그를 가져왔어요. (텍스트 호출 없음)": "Imported the appearance tags from Scene Studio. (no text call)",
    "업로드 실패 (": "Upload failed (",
    "기준 사진을 바꿨어요. 이후에 만드는 표정부터 이 사진을 기준으로 해요.": "Base photo changed. Expressions you make from now on use this photo as the base.",
    "기준 사진을 바꾸지 못했어요: ": "Couldn't change the base photo: ",
    "이미지 요청": "Image requests",
    "배경 제거 · 가장자리": "Background removal · edges",
    "배경 제거 (투명 PNG로 저장)": "Remove background (save as transparent PNG)",
    "배경 제거 전 원본도 보관 (가장자리를 나중에 다시 조절할 수 있어요)": "Also keep the original before background removal (so you can retune edges later)",
    "숫자를 직접 입력해요. 이 값은 앞으로 만드는 표정에 적용돼요. 이미 만든 표정은 [표정] 탭에서 ✂를 눌러 미리 보면서 조절해요. 배경 제거와 가장자리 조절은 브라우저 안에서 처리돼서 API 호출이 늘지 않아요.": "Type the numbers directly. These values apply to expressions you make from now on. For ones already made, press ✂ in the [Expressions] tab and tune with a preview. Background removal and edge tuning run inside the browser, so they add no API calls.",
    "가장자리 값을 기본으로 되돌리기": "Reset edge values to defaults",
    "데이터 정리": "Data cleanup",
    "보관한 원본과 기준 사진은 서버의": "Kept originals and base photos are stored on the server in the",
    "폴더에 저장돼요. 표정 스프라이트(": "folder. Sprites (",
    ")는 아래 버튼으로 지워지지 않아요.": ") are not deleted by the buttons below.",
    "어디에서도 쓰지 않는 파일과, ST에서 삭제된 캐릭터의 설정을 정리해요": "Cleans up files nothing uses, and settings for characters deleted from ST",
    "쓰지 않는 파일 정리": "Clean up unused files",
    "보관한 원본을 모두 지워요. 이후 ✂ 조절은 현재 이미지를 기준으로 해요": "Deletes all kept originals. Afterwards ✂ tuning uses the current image as the base",
    "보관한 원본 모두 삭제": "Delete all kept originals",
    "API 키, 기록, 외형 태그, 프리셋, 기준 사진, 보관 파일을 모두 지워요": "Deletes the API key, log, appearance tags, presets, base photos and kept files",
    "이 확장의 모든 데이터 삭제": "Delete all data of this extension",
    "성공": "OK",
    "429 재시도": "429 retry",
    "이미지": "Image",
    "시각": "Time",
    "종류": "Type",
    "내용": "Details",
    "토큰": "Tokens",
    "결과": "Result",
    "아직 나간 호출이 없어요.": "No calls yet.",
    "텍스트 호출": "Text calls",
    "토큰 ≈ {0} 입력 / {1} 출력": "Tokens ≈ {0} in / {1} out",
    "이미지 호출": "Image calls",
    "토큰 {0} 입력 / {1} 출력": "Tokens {0} in / {1} out",
    "요청이 몰려 기다린 횟수": "Times it waited because of too many requests",
    "텍스트 토큰은 글자 수로 추정한 값(≈)이에요. 이미지 토큰은 Google이 알려 준 실제 값이에요.": "Text tokens are estimated from character count (≈). Image tokens are the actual values Google reports.",
    "누적 초기화": "Reset totals",
    "언제 호출되나요": "When are calls made?",
    ": 외형 태그 추출": ": appearance-tag extraction is",
    "1회": "1 call",
    "예요. 캐릭터마다 처음 한 번만 나가고, 카드 설명이 바뀌었거나 \"다시 추출\"을 누를 때만 다시 나가요. 직접 고친 외형은 호출하지 않아요.": ". It runs only once per character the first time, and again only when the card description changes or you press \"Re-extract\". A manually edited appearance makes no call.",
    ": 만들 표정": ": each expression you make is",
    "한 장당 1회": "1 call per image",
    "예요. neutral이 없으면 기준용 neutral 1장이 먼저 더해져요. ↻ 다시 생성도 1회예요. 429가 나면 기다렸다가 다시 보내요.": ". If neutral is missing, 1 neutral image is added first as the reference. ↻ Regenerate is also 1 call. On a 429 it waits and retries.",
    "0회": "0 calls",
    ": 배경 제거, 가장자리 조절, 삭제, 기준 사진 바꾸기, 장면 생성기에서 외형 가져오기는 API를 쓰지 않아요.": ": background removal, edge tuning, deleting, changing the base photo and importing appearance from Scene Studio don't use any API.",
    "최근 호출": "Recent calls",
    "이미지를 불러오지 못했어요: ": "Couldn't load the image: ",
    "체커": "Checker",
    "검정": "Black",
    "초록": "Green",
    "흰색": "White",
    "미리보기 배경": "Preview background",
    "적용 (스프라이트에 저장)": "Apply (save to sprite)",
    "이 값을 기본값으로": "Use these values as defaults",
    "기본값으로 되돌리기": "Reset to defaults",
    "· 배경 제거 전 원본에서 다시 계산해요 (언제든 되돌릴 수 있어요)": "· recalculated from the original before background removal (you can always revert)",
    "· 원본이 없어서 지금 이미지를 기준으로 해요 (적용하면 덮어써요)": "· no original kept, so the current image is the base (applying overwrites it)",
    "배경이 균일하지 않아 배경 제거를 건너뛰어요 (인식 {0}%). 민감도를 조절해 보세요.": "The background isn't uniform, so background removal is skipped (detected {0}%). Try adjusting the sensitivity.",
    "이미 투명한 이미지예요. 배경 민감도는 쓰이지 않아요.": "This image is already transparent. Background sensitivity isn't used.",
    " · 내부 빈 공간 {0}% 지움": " · removed {0}% enclosed gaps",
    "배경 인식 {0}%{1}": "Background detected {0}%{1}",
    "원본이 없어서 지금 이미지에 덮어써요. 되돌릴 수 없어요. 계속할까요?": "There's no original, so this overwrites the current image and can't be undone. Continue?",
    "저장 중…": "Saving…",
    "배경이 균일하지 않아 적용하지 않았어요. 민감도를 조절해 보세요.": "The background isn't uniform, so nothing was applied. Try adjusting the sensitivity.",
    "{0} 가장자리를 적용했어요.": "Applied edges to {0}.",
    "적용 실패: ": "Apply failed: ",
    "생성 중에는 정리할 수 없어요.": "Can't clean up while generating.",
    "쓰지 않는 파일 {0}개를 지우고, 삭제된 캐릭터의 설정 {1}개를 정리했어요.": "Deleted {0} unused file(s) and cleaned up {1} setting(s) for deleted characters.",
    "보관한 원본 {0}개를 모두 삭제해요.\n이후 ✂ 가장자리 조절은 지금 저장된 이미지를 기준으로 해요. 계속할까요?": "This deletes all {0} kept originals.\nAfterwards, ✂ edge tuning uses the currently saved image as the base. Continue?",
    "보관한 원본 파일 {0}개를 지웠어요.": "Deleted {0} kept original file(s).",
    "이 확장의 모든 데이터를 삭제해요.\n\n- API 키, 호출 기록, 외형 태그, 화풍 프리셋, 창 위치 등 설정 전체\n- 서버에 보관한 원본/기준 사진 파일 전체\n\n만든 표정 스프라이트(characters/…)와 ST 표정 확장의 \"폴더 덮어쓰기\"는 그대로 남아요.\n스프라이트도 지우려면 이 버튼보다 먼저 \"스프라이트 삭제\"를 쓰세요. 이 버튼을 누르면 어떤 폴더가 이 확장으로 만든 것인지 기억도 지워져요.\n확장을 지우기 전에 쓰는 기능이에요. 계속할까요?": "This deletes all data of this extension.\n\n- All settings such as API key, call log, appearance tags, style presets and window position\n- All original/base-photo files kept on the server\n\nThe expression sprites you made (characters/…) and the ST expressions extension's \"Sprite folder override\" are left as they are.\nTo delete the sprites too, use \"Delete sprites\" before this button. Pressing this button also erases the memory of which folders this extension made.\nUse this before uninstalling the extension. Continue?",
    "모든 데이터를 삭제했어요. (서버 파일 {0}개) 확장을 지우거나, 계속 쓰려면 페이지를 새로고침하세요.": "Deleted all data. ({0} server file(s)) Now remove the extension, or reload the page to keep using it.",
    "정리하지 못했어요: ": "Couldn't clean up: ",
    "호출 기록과 누적 횟수를 모두 지울까요?": "Clear the call log and all totals?",
    "이 값을 기본값으로 저장했어요. 앞으로 만드는 표정에 적용돼요. (설정 탭에서도 바꿀 수 있어요)": "Saved these values as defaults. They apply to expressions you make from now on. (You can also change them in the Settings tab.)",
    "생성 중에는 폴더를 바꿀 수 없어요.": "Can't change folders while generating.",
    "카드 PNG를 기준으로 되돌렸어요.": "Switched the base back to the card PNG.",
    "카드 설명이 비어 있어요. 외형을 직접 적어 주세요.": "The card description is empty. Please write the appearance yourself.",
    "직접 고친 외형이 지워지고 카드 설명에서 새로 추출해요. 계속할까요?": "Your manually edited appearance will be erased and re-extracted from the card description. Continue?",
    "추출하는 중…": "Extracting…",
    "외형을 추출했어요.": "Appearance extracted.",
    "외형을 만들지 못했어요.": "Couldn't generate an appearance.",
    "외형 추출 실패: ": "Appearance extraction failed: ",
    "저장할 이름을 입력해 주세요.": "Please enter a name to save under.",
    "프롬프트가 비어 있어요.": "The prompt is empty.",
    "\"{0}\"에 덮어썼어요.": "Overwrote \"{0}\".",
    "\"{0}\"으로 저장했어요.": "Saved as \"{0}\".",
    "\"직접 입력\"은 삭제할 수 없어요. 글을 지우면 비워져요.": "\"Custom\" can't be deleted. Clear the text to empty it.",
    "\"{0}\" 프리셋을 삭제할까요?": "Delete the \"{0}\" preset?",
    "생성 중에는 캐릭터를 바꿀 수 없어요. 취소하거나 끝날 때까지 기다려 주세요.": "Can't switch characters while generating. Cancel it or wait until it finishes.",
    "🎭 Expression Extractor · 표정 추출기": "🎭 Expression Extractor",
    "표정 추출기 사용 (끄면 마법봉 메뉴에서 사라져요)": "Enable Expression Extractor (hides it from the wand menu when off)",
    "표정 추출기 열기": "Open Expression Extractor",
    "API 키, 텍스트 모델 프로필, 화풍 프리셋, 제외 요소, 외형 태그를 가져와요": "Imports the API key, text model profile, style presets, excluded elements and appearance tags",
    "Scene Studio 설정 가져오기": "Import Scene Studio settings",
    "이미지 모델": "Image model",
    "기본 모델로 ({0})": "Default model ({0})",
    "텍스트 모델 (외형 추출용 연결 프로필)": "Text model (connection profile for appearance extraction)",
    "이미지 제공자": "Image provider",
    "Agent Platform API (구 Vertex AI) 직접 · API 키 전용": "Agent Platform API (formerly Vertex AI) direct · API key only",
    "Google Cloud API 키": "Google Cloud API key",
    "연결 테스트": "Test connection",
    "이미지 요청 간격, 배경 제거, 가장자리 조절은 표정 추출기 창의": "Request interval, background removal and edge tuning are in the",
    "탭에, 호출 내역은": "tab of the Expression Extractor window, and the call log is in the",
    "탭에 있어요. 키는 SillyTavern settings.json에 평문으로 저장돼요.": "tab. The API key is stored as plain text in SillyTavern's settings.json.",
    "채팅에 연결된 모델 그대로 사용": "Use the model currently connected to the chat",
    "외형 추출(텍스트 호출 1회)에 쓸 모델이에요. Flash 같은 저렴한 프로필을 고르면 채팅 내용을 보내지 않고 카드 설명만 보내요. 비워 두면 지금 채팅에 연결된 모델을 써요.": "The model used for appearance extraction (1 text call). If you pick a cheap profile such as Flash, only the card description is sent, not the chat. If left empty, the model currently connected to the chat is used.",
    "연결 프로필 목록을 찾지 못했어요. SillyTavern의": "Couldn't find the connection profile list. Turn on SillyTavern's",
    "확장을 켜고 프로필을 만들면 여기서 고를 수 있어요. 지금은 채팅에 연결된 모델을 써요.": "extension and create a profile, then you can choose it here. For now the model connected to the chat is used.",
    "이미지 모델을 {0}로 되돌렸어요.": "Image model reset to {0}.",
    "표정 추출기": "Expression Extractor",
    "ST 표정 확장은 채팅을 열 때 목록을 새로 읽으니, 바로 안 보이면 채팅을 다시 열어 보세요.": "The ST expressions extension re-reads the list when a chat opens, so if they don't show up right away, reopen the chat.",
    "이미지 요청 간격 (초)": "Image request interval (sec)",
    "429(요청 과다)가 뜨면 늘려 보세요. 429가 나면 자동으로 기다렸다가 다시 시도해요.": "If you see 429 (too many requests), increase it. On a 429 the extension automatically waits and retries.",
    "배경 민감도": "Background sensitivity",
    "값이 크면 배경을 더 많이 지우지만 인물 가장자리가 깎일 수 있어요.": "Higher values remove more of the background, but can eat into the character's edges.",
    "내부 빈 공간 지우기 (0=끔)": "Remove enclosed gaps (0 = off)",
    "팔과 몸 사이처럼 테두리와 이어지지 않은 배경색 빈틈을 지워요. 값이 크면 흰 옷 같은 밝은 면도 지워질 수 있어서 ✂ 미리보기로 확인하며 올려 보세요.": "Removes background-colored gaps that aren't connected to the outer edge, such as between an arm and the body. Large values can also remove bright areas such as white clothing, so raise it while checking the ✂ preview.",
    "흰 테두리 제거 (0=끔)": "Remove white fringe (0 = off)",
    "인물 가장자리에 남은 흰 띠를 지워요. 값이 크면 흰 옷이나 밝은 머리카락 가장자리도 깎일 수 있어요.": "Removes the leftover white rim around the character. Large values can also trim white clothes or light hair at the edge.",
    "가장자리 줄이기 (px)": "Shrink edge (px)",
    "경계를 안쪽으로 깎아서 남은 테두리를 없애요. 값이 크면 인물이 얇아져 보여요.": "Cuts the outline inward to get rid of any leftover rim. Large values make the character look thinner.",
    "가장자리 부드럽게 (px)": "Soften edge (px)",
    "경계를 흐리게 해서 계단을 줄여요. 값이 크면 윤곽이 번져 보일 수 있어요.": "Blurs the outline to reduce jagged steps. Large values can make the outline look fuzzy.",
    "⚠ ST 표정 확장의 대체 표정은 \"{0}\"인데 이 캐릭터에는 그 스프라이트가 없어요. 답변에서 고른 감정의 표정이 없으면 이미지가 비어 보여요.": "⚠ The ST expressions extension's fallback expression is \"{0}\", but this character has no {0} sprite. When the emotion picked from the reply has no sprite, the image area stays blank.",
    "⚠ ST 표정 확장에 대체 표정이 설정돼 있지 않아요. 답변에서 고른 감정의 표정이 없으면 이미지가 비어 보여요.": "⚠ No fallback expression is set in the ST expressions extension. When the emotion picked from the reply has no sprite, the image area stays blank.",
    "ST 표정 확장의 'Default / Fallback Expression'을 neutral로 바꿔요": "Changes 'Default / Fallback Expression' in the ST expressions extension to neutral",
    "neutral을 대체 표정으로 설정": "Set neutral as the fallback expression",
    "neutral 표정을 먼저 만들면 대체 표정으로 쓸 수 있어요.": "Make the neutral expression first, then you can use it as the fallback.",
    "ST 표정 확장의 대체 표정을 {0}로 바꿨어요. 바로 안 바뀌면 채팅을 다시 열어 보세요.": "Changed the ST expressions extension's fallback expression to {0}. If it doesn't change right away, reopen the chat.",
    "점검하는 중…": "Checking…",
    "ST의 Character Expressions 확장이 꺼져 있어요. 켜야 표정이 표시돼요.": "ST's Character Expressions extension is turned off. Turn it on to show expressions.",
    "ST 화면에서 스프라이트 상자(expression-holder)를 찾지 못했어요. Character Expressions 확장이 설치/활성화돼 있는지 확인해 주세요.": "Couldn't find ST's sprite box (expression-holder) on the page. Check that the Character Expressions extension is installed and enabled.",
    "ST Character Expressions 확장이 켜져 있어요.": "ST's Character Expressions extension is on.",
    "폴더 characters/{0}/ 에서 스프라이트를 하나도 찾지 못했어요. ST가 읽는 폴더 이름이 이 캐릭터 이름과 다른지 확인해 주세요.": "No sprites found in characters/{0}/. Check whether the folder ST reads differs from this character's name.",
    "폴더 characters/{0}/ 에서 스프라이트 {1}장을 찾았어요.": "Found {1} sprite(s) in characters/{0}/.",
    "불러오지 못하는 파일: {0}": "Files that failed to load: {0}",
    "모든 파일이 서버에서 정상적으로 받아져요.": "All files load fine from the server.",
    "{0} 이미지 크기: {1}×{2}": "{0} image size: {1}×{2}",
    "{0} 이미지를 브라우저가 열지 못했어요.": "The browser couldn't open the {0} image.",
    "ST 스프라이트 상자: display={0}, 크기 {1}×{2}px": "ST sprite box: display={0}, size {1}×{2}px",
    "ST의 스프라이트 이미지에 주소가 비어 있어요. ST가 최근 답변에 맞는 표정을 아직 고르지 못했거나, 고른 표정의 스프라이트를 찾지 못한 상태예요.": "The sprite image in ST has no address. ST hasn't picked an expression for the latest reply yet, or couldn't find a sprite for the one it picked.",
    "ST가 지금 쓰는 이미지: {0} ({1}×{2}, {3})": "Image ST is using now: {0} ({1}×{2}, {3})",
    "불러옴": "loaded",
    "불러오는 중 또는 실패": "loading or failed",
    "Visual Novel(와이프) 모드: {0} · 대체 표정: {1} · 분류 방식: {2}": "Visual Novel (Waifu) mode: {0} · fallback expression: {1} · classifier: {2}",
    "켜짐": "On",
    "꺼짐": "Off",
    "기본 이모지": "default emoji",
    "없음": "none",
    "모바일 화면에서는 ST가 Visual Novel(와이프) 모드를 켰을 때만 스프라이트를 보여줘요.": "On a mobile screen, ST only shows sprites when Visual Novel (Waifu) mode is on.",
    "ST에서 표정이 안 보여요? 점검": "Expressions not showing in ST? Run a check",
    "ST 화면에서 표정이 비어 보일 때 어디에서 막히는지 확인해요. 결과를 캡처해서 공유하면 원인을 찾는 데 도움이 돼요.": "Checks where things get stuck when ST shows no expression. Share a screenshot of the result to help find the cause.",
    "점검하기": "Run check",
    "Local (영어 전용 모델)": "Local (English-only model)",
    "분류 전에 영어로 번역: {0}": "Translate to English before classification: {0}",
    "마지막 답변이 영어가 아니에요. ST의 기본 표정 분류기는 영어 전용이라 감정을 잘못 고르거나 만들지 않은 표정을 고를 수 있어요. \"Translate text to English before classification\"을 켜거나 분류 방식(Classifier API)을 \"Main API\"로 바꿔 보세요.": "The latest reply isn't in English. ST's default expression classifier is English-only, so it can pick the wrong emotion or one you haven't made. Turn on \"Translate text to English before classification\", or set the Classifier API to \"Main API\".",
    "번역 후 분류 켜기": "Turn on translate-before-classification",
    "번역 후 분류를 쓰려면 ST의 Chat Translation 확장을 켜고 번역 방식을 설정해야 해요.": "To use translate-before-classification, turn on ST's Chat Translation extension and choose a translation provider.",
    "번역 후 분류가 켜져 있지만 Chat Translation 확장이 동작하지 않아서 번역되지 않아요.": "Translate-before-classification is on, but the Chat Translation extension isn't active, so nothing gets translated.",
    "분류 방식이 Main API인데 만든 표정만 사용하는 옵션(Only show and use expressions that have sprites)이 꺼져 있어요. 표정을 일부만 만들었다면 켜 두면 만든 표정 중에서만 골라요.": "The Classifier API is Main API, but the option to only use expressions that have sprites is off. If you've made only some expressions, turn it on so it only picks from those.",
    "번역 후 분류를 켰어요. 새 답변부터 적용돼요.": "Turned on translate-before-classification. It applies from the next reply.",
    "스프라이트 삭제 (선택)": "Delete sprites (optional)",
    "만든 표정 스프라이트(characters/…)는 ST 표정 확장이 쓰는 파일이라 아래 \"데이터 정리\" 버튼으로는 지워지지 않아요. 확장을 완전히 지울 때 여기서 골라서 지우세요. 지우면 되돌릴 수 없어요. \"이 확장의 모든 데이터 삭제\"보다 먼저 쓰세요.": "Expression sprites (characters/…) are files used by ST's expressions extension, so the \"Data cleanup\" buttons below don't delete them. When you remove the extension completely, choose and delete them here. This can't be undone. Use it before \"Delete all data of this extension\".",
    "스프라이트 폴더 찾기": "Find sprite folders",
    "찾는 중…": "Searching…",
    "스프라이트가 들어 있는 폴더를 찾지 못했어요.": "No folders with sprites were found.",
    "{0}장": "{0} file(s)",
    "ST에 없는 캐릭터": "character no longer in ST",
    "이 확장으로 만든 것으로 보여요": "looks made with this extension",
    "그 외 (직접 올린 것일 수 있어요)": "other (may be uploaded by you)",
    "선택한 스프라이트 삭제": "Delete selected sprites",
    "파일을 지운 뒤에도 빈 폴더는 남아요(ST가 확장에게 폴더 삭제를 허용하지 않아요). 빈 폴더만 지우는 명령(Termux):": "Empty folders remain after the files are deleted (ST doesn't let an extension remove folders). Command that removes only empty folders (Termux):",
    "선택: 폴더 {0}개, 스프라이트 {1}장": "Selected: {0} folder(s), {1} sprite file(s)",
    "삭제할 폴더를 선택해 주세요.": "Select the folders to delete.",
    "폴더 {0}개의 스프라이트 {1}장을 삭제해요.\n\n{2}\n\n이 확장으로 만든 전용 폴더 설정과 보관한 원본도 함께 지워요. 되돌릴 수 없어요. 계속할까요?": "This deletes {1} sprite file(s) in {0} folder(s).\n\n{2}\n\nThe dedicated-folder settings and kept originals made by this extension are removed too. This can't be undone. Continue?",
    "삭제하는 중…": "Deleting…",
    "스프라이트 {0}장을 삭제했어요. 빈 폴더는 남아요.": "Deleted {0} sprite file(s). Empty folders remain.",
    "삭제하지 못한 파일 {0}개": "{0} file(s) couldn't be deleted",
  };
  const effLang = () => { const l = S().lang; return l === 'ko' || l === 'en' ? l : (String(navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en'); };
  const missingKeys = new Set();
  function tl(ko, vars) {
    let out = ko;
    if (effLang() === 'en') {
      const v = EN[ko];
      if (v !== undefined) out = v;
      else if (/[가-힣]/.test(ko) && !missingKeys.has(ko)) { missingKeys.add(ko); console.debug('[EE] missing translation:', ko); }
    }
    return vars ? out.replace(/\{(\d+)\}/g, (m, i) => (vars[i] ?? m)) : out;
  }

  const say = (kind, msg) => window.toastr?.[kind]?.(msg);

  /* ================= 상수 ================= */
  const EMO_DESC = {
    neutral: 'relaxed natural standing pose, weight on one leg, arms resting loosely at the sides or one hand lightly touching the hem of the clothes, slight three-quarter body turn, soft calm face',
    joy: 'laughing happily, leaning slightly forward, hands clasped near the chest, bright smile',
    sadness: 'head lowered, hugging their own arm, teary eyes, drooping shoulders',
    anger: 'arms crossed, sharp glare, one foot forward, furrowed brows',
    surprise: 'startled, both hands raised near the chest, leaning back, wide eyes and open mouth',
    embarrassment: 'blushing, looking away, one hand touching hair or cheek, fidgeting',
    nervousness: 'fidgeting with fingers, tense shoulders, uneasy sideways glance',
    annoyance: 'pouting, one hand on hip, half-lidded eyes, head turned slightly away',
    love: 'one hand on chest, soft loving gaze, gentle smile, slight blush, head tilted',
    curiosity: 'head tilted, leaning toward the viewer, one hand near the chin, interested eyes',
    admiration: 'eyes sparkling, hands pressed together near the chin, looking up with awe',
    amusement: 'trying not to laugh, hand covering the mouth, shoulders shaking, playful eyes',
    approval: 'confident nod, small satisfied smile, one thumb up or a hand on hip',
    caring: 'gentle concerned look, one hand reaching out slightly, soft warm smile',
    confusion: 'puzzled frown, head tilted, one hand scratching the head, eyebrows raised',
    desire: 'half-lidded alluring gaze, slight blush, lip bitten lightly, leaning in a little',
    disappointment: 'deflated posture, downcast eyes, a small sigh, arms hanging loosely',
    disapproval: 'stern look, arms crossed, one eyebrow raised, chin slightly lifted',
    disgust: 'wrinkled nose, leaning away, one hand raised as if pushing something off',
    excitement: 'bouncing with energy, both fists clenched near the chest, wide sparkling eyes, big grin',
    fear: 'frightened, shrinking back, hands held close to the chest, wide trembling eyes',
    gratitude: 'warm smile, hands held over the heart, a slight bow of the head',
    grief: 'overwhelmed with sorrow, face half hidden by a hand, tears running, slumped shoulders',
    optimism: 'looking up and forward with a hopeful smile, chest open, one fist lightly raised',
    pride: 'chin lifted, hands on hips, confident smirk, chest out',
    realization: 'sudden realization, eyes widening, one finger raised, mouth slightly open',
    relief: 'letting out a breath, shoulders relaxing, soft smile with eyes closed',
    remorse: 'guilty look, head bowed, hands clasped in front, avoiding eye contact',
  };
  const ALL = Object.keys(EMO_DESC);
  const LIST_NOTE = 'ST 표정 확장은 채팅을 열 때 목록을 새로 읽으니, 바로 안 보이면 채팅을 다시 열어 보세요.';
  const SET6 = ['neutral', 'joy', 'sadness', 'anger', 'surprise', 'embarrassment'];
  const emoOrder = (l) => { const i = ALL.indexOf(l); return i < 0 ? 999 : i; };   // 목록에 없는 이름은 맨 뒤
  const CORE10 = ['neutral', 'joy', 'sadness', 'anger', 'surprise', 'embarrassment', 'nervousness', 'annoyance', 'love', 'curiosity'];

  const defaults = {
    enabled: true, lang: 'auto',
    geminiKey: '', geminiModel: DEFAULT_MODEL, llmProfile: '',
    imgGapSec: 6,
    cutout: true, cutTol: 34, edgeFringe: 30, edgeShrink: 1, edgeSoft: 1, holeTol: 0, keepOrig: true,
    folders: {},      // 이 확장이 스프라이트를 저장한 폴더 이름들 (스프라이트 삭제 때 찾는 용도)
    stylePreset: 'custom', styleText: '', stylePresets: [], customText: '', negative: '',
    overwrite: false, emosDefault: [...SET6],
    chars: {},        // 캐릭터별: { outfit, emos, ref(직접 고른 기준 사진 경로) }
    appearance: {},   // 캐릭터별 외형 태그: { [avatar]: { h, t, manual } }   (장면 생성기와 같은 구조)
    origs: {},        // 배경 제거 전 원본 이미지 경로: { 'avatar|감정': url }
    usage: { text: 0, image: 0, r429: 0, tin: 0, tout: 0, iin: 0, iout: 0 }, usageLog: [],   // 호출 기록
    win: null, pillPos: null, _mig: 0,
  };

  /* ================= 저장소/유틸 ================= */
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const uid = () => 'p' + Math.random().toString(36).slice(2, 9);
  const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };
  const $ = (sel, root = document) => root.querySelector(sel);

  /* '모든 데이터 삭제' 뒤에는 설정 항목을 다시 만들지 않아요. (화면 문구를 그리는 것만으로도 항목이 되살아나 settings.json에 남을 수 있었어요)
   * 새로고침하면 처음 상태로 다시 시작해요. */
  let wiped = false, ghost = null;
  function S() {
    if (wiped) return (ghost ||= structuredClone(defaults));
    const { extensionSettings } = ctx();
    if (!extensionSettings[MODULE]) extensionSettings[MODULE] = structuredClone(defaults);
    const s = extensionSettings[MODULE];
    for (const k of Object.keys(defaults)) if (s[k] === undefined) s[k] = structuredClone(defaults[k]);
    if (s._mig < 1) {   // 1.0 → 1.1 한 번만: 모델을 기본값으로, 예전 화풍 칸 이전
      s.geminiModel = DEFAULT_MODEL;
      if (typeof s.style === 'string' && s.style.trim()) { s.styleText = s.style; s.customText = s.style; }
      delete s.style; delete s.lookModel; delete s.lookVision;
      for (const c of Object.values(s.chars || {})) delete c.look;   // 예전 방식으로 뽑은 외형은 버린다 (새 방식으로 다시 추출)
      s._mig = 1;
    }
    if (s._mig < 2) { delete s.provider; delete s.vertexProject; delete s.vertexLocation; delete s.imported; s._mig = 2; }   // 1.2: Agent Platform 전용
    if (!s.geminiModel?.trim()) s.geminiModel = DEFAULT_MODEL;
    return s;
  }
  const save = () => ctx().saveSettingsDebounced();
  const cd = (ch) => { const s = S(); return (s.chars[ch.avatar] ||= { outfit: '', emos: null }); };

  /* 장면 생성기(Scene Studio, 설정 이름 minimap)의 설정을 가져온다. 이미지 모델은 가져오지 않고 기본값을 유지해요. */
  function importFromSS() {
    const s = S(), v = ctx().extensionSettings?.minimap;
    if (!v) { say('info', tl("장면 생성기(Scene Studio) 설정을 찾지 못했어요. 설치돼 있고 한 번 열어 본 적이 있는지 확인해 주세요.")); return false; }
    const got = [];
    if (String(v.geminiKey || '').trim()) { s.geminiKey = String(v.geminiKey).trim(); got.push(tl("API 키")); }
    if (v.llmProfile) { s.llmProfile = v.llmProfile; profWarned = false; got.push(tl("텍스트 모델 프로필")); }
    let np = 0;   // 화풍 프리셋: 이름이 같으면 덮어쓰고, 없으면 추가
    for (const p of v.stylePresets || []) {
      if (!p?.name || !p?.text) continue;
      const same = s.stylePresets.find((x) => x.name === p.name);
      if (same) same.text = p.text; else s.stylePresets.push({ id: p.id || uid(), name: p.name, text: p.text });
      np++;
    }
    if (np) got.push(tl("화풍 프리셋 {0}개",[np]));
    if (String(v.styleText || '').trim()) {
      const pick = (v.stylePresets || []).find((p) => p.id === v.stylePreset);
      s.stylePreset = (pick && s.stylePresets.find((x) => x.name === pick.name)?.id) || 'custom';
      s.customText = v.customText || v.styleText; s.styleText = v.styleText; got.push(tl("화풍 프롬프트"));
    }
    if (String(v.negative || '').trim()) { s.negative = v.negative; got.push(tl("제외 요소")); }
    let na = 0;   // 외형 태그: 장면 생성기는 캐릭터 이름으로 저장해요. 이 확장에 아직 없는 캐릭터만 채워요.
    for (const c of chars()) { const a = v.appearance?.[c.name]; if (a?.t && !s.appearance[c.avatar]) { s.appearance[c.avatar] = { h: hash(descOf(c)), t: a.t, manual: !!a.manual, src: 'ss' }; na++; } }
    if (na) got.push(tl("외형 태그 {0}개",[na]));
    normalizeStyle(); save(); syncDrawer();
    if (root && !root.classList.contains('ee-off')) renderBody();
    if (v.imgProvider && v.imgProvider !== 'vertex') say('warning', tl("장면 생성기는 Agent Platform이 아닌 방식(AI Studio 등)을 쓰고 있어요. 이 확장은 Agent Platform API 키만 지원해서, 키가 안 맞으면 연결 테스트가 실패할 수 있어요."));
    if (String(v.vertexProject || '').trim()) say('info', tl("프로젝트 ID는 쓰지 않아요. API 키 전용 방식으로 호출해요."));
    say(got.length ? 'success' : 'info', got.length ? tl("장면 생성기에서 가져왔어요: {0}",[got.join(', ')]) : tl("가져올 설정이 없었어요."));
    return got.length > 0;
  }

  /* ================= 캐릭터/스프라이트 폴더 ================= */
  const chars = () => ctx().characters || [];
  /* ST 표정 확장은 캐릭터 이름 폴더를 쓰고, 폴더 덮어쓰기(expressionOverrides)가 있으면 그 경로를 써요 */
  function folderOf(ch) {
    const base = String(ch.avatar || '').replace(/\.[^.]+$/, '');
    const ov = ctx().extensionSettings?.expressionOverrides;
    const hit = Array.isArray(ov) && ov.find((e) => e?.name === base);
    return hit?.path || ch.name;
  }
  /* 이름이 같은 캐릭터는 표정 폴더(캐릭터 이름)를 같이 써서 서로의 표정이 섞여요. ST 표정 확장의 "폴더 덮어쓰기"로 캐릭터마다 폴더를 나눌 수 있어요. */
  const avatarBase = (ch) => String(ch.avatar || '').replace(/\.[^.]+$/, '');
  const dupCount = (ch) => chars().filter((c) => c.name === ch.name).length;   // 이름이 같은 캐릭터 수 (목록 표시용)
  const sharers = (ch) => chars().filter((c) => folderOf(c) === folderOf(ch)).length;   // 같은 표정 폴더를 쓰는 캐릭터 수
  const ownFolder = (ch) => `${ch.name}_${avatarBase(ch)}`;
  const overrideOf = (ch) => { const ov = ctx().extensionSettings?.expressionOverrides; return Array.isArray(ov) ? ov.find((e) => e?.name === avatarBase(ch)) : null; };
  const st = { avatar: '', sprites: [], bust: {}, busy: false, stop: false, tab: 'main', abort: null, msg: '', prog: '' };
  const curChar = () => chars().find((c) => c.avatar === st.avatar) || null;
  function defaultAvatar() { const c = ctx(); return c.characters?.[c.characterId]?.avatar || c.characters?.[0]?.avatar || ''; }
  const jsonHeaders = () => ctx().getRequestHeaders();
  const spriteUrl = (sp) => sp.path + (st.bust[sp.label] ? (sp.path.includes('?') ? '&' : '?') + 't=' + st.bust[sp.label] : '');
  const hasSprite = (label) => st.sprites.some((x) => x.label === label);
  const origKey = (ch, label) => ch.avatar + '|' + label;

  async function loadSprites(ch) {
    try {
      const r = await fetch('/api/sprites/get?name=' + encodeURIComponent(folderOf(ch)), { headers: jsonHeaders() });
      const j = r.ok ? await r.json() : [];
      st.sprites = (Array.isArray(j) ? j : []).filter((x) => x?.label && x?.path).sort((a, b) => emoOrder(a.label) - emoOrder(b.label) || a.label.localeCompare(b.label));   // neutral 맨 앞, 나머지는 표정 목록 순서
    } catch { st.sprites = []; }
  }
  /* 스프라이트 폴더에 바로 저장 (같은 감정 파일은 서버가 덮어써요) */
  async function uploadSprite(ch, label, blob) {
    const fd = new FormData();
    fd.append('name', folderOf(ch)); fd.append('label', label); fd.append('spriteName', label);
    fd.append('avatar', new File([blob], label + '.png', { type: 'image/png' }));
    const h = { ...jsonHeaders() }; delete h['Content-Type']; delete h['content-type'];   // FormData는 브라우저가 경계를 붙인다
    const r = await fetch('/api/sprites/upload', { method: 'POST', headers: h, body: fd });
    if (!r.ok) throw new Error(tl("스프라이트 저장 실패 (") + r.status + ')');
    st.bust[label] = Date.now();
    S().folders[folderOf(ch)] = Date.now(); save();   // 이 폴더에 썼다는 기록
  }
  async function deleteSprite(ch, label) {
    const r = await fetch('/api/sprites/delete', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ name: folderOf(ch), label, spriteName: label }) });
    return r.ok;
  }
  /* 배경 제거 전 원본을 따로 보관해 두면, 가장자리 조절을 몇 번이든 원본에서 다시 계산할 수 있어요 */
  async function saveOrig(ch, label, b64, mime) {
    const prev = S().origs[origKey(ch, label)];
    try {
      const fmt = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const r = await fetch('/api/images/upload', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ image: b64, format: fmt, ch_name: 'expression-extractor', filename: `${ch.name}_${label}_orig_${Date.now()}` }) });
      if (!r.ok) throw new Error(r.status);
      const url = '/' + String((await r.json()).path).replace(/^\\+|^\/+/, '');
      S().origs[origKey(ch, label)] = url; save();
      if (prev && prev !== url) await deleteImageFile(prev);   // 이전 원본은 더 이상 안 쓰니 지워요
    } catch (e) { console.warn('[EE] 원본 보관 실패 (스프라이트 저장에는 영향 없어요)', e); }
  }

  /* ================= 이 확장이 서버에 남기는 파일 (원본 / 기준 사진) 관리 ================= */
  const IMG_DIR = 'user/images/expression-extractor/';
  const relImg = (url) => String(url || '').replace(/^\/+/, '');
  const isOurImg = (url) => relImg(url).startsWith(IMG_DIR);
  /* 이 확장 폴더 안의 파일만 지운다 (다른 이미지는 절대 건드리지 않아요) */
  async function deleteImageFile(url) {
    if (!isOurImg(url)) return false;
    delete refCache[url];
    try { const r = await fetch('/api/images/delete', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ path: relImg(url) }) }); return r.ok; } catch { return false; }
  }
  async function dropOrig(ch, label) {
    const k = origKey(ch, label), old = S().origs[k];
    if (!old) return;
    delete S().origs[k]; save(); await deleteImageFile(old);
  }
  async function listOurImages() {
    const r = await fetch('/api/images/list', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ folder: 'expression-extractor', sortField: 'name' }) });
    if (!r.ok) throw new Error(tl("파일 목록을 불러오지 못했어요 (") + r.status + ')');
    const j = await r.json(); return Array.isArray(j) ? j.map(String) : [];
  }
  const referencedFiles = () => { const s = S(), set = new Set(); for (const u of Object.values(s.origs)) set.add(relImg(u).slice(IMG_DIR.length)); for (const c of Object.values(s.chars)) if (c?.ref) set.add(relImg(c.ref).slice(IMG_DIR.length)); return set; };
  /* 쓰지 않는 파일 정리: ST에서 삭제된 캐릭터의 설정과, 어디에서도 쓰지 않는 원본/기준 사진 파일을 지운다 */
  async function cleanupFiles({ dropOrigs = false } = {}) {
    const s = S(); let staleSettings = 0, removed = 0;
    const live = new Set(chars().map((c) => c.avatar));
    if (live.size) {   // 캐릭터 목록이 비어 있을 때(아직 불러오는 중)는 설정을 건드리지 않아요
      for (const k of Object.keys(s.chars)) if (!live.has(k)) { delete s.chars[k]; staleSettings++; }
      for (const k of Object.keys(s.appearance)) if (!live.has(k)) { delete s.appearance[k]; staleSettings++; }
      for (const k of Object.keys(s.origs)) if (!live.has(k.split('|')[0])) { delete s.origs[k]; staleSettings++; }
    }
    if (dropOrigs) s.origs = {};
    const refd = referencedFiles();
    for (const f of await listOurImages()) if (!refd.has(f) && await deleteImageFile(IMG_DIR + f)) removed++;
    save(); return { removed, staleSettings };
  }
  /* 이 확장의 모든 데이터 삭제: 서버에 보관한 파일 전부 + 이 확장의 설정(API 키, 기록 등). 만든 표정 스프라이트는 그대로예요. */
  async function wipeAll() {
    let removed = 0;
    for (const f of await listOurImages()) if (await deleteImageFile(IMG_DIR + f)) removed++;
    delete ctx().extensionSettings[MODULE]; wiped = true; save();
    return removed;
  }

  /* ================= 스프라이트 폴더 찾기 / 선택 삭제 =================
   * ST는 확장이 폴더를 지우게 허용하지 않아서 '파일'만 지워요. (빈 폴더는 남아요) */
  const spriteFileName = (pth) => { try { return decodeURIComponent(String(pth).split('?')[0].split('/').pop()).replace(/\.[^.]+$/, ''); } catch { return ''; } };
  async function scanSpriteFolders() {
    const s0 = S(), cand = new Map();
    const known = new Set([...Object.keys(s0.chars), ...Object.keys(s0.appearance), ...Object.keys(s0.origs).map((k) => k.split('|')[0])]);
    for (const c of chars()) {
      const f = folderOf(c), e = cand.get(f) || { name: f, owners: [], mine: false, gone: false };
      e.owners.push(c); if (known.has(c.avatar) || s0.folders[f]) e.mine = true; cand.set(f, e);
    }
    for (const f of Object.keys(s0.folders)) { const e = cand.get(f) || { name: f, owners: [], mine: true, gone: true }; e.mine = true; cand.set(f, e); }
    const list = [...cand.values()], out = [];
    for (let i = 0; i < list.length; i += 8) {   // 8개씩 묶어서 요청
      await Promise.all(list.slice(i, i + 8).map(async (e) => {
        let files = [];
        try { const r = await fetch('/api/sprites/get?name=' + encodeURIComponent(e.name), { headers: jsonHeaders() }); files = r.ok ? await r.json() : []; } catch { files = []; }
        files = (Array.isArray(files) ? files : []).map((x) => spriteFileName(x?.path)).filter(Boolean);
        if (files.length) out.push({ ...e, files: [...new Set(files)] });
      }));
    }
    return out.sort((a, b) => (b.mine - a.mine) || a.name.localeCompare(b.name));
  }
  /* 고른 폴더의 스프라이트 파일을 지우고, 이 확장이 만든 '전용 폴더' 덮어쓰기 항목과 보관한 원본도 함께 정리 */
  async function deleteSpriteFolders(sel) {
    let ok = 0, fail = 0;
    for (const e of sel) {
      const owners = chars().filter((c) => folderOf(c) === e.name);
      for (const fn of e.files) {
        try { const r = await fetch('/api/sprites/delete', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ name: e.name, label: fn, spriteName: fn }) }); if (r.ok) ok++; else fail++; } catch { fail++; }
      }
      const ov = ctx().extensionSettings.expressionOverrides;
      if (Array.isArray(ov)) for (let i = ov.length - 1; i >= 0; i--) if (ov[i]?.path === e.name && String(ov[i].path).endsWith('_' + ov[i].name)) ov.splice(i, 1);   // 전용 폴더 버튼이 만든 항목만
      for (const c of owners) for (const k of Object.keys(S().origs)) if (k.startsWith(c.avatar + '|')) { const u = S().origs[k]; delete S().origs[k]; await deleteImageFile(u); }
      delete S().folders[e.name];
    }
    save(); return { ok, fail };
  }
  function renderSpList() {
    const box = root && $('#ee-splist', root); if (!box) return;
    const L = st.spScan;
    if (!L) { box.innerHTML = ''; return; }
    if (!L.length) { box.innerHTML = `<p class="ee-hint">${esc(tl('스프라이트가 들어 있는 폴더를 찾지 못했어요.'))}</p>`; return; }
    box.innerHTML = L.map((e, i) => `<label class="ee-sprow"><input type="checkbox" data-spf="${i}" ${e.sel ? 'checked' : ''}><span><b>${esc(e.name)}</b> · ${esc(tl('{0}장', [e.files.length]))} <small>${esc(e.gone ? tl('ST에 없는 캐릭터') : e.mine ? tl('이 확장으로 만든 것으로 보여요') : tl('그 외 (직접 올린 것일 수 있어요)'))}</small></span></label>`).join('')
      + `<p class="ee-hint" id="ee-spsum"></p><div class="ee-row tight"><button class="ee-btn danger sm" data-act="sp-delete">${esc(tl('선택한 스프라이트 삭제'))}</button></div>`
      + `<p class="ee-hint">${esc(tl('파일을 지운 뒤에도 빈 폴더는 남아요(ST가 확장에게 폴더 삭제를 허용하지 않아요). 빈 폴더만 지우는 명령(Termux):'))}<br><code>find ~/SillyTavern/data/default-user/characters -mindepth 1 -type d -empty -delete</code></p>`;
    updateSpSummary();
  }
  function updateSpSummary() {
    const sel = (st.spScan || []).filter((e) => e.sel), el = root && $('#ee-spsum', root);
    if (el) el.textContent = tl('선택: 폴더 {0}개, 스프라이트 {1}장', [sel.length, sel.reduce((n, e) => n + e.files.length, 0)]);
  }
  async function runSpriteScan() {
    const box = $('#ee-splist', root); if (box) box.innerHTML = `<p class="ee-hint">${esc(tl('찾는 중…'))}</p>`;
    st.spScan = (await scanSpriteFolders()).map((e) => ({ ...e, sel: e.mine })); renderSpList();   // 이 확장으로 만든 것만 기본 선택
  }
  async function runSpriteDelete() {
    if (st.busy) return say('info', tl('생성 중에는 정리할 수 없어요.'));
    const sel = (st.spScan || []).filter((e) => e.sel), total = sel.reduce((n, e) => n + e.files.length, 0);
    if (!sel.length) return say('info', tl('삭제할 폴더를 선택해 주세요.'));
    if (!window.confirm(tl("폴더 {0}개의 스프라이트 {1}장을 삭제해요.\n\n{2}\n\n이 확장으로 만든 전용 폴더 설정과 보관한 원본도 함께 지워요. 되돌릴 수 없어요. 계속할까요?", [sel.length, total, sel.map((e) => '- ' + e.name).join('\n')]))) return;
    const box = $('#ee-splist', root); if (box) box.innerHTML = `<p class="ee-hint">${esc(tl('삭제하는 중…'))}</p>`;
    try {
      const r = await deleteSpriteFolders(sel);
      say(r.fail ? 'warning' : 'success', tl('스프라이트 {0}장을 삭제했어요. 빈 폴더는 남아요.', [r.ok]) + (r.fail ? ' ' + tl('삭제하지 못한 파일 {0}개', [r.fail]) : ''));
      await runSpriteScan();
    } catch (e) { say('error', tl("정리하지 못했어요: ") + (e.message || e)); await runSpriteScan(); }
  }

  /* ================= 호출 기록 (어디서 몇 번 나가는지) ================= */
  const estTok = (s) => { s = String(s || ''); let h = 0; for (const c of s) if (c >= '가' && c <= '힣') h++; return Math.ceil(h * 1.2 + (s.length - h) / 4); };
  function logUsage(kind, label, status, tok = null) {
    const s = S(), u = (s.usage ||= { text: 0, image: 0, r429: 0, tin: 0, tout: 0, iin: 0, iout: 0 });
    if (status === 'ok') u[kind] = (u[kind] || 0) + 1;
    if (status === '429') u.r429 = (u.r429 || 0) + 1;
    if (tok && status === 'ok') {
      if (kind === 'text') { u.tin = (u.tin || 0) + (tok.in || 0); u.tout = (u.tout || 0) + (tok.out || 0); }
      else { u.iin = (u.iin || 0) + (tok.in || 0); u.iout = (u.iout || 0) + (tok.out || 0); }
    }
    s.usageLog.unshift({ t: Date.now(), kind, label, status, tok });
    if (s.usageLog.length > 100) s.usageLog.length = 100;
    save();
    if (root && st.tab === 'log' && !root.classList.contains('ee-off')) renderLogTab();
  }

  /* ================= 작은 진행 알림 (표정 추출기 창을 닫아도 보여요) ================= */
  const ui = {
    el: null, dragged: false, last: null,
    mount() {
      if (this.el) return this.el;
      const e = document.createElement('div'); e.id = 'ee-status'; e.setAttribute('role', 'status');
      e.innerHTML = `<i class="ee-spin"></i><span class="ee-st-t" title="${tl("끌어서 옮기기 · 누르면 표정 추출기 창을 열어요")}"></span><button type="button">${tl("취소")}</button>`;
      e.addEventListener('click', (ev) => { if (ev.target.closest('button')) return cancelGen(); if (!this.dragged) openModal(); });
      e.addEventListener('pointerdown', (ev) => this.startDrag(ev));
      window.addEventListener('resize', () => this.place());
      document.body.appendChild(e); this.el = e; return e;
    },
    /* 저장된 위치(없으면 기본 위치: 위쪽 가운데)로 옮기고, 화면 밖으로 나가지 않게 맞춘다 */
    place(x, y) {
      const e = this.el, pos = x === undefined ? S().pillPos : { x, y };
      if (!e || !pos) return;
      const r = e.getBoundingClientRect(), nx = clamp(pos.x, 0, Math.max(0, window.innerWidth - r.width)), ny = clamp(pos.y, 0, Math.max(0, window.innerHeight - r.height));
      this.last = { x: Math.round(nx), y: Math.round(ny) };   // 마지막으로 놓은 좌표 (저장에 써요)
      Object.assign(e.style, { left: nx + 'px', top: ny + 'px', transform: 'none' });
    },
    startDrag(ev) {
      if (ev.target.closest('button') || (ev.button !== undefined && ev.button > 0)) return;
      const e = this.el, r = e.getBoundingClientRect(), sx = ev.clientX, sy = ev.clientY; let moved = false;
      e.setPointerCapture?.(ev.pointerId);
      const mv = (m) => { const dx = m.clientX - sx, dy = m.clientY - sy; if (!moved && Math.hypot(dx, dy) < 5) return; moved = true; this.place(r.left + dx, r.top + dy); };
      const up = () => {
        e.removeEventListener('pointermove', mv); e.removeEventListener('pointerup', up); e.removeEventListener('pointercancel', up);
        if (moved && this.last) { S().pillPos = { ...this.last }; save(); this.dragged = true; setTimeout(() => { this.dragged = false; }, 60); }   // 끌고 난 뒤의 클릭은 창 열기로 보지 않아요
      };
      e.addEventListener('pointermove', mv); e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up);
    },
    status(msg, cancel = false) {
      const e = this.mount();
      $('.ee-st-t', e).textContent = msg || '';
      e.classList.toggle('on', !!msg);
      $('button', e).style.display = cancel ? '' : 'none';
      if (msg) this.place();
    },
  };
  function genStatus(msg) { st.msg = msg || ''; ui.status(st.msg, !!st.msg); }
  /* 취소: 진행 중인 요청을 바로 끊고 남은 표정은 만들지 않아요 */
  function cancelGen() {
    if (!st.busy || st.stop) return;
    st.stop = true; st.abort?.abort();
    ui.status(tl("취소하는 중…"), false); setProg(tl("취소하는 중…"));
  }

  /* ================= 이미지 유틸 ================= */
  const b64ToBlob = (b64, mime) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); };
  const loadImg = (obj) => new Promise((ok, no) => { const i = new Image(); const t = setTimeout(() => no(new Error('timeout')), 10000); i.onload = () => { clearTimeout(t); ok(i); }; i.onerror = (e) => { clearTimeout(t); no(e); }; i.src = obj; });
  const canvasBlob = (cv) => new Promise((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error(tl("PNG 변환 실패")))), 'image/png'));
  async function toPngBlob(blob) {   // 원본이 jpg/webp여도 PNG로 통일
    if (blob.type === 'image/png') return blob;
    const obj = URL.createObjectURL(blob);
    try { const img = await loadImg(obj), cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; cv.getContext('2d').drawImage(img, 0, 0); return await canvasBlob(cv); }
    finally { URL.revokeObjectURL(obj); }
  }
  /* URL/Blob → 픽셀 데이터 (긴 변이 max를 넘으면 줄임) */
  async function pixelsOf(src, max) {
    let blob = src;
    if (typeof src === 'string') { const r = await fetch(src); if (!r.ok) throw new Error(tl("이미지를 불러오지 못했어요 (") + r.status + ')'); blob = await r.blob(); }
    const obj = URL.createObjectURL(blob);
    try {
      const img = await loadImg(obj);
      const k = Math.min(1, max / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
      return { w, h, data: g.getImageData(0, 0, w, h) };
    } finally { URL.revokeObjectURL(obj); }
  }

  /* 아바타/스프라이트를 줄여서 참조 이미지로 (투명 PNG는 흰 배경으로 합성) */
  const refCache = {};
  async function refInline(url, max = 768) {
    if (!url) return null;
    if (refCache[url]) return refCache[url];
    let out = null;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      const obj = URL.createObjectURL(await r.blob());
      try {
        const img = await loadImg(obj);
        const k = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
        const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
        out = { inlineData: { mimeType: 'image/jpeg', data: cv.toDataURL('image/jpeg', 0.88).split(',')[1] } };
      } finally { URL.revokeObjectURL(obj); }
    } catch { out = null; }
    if (out) refCache[url] = out;
    return out;
  }

  /* ---------- 배경 제거: 가장자리에서부터 배경색과 비슷한 픽셀만 투명하게 ---------- */
  function cutoutPixels(d, w, h, tol = 34) {
    const idx = (x, y) => (y * w + x) * 4, med = (arr) => arr.sort((a, b) => a - b)[arr.length >> 1];
    const rs = [], gs = [], bs = [];
    const pushPx = (x, y) => { const i = idx(x, y); rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]); };
    for (let x = 0; x < w; x += 2) { pushPx(x, 0); pushPx(x, h - 1); }
    for (let y = 0; y < h; y += 2) { pushPx(0, y); pushPx(w - 1, y); }
    const bg = [med(rs), med(gs), med(bs)];
    const dist = (i) => { const a = d[i] - bg[0], b = d[i + 1] - bg[1], c = d[i + 2] - bg[2]; return Math.sqrt(a * a + b * b + c * c); };
    const mark = new Uint8Array(w * h), stack = [];
    const tryPush = (x, y) => { const p = y * w + x; if (!mark[p] && dist(p * 4) < tol) { mark[p] = 1; stack.push(p); } };
    for (let x = 0; x < w; x++) { tryPush(x, 0); tryPush(x, h - 1); }
    for (let y = 0; y < h; y++) { tryPush(0, y); tryPush(w - 1, y); }
    while (stack.length) {
      const p = stack.pop(), x = p % w, y = (p / w) | 0;
      if (x > 0) tryPush(x - 1, y); if (x < w - 1) tryPush(x + 1, y); if (y > 0) tryPush(x, y - 1); if (y < h - 1) tryPush(x, y + 1);
    }
    let cnt = 0; for (let p = 0; p < mark.length; p++) if (mark[p]) cnt++;
    const ratio = cnt / (w * h);
    if (ratio < 0.08 || ratio > 0.88) return { ok: false, ratio };   // 배경이 균일하지 않거나 인물까지 지워질 위험
    for (let p = 0; p < mark.length; p++) {
      const i = p * 4;
      if (mark[p]) { d[i + 3] = 0; continue; }
      const x = p % w, y = (p / w) | 0; let near = 0;      // 배경과 맞닿은 1~2픽셀은 부드럽게
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && mark[yy * w + xx]) { near = Math.max(Math.abs(dx), Math.abs(dy)); break; } }
      if (near) { const k = clamp((dist(i) - tol * 0.5) / (tol * 1.2), 0, 1); d[i + 3] = Math.round(255 * (near === 1 ? Math.min(k, 0.75) : k)); }
    }
    return { ok: true, ratio, bg };
  }
  /* 내부 빈 공간 지우기(선택): 팔과 몸 사이처럼 테두리와 이어지지 않은 '배경색 덩어리'를 지운다.
   * 가장자리에서부터 지우는 기본 방식으로는 못 지우는 부분이에요. 배경과 같은 색의 큰 면(흰 옷 등)도 지워질 수 있어서 기본은 꺼져 있어요. */
  function cutHoles(d, w, h, bg, tol, minFrac = 0.001) {
    const n = w * h, seen = new Uint8Array(n), minArea = Math.max(4, Math.round(n * minFrac)), t2 = tol * tol;
    const isBg = (p) => { const i = p * 4; if (d[i + 3] === 0) return false; const a = d[i] - bg[0], b = d[i + 1] - bg[1], c = d[i + 2] - bg[2]; return a * a + b * b + c * c < t2; };
    let removed = 0;
    for (let p0 = 0; p0 < n; p0++) {
      if (seen[p0] || !isBg(p0)) continue;
      const comp = [p0]; seen[p0] = 1;
      for (let qi = 0; qi < comp.length; qi++) {
        const p = comp[qi], x = p % w, y = (p / w) | 0;
        if (x > 0 && !seen[p - 1] && isBg(p - 1)) { seen[p - 1] = 1; comp.push(p - 1); }
        if (x < w - 1 && !seen[p + 1] && isBg(p + 1)) { seen[p + 1] = 1; comp.push(p + 1); }
        if (y > 0 && !seen[p - w] && isBg(p - w)) { seen[p - w] = 1; comp.push(p - w); }
        if (y < h - 1 && !seen[p + w] && isBg(p + w)) { seen[p + w] = 1; comp.push(p + w); }
      }
      if (comp.length >= minArea) { for (const p of comp) d[p * 4 + 3] = 0; removed += comp.length; }   // 아주 작은 덩어리(눈 하이라이트 등)는 남겨요
    }
    return removed;
  }
  /* 이미 투명한 이미지인지 (테두리 픽셀 대부분이 투명하면 true) */
  function borderTransparent(d, w, h) {
    let n = 0, t = 0;
    const px = (x, y) => { n++; if (d[(y * w + x) * 4 + 3] < 128) t++; };
    for (let x = 0; x < w; x += 2) { px(x, 0); px(x, h - 1); }
    for (let y = 0; y < h; y += 2) { px(0, y); px(w - 1, y); }
    return n > 0 && t / n > 0.5;
  }
  /* ---------- 가장자리 조절 (알파 채널만 다뤄요; 이미지 테두리에 닿은 부분은 건드리지 않아요) ---------- */
  /* 흰 테두리 제거: 투명 영역에 맞닿은 최대 3픽셀 중 '거의 흰색'인 픽셀을 투명하게 */
  function peelFringe(d, A, w, h, thr, depth = 3) {
    for (let pass = 0; pass < depth; pass++) {
      const kill = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = y * w + x; if (!A[p]) continue;
        if ((x > 0 && !A[p - 1]) || (x < w - 1 && !A[p + 1]) || (y > 0 && !A[p - w]) || (y < h - 1 && !A[p + w])) {
          const i = p * 4, a = 255 - d[i], b = 255 - d[i + 1], c = 255 - d[i + 2];
          if (Math.sqrt(a * a + b * b + c * c) < thr) kill.push(p);
        }
      }
      if (!kill.length) break;
      for (const p of kill) A[p] = 0;
    }
  }
  /* 가장자리 줄이기: n픽셀 안쪽으로 깎기 */
  function erodeAlpha(A, w, h, n) {
    for (let p = 0; p < A.length; p++) if (A[p] < 64) A[p] = 0;
    for (let pass = 0; pass < n; pass++) {
      const src = A.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const p = y * w + x; if (!src[p]) continue;
        if ((x > 0 && !src[p - 1]) || (x < w - 1 && !src[p + 1]) || (y > 0 && !src[p - w]) || (y < h - 1 && !src[p + w])) A[p] = 0;
      }
    }
  }
  /* 가장자리 부드럽게: 알파를 r픽셀 흐리게 (바깥으로 번지지는 않아요) */
  function softAlpha(A, w, h, r) {
    const n = w * h, T = new Float32Array(n), B = new Float32Array(n), k = 2 * r + 1;
    for (let y = 0; y < h; y++) {
      const row = y * w; let sum = 0;
      for (let x = -r; x <= r; x++) sum += A[row + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) { T[row + x] = sum / k; sum += A[row + Math.min(w - 1, x + r + 1)] - A[row + Math.max(0, x - r)]; }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += T[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) { B[y * w + x] = sum / k; sum += T[Math.min(h - 1, y + r + 1) * w + x] - T[Math.max(0, y - r) * w + x]; }
    }
    for (let p = 0; p < n; p++) A[p] = Math.min(A[p], Math.round(B[p]));
  }
  /* 배경 제거 → 흰 테두리 제거 → 줄이기 → 부드럽게. o = { removeBg, tol, fringe(0~100), shrink(px), soft(px) } */
  function processPixels(d, w, h, o) {
    const info = { bgFailed: false, ratio: null, wasTransparent: false, holes: 0 };
    if (borderTransparent(d, w, h)) info.wasTransparent = true;
    else if (o.removeBg) {
      const r = cutoutPixels(d, w, h, o.tol);
      info.ratio = r.ratio;
      if (!r.ok) { info.bgFailed = true; return info; }
      if (o.holes > 0 && r.bg) info.holes = cutHoles(d, w, h, r.bg, o.holes);
    }
    const A = new Uint8Array(w * h);
    for (let p = 0; p < A.length; p++) A[p] = d[p * 4 + 3];
    if (o.fringe > 0) peelFringe(d, A, w, h, o.fringe * 1.5);
    if (o.shrink > 0) erodeAlpha(A, w, h, o.shrink);
    if (o.soft > 0) softAlpha(A, w, h, o.soft);
    for (let p = 0; p < A.length; p++) d[p * 4 + 3] = A[p];
    return info;
  }
  const edgeOpts = (s = S()) => ({ removeBg: !!s.cutout, tol: s.cutTol, fringe: s.edgeFringe, shrink: s.edgeShrink, soft: s.edgeSoft, holes: s.holeTol });
  /* 생성 직후 처리: 배경 제거가 켜져 있고 성공하면 처리본, 아니면 원본(PNG) */
  async function finalizeSprite(blob) {
    const s = S();
    if (!s.cutout) return toPngBlob(blob);
    const { w, h, data } = await pixelsOf(blob, 1600);
    const info = processPixels(data.data, w, h, edgeOpts(s));
    if (info.bgFailed) { say('info', tl("배경 제거를 건너뛰었어요 (배경이 균일하지 않아요, 인식 {0}%). 원본으로 저장했어요.",[(info.ratio * 100).toFixed(0)])); return toPngBlob(blob); }
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').putImageData(data, 0, 0);
    return canvasBlob(cv);
  }

  /* ================= Gemini 이미지 호출 ================= */
  /* Agent Platform(구 Vertex AI) API 키 전용(express) 방식. 프로젝트 ID·리전은 쓰지 않아요. */
  function apiUrl(action, model) {
    const m = encodeURIComponent((model || S().geminiModel).trim());
    return `https://aiplatform.googleapis.com/v1/publishers/google/models/${m}:${action}`;
  }
  const abortErr = () => Object.assign(new Error(tl("취소됨")), { name: 'AbortError' });
  const sleepAbortable = (ms, signal) => new Promise((ok, no) => {
    if (signal?.aborted) return no(abortErr());
    const onAbort = () => { clearTimeout(t); no(abortErr()); };
    const t = setTimeout(() => { signal?.removeEventListener('abort', onAbort); ok(); }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
  /* 이미지 요청은 한 번에 하나씩, 간격을 두고 보낸다. 429/503이면 기다렸다가 다시 시도한다. 취소하면 바로 멈춘다. */
  let imgChain = Promise.resolve(), imgLast = 0, ctxTok = null;
  function imgQueue(label, fn, signal) {
    const run = async () => {
      try {
        const gap = Math.max(0, (+S().imgGapSec || 0) * 1000), waitMs = imgLast + gap - Date.now();
        if (waitMs > 0) await sleepAbortable(waitMs, signal);
        if (signal?.aborted) throw abortErr();
        const delays = [20, 45, 90];
        for (let a = 0; a <= delays.length; a++) {
          try { ctxTok = null; const r = await fn(); imgLast = Date.now(); logUsage('image', label, 'ok', ctxTok); return r; }
          catch (e) {
            imgLast = Date.now();
            if (e?.name === 'AbortError') throw e;
            if ((e.status === 429 || e.status === 503) && a < delays.length) {
              logUsage('image', label, '429');
              const d = Math.max(e.retryAfter || 0, delays[a]);
              for (let sec = d; sec > 0; sec--) { ui.status(tl("요청이 몰려 {0}초 뒤 다시 시도해요 ({1})",[sec,label]), true); await sleepAbortable(1000, signal); }
              ui.status(st.msg, !!st.msg);
              continue;
            }
            logUsage('image', label, 'fail'); throw e;
          }
        }
      } catch (e) { if (e?.name === 'AbortError') logUsage('image', label, 'cancel'); throw e; }
    };
    const p = imgChain.then(run, run); imgChain = p.catch(() => {}); return p;
  }
  async function geminiImage(prompt, refs = [], aspect = '3:4', label = tl("표정"), signal = null) {
    const s = S();
    if (!s.geminiKey.trim()) throw new Error(tl("API 키를 입력해 주세요 (확장 프로그램 → 표정 추출기)"));
    const parts = [...refs.filter(Boolean), { text: prompt }];
    const endpoint = apiUrl('generateContent');
    const call = async (withCfg) => {
      const body = { contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } };
      if (withCfg) body.generationConfig.imageConfig = { aspectRatio: aspect };
      const r = await fetch(endpoint, { method: 'POST', signal: signal || undefined, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.geminiKey.trim() }, body: JSON.stringify(body) });
      return { r, j: await r.json().catch(() => ({})) };
    };
    return imgQueue(label, async () => {
      let { r, j } = await call(true);
      if (r.status === 400 && /imageConfig|aspect/i.test(JSON.stringify(j))) ({ r, j } = await call(false));
      if (!r.ok) {
        const e = new Error(`Agent Platform ${r.status}: ${j?.error?.message || tl("요청 실패")}`);
        e.status = r.status;
        const ra = Number(r.headers?.get?.('retry-after')) || parseFloat(String(j?.error?.details?.find((d) => d.retryDelay)?.retryDelay || '').replace('s', ''));
        if (ra) e.retryAfter = Math.min(120, ra);
        throw e;
      }
      const um = j.usageMetadata || {};   // Google이 알려 주는 실제 토큰 (기록 탭에 표시)
      ctxTok = { in: um.promptTokenCount || 0, out: um.candidatesTokenCount || um.totalTokenCount || 0 };
      const cand = j.candidates?.[0];
      const img = cand?.content?.parts?.map((p) => p.inlineData || p.inline_data).find(Boolean);
      if (!img?.data) {
        if (j.promptFeedback?.blockReason) throw new Error(tl("요청이 차단됐어요 ({0})",[j.promptFeedback.blockReason]));
        throw new Error(cand?.finishReason ? tl("이미지가 생성되지 않았어요 ({0}). 안전 필터에 걸렸을 수 있어요.",[cand.finishReason]) : tl("응답에 이미지가 없어요"));
      }
      return { b64: img.data, mime: img.mimeType || img.mime_type || 'image/png' };
    }, signal);
  }
  async function testConnection() {
    const s = S();
    if (!s.geminiKey.trim()) { say('warning', tl("API 키를 먼저 입력해 주세요.")); return; }
    try {
      const r = await fetch(apiUrl('countTokens'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.geminiKey.trim() }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) say('success', tl("연결 성공: {0}",[s.geminiModel])); else say('error', `${r.status}: ${j?.error?.message || tl("실패")}`);
    } catch (e) { say('error', tl("요청 실패 (네트워크/CORS): ") + (e.message || e)); }
  }

  /* ================= 텍스트 모델 + 외형 추출 (장면 생성기 방식) ================= */
  let profWarned = false;
  const profileList = () => { const cm = ctx().extensionSettings?.connectionManager; return Array.isArray(cm?.profiles) ? cm.profiles : []; };
  /* 연결 프로필을 골랐으면 그 프로필로(채팅 내용 없이), 아니면 채팅에 연결된 모델로 */
  async function llmRaw(prompt) {
    const s = S();
    const prof = s.llmProfile ? profileList().find((p) => p.id === s.llmProfile) : null;
    const svc = ctx().ConnectionManagerRequestService;
    let out = '';
    if (prof && svc?.sendRequest) {
      try {
        const r = await svc.sendRequest(prof.id, [{ role: 'user', content: prompt }], 4096, { stream: false, extractData: true }, {});
        out = typeof r === 'string' ? r : (r?.content ?? '');
        if (!String(out).trim()) throw new Error(tl("프로필 응답이 비어 있어요"));
      } catch (e) {
        console.warn('[EE] 연결 프로필 호출 실패', e);
        if (!profWarned) { profWarned = true; say('warning', tl("연결 프로필 \"{0}\" 호출에 실패해서 채팅 모델로 대신 실행해요: {1}",[prof.name,e.message || e])); }
        out = '';
      }
    } else if (s.llmProfile && !profWarned) { profWarned = true; say('warning', tl("선택한 연결 프로필을 찾지 못해 채팅 모델로 실행해요. (Connection Manager 확장이 켜져 있는지 확인해 주세요)")); }
    if (!String(out).trim()) out = await ctx().generateQuietPrompt(prompt, false, false);
    if (typeof out !== 'string' || !out.trim()) throw new Error(tl("모델 응답이 비어 있어요"));
    return out;
  }
  async function llm(prompt, label = tl("텍스트")) {
    try { const out = await llmRaw(prompt); logUsage('text', label, 'ok', { in: estTok(prompt), out: estTok(out), est: true }); return out; }
    catch (e) { logUsage('text', label, 'fail'); throw e; }
  }
  const descOf = (ch) => [ch.description, ch.personality].filter(Boolean).join('\n');
  /* 카드 설명 → 영어 외형 태그 한 줄. 직접 고친 것(manual)은 그대로, 설명이 안 바뀌었으면(해시) 저장된 것을 써요 */
  async function appearanceOf(ch) {
    const s = S(), key = ch.avatar, a = s.appearance[key], text = descOf(ch);
    if (a?.manual) return a.t;
    if (!text?.trim()) return a?.t || '';
    const h = hash(text);
    if (a && a.h === h) return a.t;
    const prevMsg = st.msg; ui.status(tl("외형 태그를 뽑는 중…"), st.busy);
    let out;
    try { out = (await llm(`Do NOT roleplay. From the description below, write ONE line of comma-separated English visual tags describing only the physical appearance and outfit (age impression, hair, eyes, skin, build, clothing, armor, accessories). No names, no personality, under 45 words. Output only that line.

${text.slice(0, 3000)}`, tl("외형 추출 · ") + ch.name)).trim().replace(/\s*\n+\s*/g, ' ').slice(0, 450); }
    finally { ui.status(prevMsg || '', st.busy && !!prevMsg); }
    s.appearance[key] = { h, t: out };
    save(); renderLook();
    return out;
  }
  async function ensureLook(ch) {
    try { const v = await appearanceOf(ch); if (v) return v; } catch (e) { console.warn('[EE] 외형 추출 실패', e); say('warning', tl("외형 추출에 실패해서 카드 설명을 그대로 써요: ") + (e.message || e)); }
    return descOf(ch).replace(/\s+/g, ' ').slice(0, 300);   // 저장하지 않는 임시 대체
  }

  /* ================= 화풍 프리셋 (장면 생성기 방식) ================= */
  const presetText = (id) => (id === 'custom' ? (S().customText || '') : (S().stylePresets.find((x) => x.id === id)?.text ?? null));
  function normalizeStyle() {
    const s = S();
    if (presetText(s.stylePreset) === null) s.stylePreset = 'custom';
    if (s.stylePreset === 'custom' && !s.customText && s.styleText) s.customText = s.styleText;
  }
  function renderStyle() {
    const sel = $('#ee-style-sel', root); if (!sel) return;
    normalizeStyle();
    const s = S();
    sel.innerHTML = `<option value="custom">${tl("직접 입력")}</option>` + s.stylePresets.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
    sel.value = presetText(s.stylePreset) !== null ? s.stylePreset : 'custom';
    const cur = s.stylePresets.find((x) => x.id === sel.value);
    $('#ee-style-name', root).value = cur ? cur.name : '';
    $('#ee-style-text', root).value = s.styleText || '';
    $('#ee-neg', root).value = s.negative || '';
    $('#ee-stylecur', root).textContent = `(${cur ? cur.name : tl("직접 입력")})`;
  }

  /* ================= 표정 생성 ================= */
  /* 표정 생성의 기준 사진: 직접 고른 사진이 있으면 그것, 없으면 카드 PNG */
  const refUrlOf = (ch) => cd(ch).ref || ('/characters/' + encodeURIComponent(ch.avatar));
  async function refsFor(ch, emo) {
    const refs = [], notes = [];
    const neutral = st.sprites.find((x) => x.label === 'neutral');
    if (neutral && emo !== 'neutral') {
      const r = await refInline(spriteUrl(neutral), 1024);
      if (r) { refs.push(r); notes.push(`Reference image ${refs.length} is the established look of "${ch.name}". Keep EXACTLY the same face, hair color and style, eye color, skin tone, body proportions, outfit and art style.`); }
    }
    if (ch.avatar || cd(ch).ref) {
      const r = await refInline(refUrlOf(ch), 1024);
      if (r) { refs.push(r); notes.push(`Reference image ${refs.length} is the base reference image of "${ch.name}". Match face, hair and eyes.`); }
    }
    return { refs, notes };
  }
  async function makeSprite(ch, emo) {
    const s = S(), d = cd(ch), look = await ensureLook(ch), { refs, notes } = await refsFor(ch, emo);
    const outfit = d.outfit?.trim() || "the character's signature default outfit (as in the reference)";
    const neg = String(s.negative || '').trim().replace(/\s*\n+\s*/g, ', ');
    const prompt = `${notes.join(' ')}
Generate one image: a visual novel character sprite, waist-up portrait of "${ch.name}" (${look || 'as in the reference'}). Outfit: ${outfit}. Expression and pose: ${EMO_DESC[emo] || emo}. Natural, expressive, candid body language and a slight three-quarter angle, NOT a stiff straight-on attention stance. ${String(s.styleText || '').trim() ? `Rendering style: ${String(s.styleText).trim()}. ` : ''}Match EXACTLY the rendering style, level of realism, lighting and color grading of the reference image (if the reference is photorealistic, make this photorealistic too, NOT anime or illustration). Background: plain flat solid pure white, no floor, no shadow, no gradient, no props behind. Single character, no text, no UI, no watermark. Do not add any bag, strap, prop, accessory or clothing item that is not visible in the reference image or written in the appearance tags or the outfit.${neg ? `
Avoid: ${neg}.` : ''}`;
    const { b64, mime } = await geminiImage(prompt, refs, '3:4', `${ch.name}·${emo}`, st.abort?.signal);
    if (s.keepOrig && s.cutout) await saveOrig(ch, emo, b64, mime);
    else await dropOrig(ch, emo);   // 원본을 안 보관하면, 예전 원본(다른 이미지)이 남지 않게 지워요
    const blob = await finalizeSprite(b64ToBlob(b64, mime));
    await uploadSprite(ch, emo, blob);   // ST 스프라이트 폴더에 바로 저장 (같은 감정은 덮어씀)
  }

  /* ================= UI: 창 ================= */
  let root = null;
  const selected = (ch) => { const d = cd(ch); if (!Array.isArray(d.emos)) d.emos = [...(S().emosDefault || SET6)]; return d.emos; };
  const todoList = (ch) => {
    const sel = selected(ch), over = S().overwrite;
    const list = ALL.filter((e) => sel.includes(e) && (over || !hasSprite(e)));
    if (list.length && !hasSprite('neutral') && !list.includes('neutral')) list.unshift('neutral');   // neutral을 먼저 만들어 기준으로 삼는다
    return list;
  };
  function setProg(t) { st.prog = t || ''; const el = root && $('#ee-prog', root); if (el) el.textContent = st.prog; }

  /* 위치·크기: 끌어서 옮기고, 오른쪽 아래 모서리를 끌어서 조절. 값은 저장돼요. */
  function winApply() {
    if (!root) return;
    const w0 = S().win || {}, vw = window.innerWidth, vh = window.innerHeight;
    const W = clamp(w0.w || Math.min(980, vw - 16), Math.min(320, vw), vw), H = clamp(w0.h || Math.min(780, vh - 16), Math.min(260, vh), vh);
    const X = clamp(w0.x ?? Math.round((vw - W) / 2), 0, Math.max(0, vw - W)), Y = clamp(w0.y ?? Math.round((vh - H) / 2), 0, Math.max(0, vh - H));
    Object.assign(root.style, { left: X + 'px', top: Y + 'px', width: W + 'px', height: H + 'px' });
  }
  function winSave() { const r = root.getBoundingClientRect(); S().win = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; save(); }
  function bindWindow() {
    const bar = $('.ee-bar', root), grip = $('.ee-grip', root);
    const track = (el, onMove) => el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || (e.button !== undefined && e.button > 0)) return;
      e.preventDefault(); el.setPointerCapture?.(e.pointerId);
      const sx = e.clientX, sy = e.clientY, r = root.getBoundingClientRect();
      const mv = (ev) => onMove(ev.clientX - sx, ev.clientY - sy, r);
      const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); winSave(); };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
    track(bar, (dx, dy, r) => {
      const vw = window.innerWidth, vh = window.innerHeight;
      root.style.left = clamp(r.left + dx, 60 - r.width, vw - 60) + 'px';   // 제목줄이 화면 안에 남도록
      root.style.top = clamp(r.top + dy, 0, vh - 40) + 'px';
    });
    track(grip, (dx, dy, r) => {
      const vw = window.innerWidth, vh = window.innerHeight;
      root.style.width = clamp(r.width + dx, Math.min(320, vw), vw - r.left) + 'px';
      root.style.height = clamp(r.height + dy, Math.min(260, vh), vh - r.top) + 'px';
    });
    window.addEventListener('resize', () => { if (root && !root.classList.contains('ee-off')) winApply(); });
  }
  function buildModal() {
    if (root) return;
    root = document.createElement('div'); root.id = 'ee-modal'; root.className = 'ee-off';
    root.innerHTML = `<div class="ee-bar" title="${tl("끌어서 옮기기")}"><b>${tl("🎭 표정 추출기")}</b><span class="ee-grow"></span><button class="ee-btn sm" data-act="close" aria-label="${tl("닫기")}">✕</button></div>
      <div class="ee-tabs"><button class="ee-tab on" data-act="tab" data-tab="main">${tl("표정")}</button><button class="ee-tab" data-act="tab" data-tab="set">${tl("설정")}</button><button class="ee-tab" data-act="tab" data-tab="log">${tl("기록")}</button></div>
      <div id="ee-body" class="ee-bodywrap"></div><div id="ee-edge" class="ee-edge ee-off"></div><div id="ee-zoom" class="ee-zoomlayer ee-off" data-act="zoom-close"></div><div class="ee-grip" title="${tl("끌어서 크기 조절")}"></div>`;
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('input', onInput);
    bindWindow();
  }
  /* ST에서 선택된 캐릭터가 바뀌었으면 창도 그 캐릭터로 맞춘다. (직접 고른 캐릭터는 ST가 안 바뀌었으면 유지, 생성 중에는 그대로) */
  function syncToChatChar() {
    const cur = defaultAvatar();
    let changed = false;
    if (!st.avatar || !curChar()) { st.avatar = cur; changed = true; }
    else if (!st.busy && cur && cur !== st.ctxAvatar) { changed = st.avatar !== cur; st.avatar = cur; }
    if (!st.busy) st.ctxAvatar = cur;
    if (changed) st.prog = '';   // 이전 캐릭터의 진행 문구를 지운다
    return changed;
  }
  function onChatChanged() { if (root && !root.classList.contains('ee-off') && !st.busy && syncToChatChar()) renderBody(); }
  async function openModal() {
    if (!S().enabled) { say('info', tl("표정 추출기가 꺼져 있어요. 확장 설정에서 \"사용\"을 켜 주세요.")); return; }
    buildModal();
    const wasOpen = !root.classList.contains('ee-off'), changed = syncToChatChar();
    if (wasOpen && !changed) return;   // 이미 열려 있어요
    if (!wasOpen) { winApply(); root.classList.remove('ee-off'); }
    await renderBody();
  }
  const closeModal = () => { closeEdge(); closeZoom(); document.querySelectorAll('.ee-zoom').forEach((o) => o.remove()); root?.classList.add('ee-off'); };

  async function renderBody() {
    root.querySelectorAll('.ee-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === st.tab));
    if (st.tab === 'set') return renderSetTab();
    if (st.tab === 'log') return renderLogTab();
    return renderMain();
  }
  /* 이름이 같은 캐릭터가 있을 때의 안내 + 폴더 분리/되돌리기 버튼 */
  function folderExtra(ch) {
    const n = sharers(ch), ov = overrideOf(ch);
    if (ov?.path === ownFolder(ch)) return `<div class="ee-row tight"><span class="ee-hint">${tl("이 캐릭터 전용 폴더를 쓰고 있어요. (ST 표정 확장의 \"폴더 덮어쓰기\"로 등록돼 있어요)")}</span><button class="ee-btn sm" data-act="folder-join" title="${tl("전용 폴더 설정을 해제하고 캐릭터 이름 폴더를 다시 써요")}">${tl("공유 폴더로 되돌리기")}</button></div>`;
    if (n > 1 && !ov) { const tip = tl("characters/{0}/ 폴더를 따로 쓰도록 설정해요",[ownFolder(ch)]); return `<div class="ee-row tight"><span class="ee-warn">${tl("⚠ 이름이 같은 캐릭터 {0}명과 표정 폴더({1})를 같이 써요. 서로의 표정이 섞여 보여요.",[n - 1,esc(folderOf(ch))])}</span><button class="ee-btn sm" data-act="folder-split" title="${esc(tip)}">${tl("이 캐릭터 전용 폴더로 분리")}</button></div>`; }
    return '';
  }
  async function splitFolder(ch) {
    const s0 = ctx().extensionSettings, base = avatarBase(ch);
    if (!Array.isArray(s0.expressionOverrides)) s0.expressionOverrides = [];   // ST 표정 확장이 배열로 읽어요
    const hit = s0.expressionOverrides.find((e) => e?.name === base);
    if (hit) hit.path = ownFolder(ch); else s0.expressionOverrides.push({ name: base, path: ownFolder(ch) });
    save(); await renderBody();
    say('success', tl("이 캐릭터는 이제 characters/{0}/ 폴더를 써요. ST 표정 확장도 채팅에서 이 폴더를 읽어요. (기존 공유 폴더의 표정은 그대로 남아 있어요)",[ownFolder(ch)]));
  }
  async function joinFolder(ch) {
    const s0 = ctx().extensionSettings, base = avatarBase(ch), ov = s0.expressionOverrides;
    if (Array.isArray(ov)) { const i = ov.findIndex((e) => e?.name === base); if (i >= 0) ov.splice(i, 1); }
    save(); await renderBody();
    say('info', tl("전용 폴더 설정을 해제했어요. 다시 characters/{0}/ 폴더를 써요. (전용 폴더의 표정 파일은 그대로 남아 있어요)",[ch.name]));
  }
  /* 이름이 같은 캐릭터인데 공유 폴더에 이미 표정이 있으면, 만들기 전에 분리할지 물어본다 */
  async function maybeSplitFolder(ch) {
    if (sharers(ch) < 2 || overrideOf(ch) || !st.sprites.length) return;
    if (window.confirm(tl("이름이 같은 캐릭터 {0}명과 표정 폴더({1})를 같이 써서 이미 있는 표정 {2}장과 섞여요.\n이 캐릭터 전용 폴더({3})를 만들어 저장할까요?\n\n[확인] 전용 폴더에 저장   [취소] 지금 폴더에 그대로 저장",[sharers(ch) - 1,folderOf(ch),st.sprites.length,ownFolder(ch)]))) await splitFolder(ch);
  }
  async function renderMain() {
    const body = $('#ee-body', root), ch = curChar();
    if (!ch) { body.innerHTML = `<p class="ee-hint">${tl("캐릭터가 없어요. SillyTavern에서 캐릭터를 먼저 만들어 주세요.")}</p>`; return; }
    await loadSprites(ch);
    const d = cd(ch), s = S();
    body.innerHTML = `
      <div class="ee-row"><label>${tl("캐릭터")}</label>
        <select id="ee-char" ${st.busy ? 'disabled' : ''}>${chars().map((c) => `<option value="${esc(c.avatar)}" ${c.avatar === st.avatar ? 'selected' : ''}>${esc(c.name)}${dupCount(c) > 1 ? ' · ' + esc(c.avatar) : ''}</option>`).join('')}</select>
        <span class="ee-hint">${tl("저장 폴더:")} <code>characters/${esc(folderOf(ch))}/</code></span></div>
      ${folderExtra(ch)}
      <div class="ee-top">
        <div class="ee-refbox">
          <img class="ee-card" id="ee-refimg" data-act="zoom" src="${esc(refUrlOf(ch))}" alt="${tl("기준 사진")}" title="${tl("표정 생성의 기준 사진 (클릭하면 크게 보기)")}">
          <small class="ee-hint">${tl("기준 사진: {0}",[d.ref ? tl("직접 고른 사진") : tl("카드 PNG")])}</small>
          <button class="ee-btn sm" data-act="ref-pick">${tl("사진 바꾸기")}</button>
          ${d.ref ? `<button class="ee-btn sm" data-act="ref-reset">${tl("카드 PNG로")}</button>` : ''}
          <input type="file" id="ee-reffile" accept="image/*" class="ee-off">
        </div>
        <div class="ee-col">
          <label class="ee-lbl">${tl("외형 태그")} <small id="ee-lookstat"></small></label>
          <textarea id="ee-look" rows="4" placeholder="${tl("비워 두면 표정을 만들 때 카드 설명에서 영어 외형 태그를 한 번 만들어 저장해요. 직접 고치면 그 내용으로 고정돼요.")}"></textarea>
          <div class="ee-row tight"><button class="ee-btn sm" data-act="look-ai">${tl("카드 설명에서 외형 다시 추출 (텍스트 모델 1회)")}</button><button class="ee-btn sm" data-act="look-ss" title="${tl("장면 생성기에 이미 추출된 이 캐릭터의 외형 태그를 가져와요")}">${tl("Scene Studio에서 외형 가져오기 (호출 없음)")}</button></div>
          <label class="ee-lbl">${tl("의상 (선택, 영어 권장)")}</label>
          <input type="text" id="ee-outfit" placeholder="${tl("비우면 카드의 기본 의상 그대로. 예: white sailor school uniform with red ribbon")}" value="${esc(d.outfit || '')}">
        </div>
      </div>
      <details class="ee-more"><summary>${tl("화풍 프롬프트 · 제외 요소")} <small id="ee-stylecur"></small></summary>
        <div class="ee-row tight"><label>${tl("화풍 프롬프트")}</label><select id="ee-style-sel"></select><input type="text" id="ee-style-name" class="ee-name" placeholder="${tl("이름")}"><button class="ee-btn sm" data-act="style-save" title="${tl("저장 (같은 이름이면 덮어써요)")}">💾</button><button class="ee-btn sm" data-act="style-del" title="${tl("이 프리셋 삭제")}">🗑</button></div>
        <textarea id="ee-style-text" rows="4"></textarea>
        <p class="ee-hint">${tl("\"직접 입력\"에 글을 쓰고 이름을 정해 저장 아이콘을 누르면 프리셋으로 저장돼요. 같은 이름이면 덮어써요.")}</p>
        <label class="ee-lbl">${tl("제외 요소")}</label>
        <textarea id="ee-neg" rows="2" placeholder="${tl("생성에서 빼고 싶은 요소 (선택). 줄을 바꿔 적어도 한 줄로 합쳐 보내요.")}"></textarea></details>
      <details class="ee-more" open><summary>${tl("만들 표정 선택")} <span id="ee-selcount"></span></summary>
        <div class="ee-row tight"><button class="ee-btn sm" data-act="preset" data-p="6">${tl("기본 6")}</button><button class="ee-btn sm" data-act="preset" data-p="10">${tl("핵심 10")}</button><button class="ee-btn sm" data-act="preset" data-p="all">${tl("전체 28")}</button><button class="ee-btn sm" data-act="preset" data-p="none">${tl("해제")}</button></div>
        <div class="ee-chips" id="ee-chips"></div>
        <p class="ee-hint">${tl("SillyTavern 기본 표정 확장과 같은 28개 이름이에요.")}</p>
        <p class="ee-hint"><span class="ee-lg has">${tl("노란색")}</span> ${tl("이미 만든 표정 ·")} <span class="ee-lg on">${tl("초록색")}</span> ${tl("이번에 만들 표정 ·")} <span class="ee-lg both">${tl("노란색+초록 테두리")}</span> ${tl("선택했지만 이미 있어서 건너뛰는 표정 (아래 \"덮어쓰기\"를 켜면 다시 만들어요)")}</p></details>
      <div class="ee-row">
        <label class="ee-ck"><input type="checkbox" id="ee-over" ${s.overwrite ? 'checked' : ''}><span>${tl("이미 있는 표정도 다시 만들어 덮어쓰기")}</span></label>
        <span class="ee-grow"></span>
        <button class="ee-btn primary" data-act="gen" id="ee-gen"></button><button class="ee-btn danger ee-off" data-act="stop" id="ee-stop">${tl("중지")}</button></div>
      <div id="ee-prog" class="ee-prog"></div>
      <div id="ee-fbnote"></div>
      <h4>${tl("현재 스프라이트")} <span id="ee-spcount"></span></h4>
      <div class="ee-grid" id="ee-grid"></div>
      <p class="ee-hint">${tl("만든 표정은 확인 없이 바로 스프라이트 폴더에")} <code>${tl("감정이름.png")}</code>${tl("로 저장돼요. 이미지 1장마다 이미지 API가 1번 호출돼서 요금이 발생해요. ↻ 다시 생성 · ✂ 배경/가장자리 조절 · ✕ 삭제")}<br>${tl("기준 사진을 바꾸면 이후에 만드는 표정부터 새 사진을 기준으로 해요. neutral이 이미 있으면 neutral도 함께 기준이 되니, 새 사진으로 통일하려면 neutral부터 다시 만들어 주세요.")}</p>
      <details class="ee-more"><summary>${tl("ST에서 표정이 안 보여요? 점검")}</summary>
        <p class="ee-hint">${tl("ST 화면에서 표정이 비어 보일 때 어디에서 막히는지 확인해요. 결과를 캡처해서 공유하면 원인을 찾는 데 도움이 돼요.")}</p>
        <div class="ee-row tight"><button class="ee-btn sm" data-act="diag">${tl("점검하기")}</button></div><div id="ee-diag" class="ee-diag"></div></details>`;
    renderLook(); renderStyle(); renderChips(); renderGrid(); refreshGen(); setProg(st.prog);
  }
  function renderLook() {
    const ch = curChar(), ta = root && $('#ee-look', root); if (!ch || !ta) return;
    const a = S().appearance[ch.avatar];
    ta.value = a?.t || '';
    $('#ee-lookstat', root).textContent = !a?.t ? tl("· 아직 없음 (표정을 만들 때 자동 추출)") : a.manual ? tl("· 직접 수정함 (고정)") : a.src === 'ss' ? tl("· 장면 생성기에서 가져옴") : tl("· 자동 추출됨");
  }
  function renderChips() {
    const ch = curChar(); if (!ch) return;
    const sel = selected(ch);
    if (!$('#ee-chips', root)) return;
    $('#ee-chips', root).innerHTML = ALL.map((e) => `<button class="ee-chip ${sel.includes(e) ? 'on' : ''} ${hasSprite(e) ? 'has' : ''}" data-act="chip" data-l="${e}">${e}</button>`).join('');
    $('#ee-selcount', root).textContent = tl("(선택 {0}/{1} · 만든 표정 {2}/{3})",[sel.length,ALL.length,ALL.filter(hasSprite).length,ALL.length]);
  }
  function renderGrid() {
    const grid = $('#ee-grid', root); if (!grid) return;
    $('#ee-spcount', root).textContent = tl("({0}장)",[st.sprites.length]);
    grid.innerHTML = st.sprites.map((sp) => `<figure class="ee-th"><img src="${esc(spriteUrl(sp))}" alt="${esc(sp.label)}" data-act="zoom" title="${tl("클릭하면 크게 보기")}"><figcaption>${esc(sp.label)}</figcaption>
      <button class="ee-x" data-act="del" data-l="${esc(sp.label)}" aria-label="${tl("삭제")}">✕</button><button class="ee-rg" data-act="regen" data-l="${esc(sp.label)}" title="${tl("이 표정 다시 생성")}" aria-label="${tl("다시 생성")}">↻</button><button class="ee-cutb" data-act="edge" data-l="${esc(sp.label)}" title="${tl("배경 제거 · 가장자리 조절")}" aria-label="${tl("가장자리 조절")}">✂</button></figure>`).join('') || `<span class="ee-hint">${tl("아직 스프라이트가 없어요. 위에서 표정을 골라 만들어 보세요.")}</span>`;
    renderFbNote();
  }
  function refreshGen() {
    const ch = curChar(), b = $('#ee-gen', root); if (!ch || !b) return;
    const n = todoList(ch).length;
    b.textContent = n ? tl("선택한 표정 만들기 ({0}장)",[n]) : tl("만들 표정이 없어요");
    b.disabled = !n || st.busy;
    $('#ee-stop', root).classList.toggle('ee-off', !st.busy);
  }

  function finishGen() { st.busy = false; st.abort = null; genStatus(''); refreshGen(); }
  async function runGen() {
    const ch = curChar(); if (!ch || st.busy) return;
    await maybeSplitFolder(ch);
    if (st.busy) return;   // 확인 중에 다른 생성이 시작됐으면 중복 실행하지 않아요
    const list = todoList(ch);
    if (!list.length) return;
    if (!S().geminiKey.trim()) { say('warning', tl("API 키를 입력해 주세요. (확장 프로그램 → 표정 추출기)")); return; }
    if (!window.confirm(tl("표정 {0}장을 만들어요.\n이미지 API가 {1}번 호출되고 요금이 발생해요. 계속할까요?",[list.length,list.length]))) return;
    st.busy = true; st.stop = false; st.abort = new AbortController(); refreshGen();
    let made = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        if (st.stop) break;
        const e = list[i];
        genStatus(tl("표정 생성 {0}/{1} · {2} · {3}",[i + 1,list.length,ch.name,e])); setProg(tl("{0}/{1} · {2} 만드는 중…",[i + 1,list.length,e]));
        try { await makeSprite(ch, e); made++; await loadSprites(ch); renderGrid(); renderChips(); }
        catch (err) { if (st.stop || err?.name === 'AbortError') break; say('error', tl("{0} 생성 실패: {1}",[e,err.message || err])); if (e === 'neutral' && !hasSprite('neutral')) break; }
      }
    } finally {
      const stopped = st.stop;
      finishGen();
      setProg(stopped ? tl("취소했어요 ({0}장 완료)",[made]) : tl("끝! {0}장을 스프라이트 폴더에 저장했어요.{1}",[made,made ? ' ' + tl(LIST_NOTE) : '']));
      if (stopped) say('info', tl("표정 생성을 취소했어요 ({0}장 저장됨). 이미 Google에 전달된 요청은 서버에서 계속돼 요금이 나올 수 있어요.",[made]));
      else say(made ? 'success' : 'warning', made ? tl("표정 {0}장을 {1} 폴더에 저장했어요. 안 보이면 채팅을 다시 열어 주세요.",[made,folderOf(ch)]) : tl("저장된 표정이 없어요. 위의 오류를 확인해 주세요."));
    }
  }
  async function regen(label) {
    const ch = curChar(); if (!ch || st.busy) return;
    if (!window.confirm(tl("\"{0}\" 표정을 다시 만들어요. 이미지 API 1회 호출이에요. 계속할까요?",[label]))) return;
    st.busy = true; st.stop = false; st.abort = new AbortController(); refreshGen();
    genStatus(tl("표정 다시 생성 · {0} · {1}",[ch.name,label])); setProg(tl("{0} 다시 만드는 중…",[label]));
    try { await makeSprite(ch, label); await loadSprites(ch); renderGrid(); setProg(tl("{0} 완료. {1}",[label,tl(LIST_NOTE)])); say('success', tl("{0} 표정을 다시 만들었어요.",[label])); }
    catch (err) {
      if (st.stop || err?.name === 'AbortError') { setProg(tl("취소했어요")); say('info', tl("취소했어요. 이미 Google에 전달된 요청은 서버에서 계속돼 요금이 나올 수 있어요.")); }
      else { say('error', tl("{0} 생성 실패: {1}",[label,err.message || err])); setProg(''); }
    } finally { finishGen(); }
  }
  async function delSprite(label) {
    const ch = curChar(); if (!ch || st.busy) return;
    if (!window.confirm(tl("\"{0}\" 스프라이트를 삭제할까요?",[label]))) return;
    if (!(await deleteSprite(ch, label))) say('error', tl("삭제하지 못했어요."));
    await dropOrig(ch, label);   // 보관한 원본 파일도 함께 지워요
    await loadSprites(ch); renderGrid(); renderChips(); refreshGen();
  }
  /* 확대 보기: 창 안쪽 레이어로 보여줘요. (화면 전체를 덮는 방식은 모바일 브라우저에서 위쪽이 잘렸어요) 아무 데나 누르거나 ✕로 닫아요. */
  const smallScreen = () => window.innerWidth < 800 || !!window.matchMedia?.('(pointer: coarse)').matches;
  function zoom(src) {
    if (!smallScreen()) {   // PC: 화면 전체 확대 (예전 방식 그대로)
      const o = document.createElement('div'); o.className = 'ee-zoom'; o.innerHTML = `<img src="${esc(src)}" alt="">`;
      o.addEventListener('click', () => o.remove()); document.body.appendChild(o); return;
    }
    const z = root && $('#ee-zoom', root); if (!z) return;
    z.innerHTML = `<img src="${esc(src)}" alt=""><button type="button" class="ee-btn sm ee-zoomx" data-act="zoom-close" aria-label="${esc(tl("닫기"))}">✕</button>`;
    z.classList.remove('ee-off');
  }
  function closeZoom() { const z = root && $('#ee-zoom', root); if (z) { z.classList.add('ee-off'); z.innerHTML = ''; } }

  /* ST 표정 확장의 "대체 표정"(Default / Fallback Expression)이 이 캐릭터에 없는 스프라이트를 가리키면,
   * 답변에서 고른 감정의 스프라이트가 없을 때 이미지가 빈 채로 보여요. 그걸 알려 주고 neutral로 바꾸는 버튼을 줘요. */
  function stFallback() { const ex = ctx().extensionSettings?.expressions; return ex ? { fb: ex.fallback_expression || null, emoji: !!ex.showDefault } : null; }
  function renderFbNote() {
    const box = root && $('#ee-fbnote', root); if (!box) return;
    const f = stFallback(); let html = '';
    if (f && st.sprites.length && !f.emoji && !(f.fb && hasSprite(f.fb))) {
      const why = f.fb ? tl('⚠ ST 표정 확장의 대체 표정은 "{0}"인데 이 캐릭터에는 그 스프라이트가 없어요. 답변에서 고른 감정의 표정이 없으면 이미지가 비어 보여요.', [f.fb]) : tl('⚠ ST 표정 확장에 대체 표정이 설정돼 있지 않아요. 답변에서 고른 감정의 표정이 없으면 이미지가 비어 보여요.');
      const act = hasSprite('neutral') ? `<button class="ee-btn sm" data-act="fallback-neutral" title="${esc(tl("ST 표정 확장의 'Default / Fallback Expression'을 neutral로 바꿔요"))}">${esc(tl('neutral을 대체 표정으로 설정'))}</button>` : `<span class="ee-hint">${esc(tl('neutral 표정을 먼저 만들면 대체 표정으로 쓸 수 있어요.'))}</span>`;
      html = `<div class="ee-row tight"><span class="ee-warn">${esc(why)}</span>${act}</div>`;
    }
    box.innerHTML = html;
  }
  /* ST 화면에서 표정이 비어 보일 때, 어디에서 막히는지 차례로 확인해서 보여줘요 */
  async function runDiag() {
    const ch = curChar(), box = $('#ee-diag', root); if (!ch || !box) return;
    box.innerHTML = `<span class="ee-hint">${esc(tl('점검하는 중…'))}</span>`;
    const L = [], add = (kind, text) => L.push({ kind, text });
    const ex = ctx().extensionSettings?.expressions, dis = ctx().extensionSettings?.disabledExtensions;
    const holder = document.getElementById('expression-holder');
    if (Array.isArray(dis) && dis.some((n) => /expressions/i.test(String(n)))) add('warn', tl("ST의 Character Expressions 확장이 꺼져 있어요. 켜야 표정이 표시돼요."));
    else if (!holder) add('warn', tl('ST 화면에서 스프라이트 상자(expression-holder)를 찾지 못했어요. Character Expressions 확장이 설치/활성화돼 있는지 확인해 주세요.'));
    else add('ok', tl("ST Character Expressions 확장이 켜져 있어요."));
    const folder = folderOf(ch); let list = [];
    try { const r = await fetch('/api/sprites/get?name=' + encodeURIComponent(folder), { headers: jsonHeaders() }); list = r.ok ? await r.json() : []; } catch { list = []; }
    if (!Array.isArray(list)) list = [];
    if (!list.length) add('warn', tl('폴더 characters/{0}/ 에서 스프라이트를 하나도 찾지 못했어요. ST가 읽는 폴더 이름이 이 캐릭터 이름과 다른지 확인해 주세요.', [folder]));
    else {
      add('ok', tl('폴더 characters/{0}/ 에서 스프라이트 {1}장을 찾았어요.', [folder, list.length]));
      const bad = [];
      for (const sp of list) { try { const r = await fetch(sp.path, { method: 'HEAD' }); if (!r.ok) bad.push(`${sp.label} (${r.status})`); } catch { bad.push(`${sp.label} (network)`); } }
      add(bad.length ? 'warn' : 'ok', bad.length ? tl('불러오지 못하는 파일: {0}', [bad.join(', ')]) : tl('모든 파일이 서버에서 정상적으로 받아져요.'));
      const test = list.find((x) => x.label === 'neutral') || list[0];
      try { const im = await loadImg(test.path); add(im.naturalWidth > 0 ? 'ok' : 'warn', tl('{0} 이미지 크기: {1}×{2}', [test.label, im.naturalWidth, im.naturalHeight])); }
      catch { add('warn', tl('{0} 이미지를 브라우저가 열지 못했어요.', [test.label])); }
    }
    if (holder) {
      const cs = getComputedStyle(holder), r = holder.getBoundingClientRect(), im = holder.querySelector('img.expression:not(.expression-clone)') || holder.querySelector('img.expression');
      add('info', tl('ST 스프라이트 상자: display={0}, 크기 {1}×{2}px', [cs.display, Math.round(r.width), Math.round(r.height)]));
      if (im) {
        const src = im.getAttribute('src') || '';
        if (!src) add('warn', tl("ST의 스프라이트 이미지에 주소가 비어 있어요. ST가 최근 답변에 맞는 표정을 아직 고르지 못했거나, 고른 표정의 스프라이트를 찾지 못한 상태예요."));
        else { const ok = im.complete && im.naturalWidth > 0; add(ok ? 'ok' : 'warn', tl('ST가 지금 쓰는 이미지: {0} ({1}×{2}, {3})', [decodeURIComponent(src.split('?')[0]).split('/').pop(), im.naturalWidth, im.naturalHeight, ok ? tl('불러옴') : tl('불러오는 중 또는 실패')])); }
      }
    }
    const waifu = document.body.classList.contains('waifuMode'), api = ex?.api;
    const apiName = [tl('Local (영어 전용 모델)'), 'Extras', 'Main API', 'WebLLM'][api] ?? '?';
    add('info', tl('Visual Novel(와이프) 모드: {0} · 대체 표정: {1} · 분류 방식: {2}', [waifu ? tl('켜짐') : tl('꺼짐'), ex?.showDefault ? tl('기본 이모지') : (ex?.fallback_expression || tl('없음')), apiName]));
    add('info', tl('분류 전에 영어로 번역: {0}', [ex?.translate ? tl('켜짐') : tl('꺼짐')]));
    if (!waifu && window.matchMedia?.('(max-width: 1000px)').matches) add('warn', tl('모바일 화면에서는 ST가 Visual Novel(와이프) 모드를 켰을 때만 스프라이트를 보여줘요.'));
    /* ST의 기본 분류기는 영어 전용 모델이라, 한국어 같은 답변은 감정을 잘못 고르거나 만들지 않은 표정을 고를 수 있어요 */
    const lastReply = [...(ctx().chat || [])].reverse().find((m) => m && !m.is_user && !m.is_system && m.mes)?.mes || '';
    const nonEnglish = (lastReply.match(/[\u3131-\u318E\uAC00-\uD7A3\u3040-\u30FF\u3400-\u9FFF]/g) || []).length >= 5;
    const canTranslate = typeof globalThis.translate === 'function';
    let extra = '';
    if (nonEnglish && (api === 0 || api === 1) && !ex?.translate) {
      add('warn', tl('마지막 답변이 영어가 아니에요. ST의 기본 표정 분류기는 영어 전용이라 감정을 잘못 고르거나 만들지 않은 표정을 고를 수 있어요. "Translate text to English before classification"을 켜거나 분류 방식(Classifier API)을 "Main API"로 바꿔 보세요.'));
      if (canTranslate) extra = `<div class="ee-row tight"><button class="ee-btn sm" data-act="enable-translate">${esc(tl('번역 후 분류 켜기'))}</button></div>`;
      else add('warn', tl("번역 후 분류를 쓰려면 ST의 Chat Translation 확장을 켜고 번역 방식을 설정해야 해요."));
    }
    if (ex?.translate && !canTranslate) add('warn', tl('번역 후 분류가 켜져 있지만 Chat Translation 확장이 동작하지 않아서 번역되지 않아요.'));
    if (api === 2 && !ex?.filterAvailable && ALL.filter(hasSprite).length < ALL.length) add('warn', tl('분류 방식이 Main API인데 만든 표정만 사용하는 옵션(Only show and use expressions that have sprites)이 꺼져 있어요. 표정을 일부만 만들었다면 켜 두면 만든 표정 중에서만 골라요.'));
    box.innerHTML = L.map((l) => `<div class="ee-dl ${l.kind}">${l.kind === 'ok' ? '✅' : l.kind === 'warn' ? '⚠️' : 'ℹ️'} ${esc(l.text)}</div>`).join('') + extra;
  }
  function setStTranslate(on) {
    const cb = document.getElementById('expression_translate'), ex = (ctx().extensionSettings.expressions ||= {});
    if (cb) { cb.checked = on; cb.dispatchEvent(new Event('input', { bubbles: true })); }   // ST가 직접 저장하게 해요
    else { ex.translate = on; save(); }
    say('success', tl('번역 후 분류를 켰어요. 새 답변부터 적용돼요.'));
    return runDiag();
  }
  function setStFallback(label) {
    const sel = document.getElementById('expression_fallback'), ex = (ctx().extensionSettings.expressions ||= {});
    if (sel && [...sel.options].some((o) => o.value === label)) { sel.value = label; sel.dispatchEvent(new Event('change', { bubbles: true })); }   // ST가 직접 처리하게 해요
    else { ex.fallback_expression = label; ex.showDefault = false; save(); }
    say('success', tl('ST 표정 확장의 대체 표정을 {0}로 바꿨어요. 바로 안 바뀌면 채팅을 다시 열어 보세요.', [label]));
    renderFbNote();
  }

  /* ================= 기준 사진 바꾸기 / 장면 생성기 외형 가져오기 ================= */
  /* 장면 생성기에 이미 추출된 외형 태그가 있으면 텍스트 호출 없이 가져온다 (장면 생성기는 캐릭터 이름으로 저장해요) */
  function lookFromSS(ch) {
    const v = ctx().extensionSettings?.minimap;
    if (!v) return say('info', tl("장면 생성기(Scene Studio) 설정을 찾지 못했어요."));
    const a = v.appearance?.[ch.name];
    if (!String(a?.t || '').trim()) return say('info', tl("장면 생성기에 \"{0}\"의 외형 태그가 아직 없어요. 장면 생성기에서 먼저 추출하거나, 옆의 추출 버튼을 눌러 주세요.",[ch.name]));
    const cur = S().appearance[ch.avatar];
    if (cur?.manual && cur.t !== a.t && !window.confirm(tl("직접 고친 외형이 있어요. 장면 생성기의 외형으로 덮어쓸까요?"))) return;
    S().appearance[ch.avatar] = { h: hash(descOf(ch)), t: a.t, manual: !!a.manual, src: 'ss' };   // 해시를 지금 설명에 맞춰 두면 다시 추출하지 않아요
    save(); renderLook();
    say('success', tl("장면 생성기의 외형 태그를 가져왔어요. (텍스트 호출 없음)"));
  }
  async function fileToPngB64(file) {
    const obj = URL.createObjectURL(file);
    try {
      const img = await loadImg(obj), k = Math.min(1, 2048 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/png').split(',')[1];
    } finally { URL.revokeObjectURL(obj); }
  }
  async function setRef(ch, file) {
    try {
      const image = await fileToPngB64(file);
      const r = await fetch('/api/images/upload', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ image, format: 'png', ch_name: 'expression-extractor', filename: `${ch.name}_ref_${Date.now()}` }) });
      if (!r.ok) throw new Error(tl("업로드 실패 (") + r.status + ')');
      const oldRef = cd(ch).ref;
      cd(ch).ref = '/' + String((await r.json()).path).replace(/^\\+|^\/+/, ''); save();
      if (oldRef) await deleteImageFile(oldRef);   // 바꾸기 전 기준 사진 파일은 지워요
      say('success', tl("기준 사진을 바꿨어요. 이후에 만드는 표정부터 이 사진을 기준으로 해요."));
      await renderBody();
    } catch (e) { say('error', tl("기준 사진을 바꾸지 못했어요: ") + (e.message || e)); }
  }

  /* ================= 설정 탭 ================= */
  /* 숫자 입력칸: [설정 키, 가장자리 창 키, 이름, 최소, 최대, 한 줄 설명] */
  const NUM_FIELDS = [
    ['imgGapSec', null, '이미지 요청 간격 (초)', 0, 60, '429(요청 과다)가 뜨면 늘려 보세요. 429가 나면 자동으로 기다렸다가 다시 시도해요.'],
    ['cutTol', 'tol', '배경 민감도', 10, 80, '값이 크면 배경을 더 많이 지우지만 인물 가장자리가 깎일 수 있어요.'],
    ['holeTol', 'holes', '내부 빈 공간 지우기 (0=끔)', 0, 40, '팔과 몸 사이처럼 테두리와 이어지지 않은 배경색 빈틈을 지워요. 값이 크면 흰 옷 같은 밝은 면도 지워질 수 있어서 ✂ 미리보기로 확인하며 올려 보세요.'],
    ['edgeFringe', 'fringe', '흰 테두리 제거 (0=끔)', 0, 100, '인물 가장자리에 남은 흰 띠를 지워요. 값이 크면 흰 옷이나 밝은 머리카락 가장자리도 깎일 수 있어요.'],
    ['edgeShrink', 'shrink', '가장자리 줄이기 (px)', 0, 6, '경계를 안쪽으로 깎아서 남은 테두리를 없애요. 값이 크면 인물이 얇아져 보여요.'],
    ['edgeSoft', 'soft', '가장자리 부드럽게 (px)', 0, 3, '경계를 흐리게 해서 계단을 줄여요. 값이 크면 윤곽이 번져 보일 수 있어요.'],
  ];
  const numField = (key) => NUM_FIELDS.find((f) => f[0] === key || f[1] === key);
  const numClamp = (f, v) => clamp(Math.round(v), f[3], f[4]);
  const numRow = (f, attr, val) => `<div class="ee-numrow"><label class="ee-num"><span>${tl(f[2])} <small>(${f[3]}~${f[4]})</small></span><input type="number" min="${f[3]}" max="${f[4]}" step="1" value="${val}" ${attr}></label><p class="ee-hint">${tl(f[5])}</p></div>`;
  function renderSetTab() {
    st.spScan = null;   // 목록은 열 때마다 새로 찾아요 (오래된 목록으로 지우지 않게)
    const s = S(), body = $('#ee-body', root);
    const lg = S().lang;
    body.innerHTML = `
      <h4>Language / 언어</h4>
      <div class="ee-row tight"><select data-sl="lang"><option value="auto" ${lg === 'auto' ? 'selected' : ''}>Auto / 자동</option><option value="ko" ${lg === 'ko' ? 'selected' : ''}>한국어</option><option value="en" ${lg === 'en' ? 'selected' : ''}>English</option></select></div>
      <h4>${tl("이미지 요청")}</h4>
      <div class="ee-nums">${numRow(NUM_FIELDS[0], `data-sk="imgGapSec"`, s.imgGapSec)}</div>
      <h4>${tl("배경 제거 · 가장자리")}</h4>
      <div class="ee-row tight"><label class="ee-ck"><input type="checkbox" data-skc="cutout" ${s.cutout ? 'checked' : ''}><span>${tl("배경 제거 (투명 PNG로 저장)")}</span></label></div>
      <div class="ee-row tight"><label class="ee-ck"><input type="checkbox" data-skc="keepOrig" ${s.keepOrig ? 'checked' : ''}><span>${tl("배경 제거 전 원본도 보관 (가장자리를 나중에 다시 조절할 수 있어요)")}</span></label></div>
      <div class="ee-nums">${NUM_FIELDS.slice(1).map((f) => numRow(f, `data-sk="${f[0]}"`, s[f[0]])).join('')}</div>
      <p class="ee-hint">${tl("숫자를 직접 입력해요. 이 값은 앞으로 만드는 표정에 적용돼요. 이미 만든 표정은 [표정] 탭에서 ✂를 눌러 미리 보면서 조절해요. 배경 제거와 가장자리 조절은 브라우저 안에서 처리돼서 API 호출이 늘지 않아요.")}</p>
      <div class="ee-row"><button class="ee-btn sm" data-act="set-reset">${tl("가장자리 값을 기본으로 되돌리기")}</button></div>
      <h4>${tl("스프라이트 삭제 (선택)")}</h4>
      <p class="ee-hint">${tl("만든 표정 스프라이트(characters/…)는 ST 표정 확장이 쓰는 파일이라 아래 \"데이터 정리\" 버튼으로는 지워지지 않아요. 확장을 완전히 지울 때 여기서 골라서 지우세요. 지우면 되돌릴 수 없어요. \"이 확장의 모든 데이터 삭제\"보다 먼저 쓰세요.")}</p>
      <div class="ee-row tight"><button class="ee-btn sm" data-act="sp-scan">${tl("스프라이트 폴더 찾기")}</button></div>
      <div id="ee-splist"></div>
      <h4>${tl("데이터 정리")}</h4>
      <p class="ee-hint">${tl("보관한 원본과 기준 사진은 서버의")} <code>user/images/expression-extractor/</code> ${tl("폴더에 저장돼요. 표정 스프라이트(")}<code>characters/…</code>${tl(")는 아래 버튼으로 지워지지 않아요.")}</p>
      <div class="ee-row tight"><button class="ee-btn sm" data-act="clean-orphans" title="${tl("어디에서도 쓰지 않는 파일과, ST에서 삭제된 캐릭터의 설정을 정리해요")}">${tl("쓰지 않는 파일 정리")}</button><button class="ee-btn sm" data-act="clean-origs" title="${tl("보관한 원본을 모두 지워요. 이후 ✂ 조절은 현재 이미지를 기준으로 해요")}">${tl("보관한 원본 모두 삭제")}</button><button class="ee-btn danger sm" data-act="wipe-all" title="${tl("API 키, 기록, 외형 태그, 프리셋, 기준 사진, 보관 파일을 모두 지워요")}">${tl("이 확장의 모든 데이터 삭제")}</button></div>
      <p class="ee-hint" id="ee-cleanmsg"></p>`;
  }

  /* ================= 기록 탭 ================= */
  const fmtK = (n) => (n >= 10000 ? (n / 1000).toFixed(1) + 'k' : String(n || 0));
  const fmtTime = (t) => { const d = new Date(t), same = d.toDateString() === new Date().toDateString(); return (same ? '' : `${d.getMonth() + 1}/${d.getDate()} `) + d.toLocaleTimeString(effLang() === 'ko' ? 'ko-KR' : 'en-US', { hour12: false }); };
  function renderLogTab() {
    const s = S(), u = s.usage || {}, body = $('#ee-body', root); if (!body) return;
    const stat = { ok: tl("성공"), 429: tl("429 재시도"), cancel: tl("취소"), fail: tl("실패") };
    const rows = s.usageLog.slice(0, 60).map((e) => `<tr class="st-${esc(e.status)}"><td>${fmtTime(e.t)}</td><td>${e.kind === 'text' ? tl("텍스트") : tl("이미지")}</td><td>${esc(e.label)}</td><td>${e.tok ? `${e.tok.est ? '≈' : ''}${fmtK(e.tok.in)} → ${fmtK(e.tok.out)}` : ''}</td><td>${stat[e.status] || esc(e.status)}</td></tr>`).join('');
    body.innerHTML = `
      <div class="ee-stats">
        <div><small>${tl("텍스트 호출")}</small><b>${u.text || 0}</b><span>${tl("토큰 ≈ {0} 입력 / {1} 출력",[fmtK(u.tin),fmtK(u.tout)])}</span></div>
        <div><small>${tl("이미지 호출")}</small><b>${u.image || 0}</b><span>${tl("토큰 {0} 입력 / {1} 출력",[fmtK(u.iin),fmtK(u.iout)])}</span></div>
        <div><small>${tl("429 재시도")}</small><b>${u.r429 || 0}</b><span>${tl("요청이 몰려 기다린 횟수")}</span></div>
      </div>
      <p class="ee-hint">${tl("텍스트 토큰은 글자 수로 추정한 값(≈)이에요. 이미지 토큰은 Google이 알려 준 실제 값이에요.")} <button class="ee-btn sm" data-act="usage-reset">${tl("누적 초기화")}</button></p>
      <h4>${tl("언제 호출되나요")}</h4>
      <div class="ee-callinfo">
        <p><b>${tl("텍스트")}</b>${tl(": 외형 태그 추출")} <b>${tl("1회")}</b>${tl("예요. 캐릭터마다 처음 한 번만 나가고, 카드 설명이 바뀌었거나 \"다시 추출\"을 누를 때만 다시 나가요. 직접 고친 외형은 호출하지 않아요.")}</p>
        <p><b>${tl("이미지")}</b>${tl(": 만들 표정")} <b>${tl("한 장당 1회")}</b>${tl("예요. neutral이 없으면 기준용 neutral 1장이 먼저 더해져요. ↻ 다시 생성도 1회예요. 429가 나면 기다렸다가 다시 보내요.")}</p>
        <p><b>${tl("0회")}</b>${tl(": 배경 제거, 가장자리 조절, 삭제, 기준 사진 바꾸기, 장면 생성기에서 외형 가져오기는 API를 쓰지 않아요.")}</p>
      </div>
      <h4>${tl("최근 호출")}</h4>
      ${rows ? `<div class="ee-tblwrap"><table class="ee-utable"><tr><th>${tl("시각")}</th><th>${tl("종류")}</th><th>${tl("내용")}</th><th>${tl("토큰")}</th><th>${tl("결과")}</th></tr>${rows}</table></div>` : `<p class="ee-hint">${tl("아직 나간 호출이 없어요.")}</p>`}`;
  }

  /* ================= 배경 · 가장자리 조절 창 (미리보기) ================= */
  const edge = { label: '', url: '', fromOrig: false, base: null, o: null, bg: 'checker', timer: 0, token: 0 };
  async function openEdge(label) {
    const ch = curChar(), sp = st.sprites.find((x) => x.label === label); if (!ch || !sp || st.busy) return;
    const s = S(), origUrl = s.origs[origKey(ch, label)], token = ++edge.token;
    edge.label = label; edge.o = { tol: s.cutTol, fringe: s.edgeFringe, shrink: s.edgeShrink, soft: s.edgeSoft, holes: s.holeTol };
    let px = null;
    if (origUrl) { try { px = await pixelsOf(origUrl, 720); edge.fromOrig = true; edge.url = origUrl; } catch { px = null; } }
    if (!px) { try { px = await pixelsOf(spriteUrl(sp), 720); edge.fromOrig = false; edge.url = spriteUrl(sp); } catch (e) { say('error', tl("이미지를 불러오지 못했어요: ") + (e.message || e)); return; } }
    if (token !== edge.token) return;
    edge.base = px;
    const box = $('#ee-edge', root);
    box.innerHTML = `<div class="ee-edge-in">
      <div class="ee-row tight"><b>${esc(label)}</b> <span class="ee-hint" id="ee-edgesrc"></span><span class="ee-grow"></span><button class="ee-btn sm" data-act="edge-close">${tl("닫기")}</button></div>
      <div class="ee-row tight"><span class="ee-hint">${tl("미리보기 배경")}</span>${[['checker', tl("체커")], ['black', tl("검정")], ['green', tl("초록")], ['white', tl("흰색")]].map(([k, n]) => `<button class="ee-btn sm ${edge.bg === k ? 'primary' : ''}" data-act="edge-bg" data-k="${k}">${n}</button>`).join('')}</div>
      <div class="ee-cvwrap bg-${edge.bg}" id="ee-cvwrap"><canvas id="ee-cv" class="ee-cv"></canvas></div>
      <div class="ee-nums">${NUM_FIELDS.filter((f) => f[1]).map((f) => numRow(f, `data-edge="${f[1]}"`, edge.o[f[1]])).join('')}</div>
      <div class="ee-hint" id="ee-edgemsg"></div>
      <div class="ee-row tight"><button class="ee-btn primary" data-act="edge-apply">${tl("적용 (스프라이트에 저장)")}</button><button class="ee-btn sm" data-act="edge-save-def">${tl("이 값을 기본값으로")}</button><button class="ee-btn sm" data-act="edge-reset">${tl("기본값으로 되돌리기")}</button></div></div>`;
    box.classList.remove('ee-off');
    $('#ee-edgesrc', root).textContent = edge.fromOrig ? tl("· 배경 제거 전 원본에서 다시 계산해요 (언제든 되돌릴 수 있어요)") : tl("· 원본이 없어서 지금 이미지를 기준으로 해요 (적용하면 덮어써요)");
    edgeRender();
  }
  function closeEdge() { edge.token++; clearTimeout(edge.timer); const b = root && $('#ee-edge', root); if (b) { b.classList.add('ee-off'); b.innerHTML = ''; } edge.base = null; }
  function edgeRender() {
    if (!edge.base) return;
    const { w, h, data } = edge.base;
    const cv = $('#ee-cv', root); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'), work = g.createImageData(w, h);
    work.data.set(data.data);   // 원본 픽셀은 그대로 두고 복사본에만 적용
    const info = processPixels(work.data, w, h, { removeBg: true, ...edge.o });
    g.putImageData(work, 0, 0);
    $('#ee-edgemsg', root).textContent = info.bgFailed ? tl("배경이 균일하지 않아 배경 제거를 건너뛰어요 (인식 {0}%). 민감도를 조절해 보세요.",[(info.ratio * 100).toFixed(0)]) : info.wasTransparent ? tl("이미 투명한 이미지예요. 배경 민감도는 쓰이지 않아요.") : tl("배경 인식 {0}%{1}",[(info.ratio * 100).toFixed(0),info.holes ? tl(" · 내부 빈 공간 {0}% 지움",[(info.holes / (w * h) * 100).toFixed(1)]) : '']);
  }
  const edgeSchedule = () => { clearTimeout(edge.timer); edge.timer = setTimeout(edgeRender, 70); };
  async function edgeApply() {
    const ch = curChar(); if (!ch || !edge.base || st.busy) return;
    if (!edge.fromOrig && !window.confirm(tl("원본이 없어서 지금 이미지에 덮어써요. 되돌릴 수 없어요. 계속할까요?"))) return;
    const btn = $('[data-act="edge-apply"]', root); btn.disabled = true; btn.textContent = tl("저장 중…");
    try {
      const { w, h, data } = await pixelsOf(edge.url, 1600);
      const info = processPixels(data.data, w, h, { removeBg: true, ...edge.o });
      if (info.bgFailed) { say('warning', tl("배경이 균일하지 않아 적용하지 않았어요. 민감도를 조절해 보세요.")); return; }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').putImageData(data, 0, 0);
      await uploadSprite(ch, edge.label, await canvasBlob(cv));
      await loadSprites(ch); renderGrid(); say('success', tl("{0} 가장자리를 적용했어요.",[edge.label])); closeEdge();
    } catch (e) { say('error', tl("적용 실패: ") + (e.message || e)); }
    finally { const b = $('[data-act="edge-apply"]', root); if (b) { b.disabled = false; b.textContent = tl("적용 (스프라이트에 저장)"); } }
  }
  function edgeSetValues(o) {
    edge.o = { ...o };
    for (const f of NUM_FIELDS.filter((x) => x[1])) { const el = $(`[data-edge="${f[1]}"]`, root); if (el) el.value = edge.o[f[1]]; }
    edgeRender();
  }

  async function runCleanup(act) {
    if (st.busy) return say('info', tl("생성 중에는 정리할 수 없어요."));
    const msg = $('#ee-cleanmsg', root), show = (m) => { if (msg) msg.textContent = m; };
    try {
      if (act === 'clean-orphans') {
        const r = await cleanupFiles(); const m = tl("쓰지 않는 파일 {0}개를 지우고, 삭제된 캐릭터의 설정 {1}개를 정리했어요.",[r.removed,r.staleSettings]); show(m); say('success', m);
      } else if (act === 'clean-origs') {
        const n = Object.keys(S().origs).length;
        if (!window.confirm(tl("보관한 원본 {0}개를 모두 삭제해요.\n이후 ✂ 가장자리 조절은 지금 저장된 이미지를 기준으로 해요. 계속할까요?",[n]))) return;
        const r = await cleanupFiles({ dropOrigs: true }); const m = tl("보관한 원본 파일 {0}개를 지웠어요.",[r.removed]); show(m); say('success', m);
      } else {
        if (!window.confirm(tl("이 확장의 모든 데이터를 삭제해요.\n\n- API 키, 호출 기록, 외형 태그, 화풍 프리셋, 창 위치 등 설정 전체\n- 서버에 보관한 원본/기준 사진 파일 전체\n\n만든 표정 스프라이트(characters/…)와 ST 표정 확장의 \"폴더 덮어쓰기\"는 그대로 남아요.\n스프라이트도 지우려면 이 버튼보다 먼저 \"스프라이트 삭제\"를 쓰세요. 이 버튼을 누르면 어떤 폴더가 이 확장으로 만든 것인지 기억도 지워져요.\n확장을 지우기 전에 쓰는 기능이에요. 계속할까요?"))) return;
        const n = await wipeAll(); syncDrawer(); await renderBody(); say('success', tl("모든 데이터를 삭제했어요. (서버 파일 {0}개) 확장을 지우거나, 계속 쓰려면 페이지를 새로고침하세요.",[n]));
      }
    } catch (e) { say('error', tl("정리하지 못했어요: ") + (e.message || e)); }
  }

  /* ================= 이벤트 ================= */
  async function onClick(e) {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const act = t.dataset.act, ch = curChar();
    if (act === 'close') return closeModal();
    if (act === 'zoom-close') return closeZoom();
    if (act === 'zoom') return zoom(t.getAttribute('src'));
    if (act === 'fallback-neutral') return setStFallback('neutral');
    if (act === 'tab') { closeEdge(); closeZoom(); st.tab = t.dataset.tab; return renderBody(); }
    if (act === 'stop') return cancelGen();
    if (act === 'usage-reset') { if (!window.confirm(tl("호출 기록과 누적 횟수를 모두 지울까요?"))) return; const s0 = S(); s0.usage = structuredClone(defaults.usage); s0.usageLog = []; save(); return renderLogTab(); }
    if (act === 'set-reset') { const s0 = S(); Object.assign(s0, { cutTol: defaults.cutTol, edgeFringe: defaults.edgeFringe, edgeShrink: defaults.edgeShrink, edgeSoft: defaults.edgeSoft, holeTol: defaults.holeTol }); save(); return renderSetTab(); }
    if (act === 'clean-orphans' || act === 'clean-origs' || act === 'wipe-all') return runCleanup(act);
    if (act === 'sp-scan') return runSpriteScan();
    if (act === 'sp-delete') return runSpriteDelete();
    if (act === 'edge-close') return closeEdge();
    if (act === 'edge-bg') { edge.bg = t.dataset.k; $('#ee-cvwrap', root).className = 'ee-cvwrap bg-' + edge.bg; root.querySelectorAll('[data-act="edge-bg"]').forEach((b) => b.classList.toggle('primary', b === t)); return; }
    if (act === 'edge-apply') return edgeApply();
    if (act === 'edge-save-def') { const s0 = S(); s0.cutTol = edge.o.tol; s0.edgeFringe = edge.o.fringe; s0.edgeShrink = edge.o.shrink; s0.edgeSoft = edge.o.soft; s0.holeTol = edge.o.holes; save(); return say('success', tl("이 값을 기본값으로 저장했어요. 앞으로 만드는 표정에 적용돼요. (설정 탭에서도 바꿀 수 있어요)")); }
    if (act === 'edge-reset') return edgeSetValues({ tol: defaults.cutTol, fringe: defaults.edgeFringe, shrink: defaults.edgeShrink, soft: defaults.edgeSoft, holes: defaults.holeTol });
    if (!ch) return;
    if (act === 'folder-split' || act === 'folder-join') { if (st.busy) return say('info', tl("생성 중에는 폴더를 바꿀 수 없어요.")); return act === 'folder-split' ? splitFolder(ch) : joinFolder(ch); }
    if (act === 'diag') return runDiag();
    if (act === 'enable-translate') return setStTranslate(true);
    if (act === 'look-ss') return lookFromSS(ch);
    if (act === 'ref-pick') return $('#ee-reffile', root).click();
    if (act === 'ref-reset') { const oldRef = cd(ch).ref; delete cd(ch).ref; save(); if (oldRef) await deleteImageFile(oldRef); say('success', tl("카드 PNG를 기준으로 되돌렸어요.")); return renderBody(); }
    if (act === 'chip') {
      const sel = selected(ch), l = t.dataset.l, i = sel.indexOf(l);
      if (i >= 0) sel.splice(i, 1); else sel.push(l);
      save(); renderChips(); refreshGen();
    } else if (act === 'preset') {
      const p = t.dataset.p; cd(ch).emos = p === '6' ? [...SET6] : p === '10' ? [...CORE10] : p === 'all' ? [...ALL] : [];
      save(); renderChips(); refreshGen();
    } else if (act === 'look-ai') {
      const rec = S().appearance[ch.avatar];
      if (!descOf(ch).trim()) return say('warning', tl("카드 설명이 비어 있어요. 외형을 직접 적어 주세요."));
      if (rec?.manual && !window.confirm(tl("직접 고친 외형이 지워지고 카드 설명에서 새로 추출해요. 계속할까요?"))) return;
      t.disabled = true; const old = t.textContent; t.textContent = tl("추출하는 중…");
      try { delete S().appearance[ch.avatar]; const v = await appearanceOf(ch); renderLook(); say(v ? 'success' : 'warning', v ? tl("외형을 추출했어요.") : tl("외형을 만들지 못했어요.")); }
      catch (err) { say('error', tl("외형 추출 실패: ") + (err.message || err)); renderLook(); }
      t.disabled = false; t.textContent = old;
    } else if (act === 'style-save') {
      const s0 = S(), cur = s0.stylePresets.find((q) => q.id === s0.stylePreset);
      const name = String($('#ee-style-name', root).value || '').trim() || cur?.name || '';
      if (!name) return say('info', tl("저장할 이름을 입력해 주세요."));
      if (!s0.styleText.trim()) return say('info', tl("프롬프트가 비어 있어요."));
      const same = s0.stylePresets.find((q) => q.name === name);
      if (same) { same.text = s0.styleText; s0.stylePreset = same.id; say('success', tl("\"{0}\"에 덮어썼어요.",[name])); }
      else { const id = uid(); s0.stylePresets.push({ id, name, text: s0.styleText }); s0.stylePreset = id; say('success', tl("\"{0}\"으로 저장했어요.",[name])); }
      save(); renderStyle();
    } else if (act === 'style-del') {
      const s0 = S(), x = s0.stylePresets.find((q) => q.id === s0.stylePreset);
      if (!x) return say('info', tl("\"직접 입력\"은 삭제할 수 없어요. 글을 지우면 비워져요."));
      if (!window.confirm(tl("\"{0}\" 프리셋을 삭제할까요?",[x.name]))) return;
      s0.stylePresets = s0.stylePresets.filter((q) => q.id !== x.id);
      s0.stylePreset = s0.stylePresets[0]?.id || 'custom'; s0.styleText = presetText(s0.stylePreset) || '';
      save(); renderStyle();
    } else if (act === 'gen') runGen();
    else if (act === 'regen') regen(t.dataset.l);
    else if (act === 'edge') openEdge(t.dataset.l);
    else if (act === 'del') delSprite(t.dataset.l);
  }
  async function onChange(e) {
    const t = e.target, ch = curChar();
    if (t.dataset?.skc) { S()[t.dataset.skc] = t.checked; save(); return; }
    if (t.dataset?.spf !== undefined) { const e = (st.spScan || [])[+t.dataset.spf]; if (e) { e.sel = t.checked; updateSpSummary(); } return; }
    if (t.dataset?.sl) { S()[t.dataset.sl] = t.value; save(); syncDrawer(); relocalize(); return; }   // 언어
    if (t.dataset?.sk) { const f = numField(t.dataset.sk), v = parseFloat(t.value); if (f) { if (Number.isFinite(v)) S()[f[0]] = numClamp(f, v); t.value = S()[f[0]]; save(); } return; }   // 범위를 벗어나면 맞춰 줘요
    if (t.dataset?.edge) { const f = numField(t.dataset.edge), v = parseFloat(t.value); if (f) { if (Number.isFinite(v)) edge.o[f[1]] = numClamp(f, v); t.value = edge.o[f[1]]; edgeSchedule(); } return; }
    if (t.id === 'ee-char') { if (st.busy) { t.value = st.avatar; return say('info', tl("생성 중에는 캐릭터를 바꿀 수 없어요. 취소하거나 끝날 때까지 기다려 주세요.")); } closeEdge(); st.avatar = t.value; st.prog = ''; return renderBody(); }
    if (t.id === 'ee-style-sel') { const s0 = S(); s0.stylePreset = t.value; s0.styleText = presetText(t.value) || ''; save(); return renderStyle(); }
    if (!ch) return;
    if (t.id === 'ee-reffile') { const f = t.files?.[0]; t.value = ''; if (f) await setRef(ch, f); return; }
    if (t.id === 'ee-look') {   // 직접 고치면 고정(manual). 비우면 다음에 다시 자동 추출
      const v = t.value.trim(), s0 = S();
      if (v) s0.appearance[ch.avatar] = { ...(s0.appearance[ch.avatar] || {}), t: v, manual: true }; else delete s0.appearance[ch.avatar];
      save(); renderLook();
    } else if (t.id === 'ee-outfit') { cd(ch).outfit = t.value.trim(); save(); }
    else if (t.id === 'ee-over') { S().overwrite = t.checked; save(); refreshGen(); }
  }
  function onInput(e) {
    const t = e.target, s0 = S();
    if (t.id === 'ee-style-text') { s0.styleText = t.value; if (s0.stylePreset === 'custom') s0.customText = t.value; save(); }
    else if (t.id === 'ee-neg') { s0.negative = t.value; save(); }
    else if (t.dataset?.sk) { const f = numField(t.dataset.sk), v = parseFloat(t.value); if (f && Number.isFinite(v)) { s0[f[0]] = numClamp(f, v); save(); } }   // 입력 중에는 칸을 건드리지 않아요
    else if (t.dataset?.edge) { const f = numField(t.dataset.edge), v = parseFloat(t.value); if (f && Number.isFinite(v)) { edge.o[f[1]] = numClamp(f, v); edgeSchedule(); } }
  }

  /* ================= 확장 설정 패널 / 메뉴 버튼 ================= */
  const settingsHtml = () => `<div class="inline-drawer" id="ee-settings">
      <div class="inline-drawer-toggle inline-drawer-header"><b>🎭 Expression Extractor · 표정 추출기</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
      <div class="inline-drawer-content">${settingsInner()}</div></div>`;
  function settingsInner() {
    return `        <div class="ee-set">
          <label>Language / 언어 <select data-k="lang" class="text_pole"><option value="auto">Auto / 자동</option><option value="ko">한국어</option><option value="en">English</option></select></label>
          <label class="checkbox_label"><input type="checkbox" data-k="enabled"><span>${tl("표정 추출기 사용 (끄면 마법봉 메뉴에서 사라져요)")}</span></label>
          <div class="ee-setrow"><div class="menu_button" id="ee-open">${tl("표정 추출기 열기")}</div><div class="menu_button" id="ee-import" title="${tl("API 키, 텍스트 모델 프로필, 화풍 프리셋, 제외 요소, 외형 태그를 가져와요")}">${tl("Scene Studio 설정 가져오기")}</div></div>
          <label>${tl("이미지 모델")} <input type="text" data-k="geminiModel" class="text_pole" list="ee-models" placeholder="${DEFAULT_MODEL}"></label>
          <datalist id="ee-models"><option value="gemini-3.1-flash-image"><option value="gemini-3-pro-image"><option value="gemini-2.5-flash-image"></datalist>
          <div class="ee-setrow"><div class="menu_button" id="ee-model-reset">${tl("기본 모델로 ({0})",[DEFAULT_MODEL])}</div></div>
          <label>${tl("텍스트 모델 (외형 추출용 연결 프로필)")}
            <select id="ee-profile" class="text_pole"></select></label>
          <small id="ee-profile-hint"></small>
          <label>${tl("이미지 제공자")}
            <select class="text_pole" disabled><option>${tl("Agent Platform API (구 Vertex AI) 직접 · API 키 전용")}</option></select></label>
          <label>${tl("API 키")} <input type="password" data-k="geminiKey" class="text_pole" autocomplete="off" placeholder="${tl("Google Cloud API 키")}"></label>
          <div class="ee-setrow"><div class="menu_button" id="ee-test">${tl("연결 테스트")}</div></div>
          <small>${tl("이미지 요청 간격, 배경 제거, 가장자리 조절은 표정 추출기 창의")} <b>${tl("설정")}</b> ${tl("탭에, 호출 내역은")} <b>${tl("기록")}</b> ${tl("탭에 있어요. 키는 SillyTavern settings.json에 평문으로 저장돼요.")}</small>
        </div>`;
  }
  /* ST 테마 CSS가 버튼 폭을 min-content로 줄여 글자가 세로로 쌓이는 문제 방지 (장면 생성기와 같은 처리) */
  function fixButtons() {
    document.querySelectorAll('#ee-settings .menu_button').forEach((b) => {
      for (const [k, v] of [['width', 'auto'], ['min-width', 'max-content'], ['white-space', 'nowrap'], ['flex', '0 0 auto'], ['flex-direction', 'row'], ['word-break', 'keep-all'], ['writing-mode', 'horizontal-tb'], ['align-self', 'flex-start']]) b.style.setProperty(k, v, 'important');
    });
  }
  function renderProfiles() {
    const sel = $('#ee-profile'), hint = $('#ee-profile-hint'); if (!sel) return;
    const list = profileList();
    sel.innerHTML = `<option value="">${tl("채팅에 연결된 모델 그대로 사용")}</option>` + list.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}${p.model ? ` — ${esc(p.model)}` : ''}</option>`).join('');
    sel.value = list.some((p) => p.id === S().llmProfile) ? S().llmProfile : '';
    hint.innerHTML = list.length
      ? tl("외형 추출(텍스트 호출 1회)에 쓸 모델이에요. Flash 같은 저렴한 프로필을 고르면 채팅 내용을 보내지 않고 카드 설명만 보내요. 비워 두면 지금 채팅에 연결된 모델을 써요.")
      : `${tl("연결 프로필 목록을 찾지 못했어요. SillyTavern의")} <b>Connection Manager</b> ${tl("확장을 켜고 프로필을 만들면 여기서 고를 수 있어요. 지금은 채팅에 연결된 모델을 써요.")}`;
  }
  function syncDrawer() {
    const el = document.getElementById('ee-settings'); if (!el) return;
    const s = S();
    el.querySelectorAll('[data-k]').forEach((i) => { const v = s[i.dataset.k]; if (i.type === 'checkbox') i.checked = !!v; else i.value = v ?? ''; });
    renderProfiles();
  }
  function bindSettings() {
    const el = document.getElementById('ee-settings');
    syncDrawer(); fixButtons();
    el.querySelectorAll('[data-k]').forEach((i) => {
      const k = i.dataset.k;
      i.addEventListener('change', () => {
        S()[k] = i.type === 'checkbox' ? i.checked : i.value;
        if (k === 'geminiModel' && !S().geminiModel.trim()) S().geminiModel = DEFAULT_MODEL;
        save();
        if (k === 'enabled') applyEnabled();
        if (k === 'lang') relocalize();
      });
    });
    $('#ee-profile', el).addEventListener('change', (e) => { S().llmProfile = e.target.value; profWarned = false; save(); });
    $('#ee-profile', el).addEventListener('focus', renderProfiles);
    $('#ee-open', el).addEventListener('click', openModal);
    $('#ee-model-reset', el).addEventListener('click', () => { S().geminiModel = DEFAULT_MODEL; save(); syncDrawer(); say('success', tl("이미지 모델을 {0}로 되돌렸어요.",[DEFAULT_MODEL])); });
    $('#ee-test', el).addEventListener('click', testConnection);
    $('#ee-import', el).addEventListener('click', importFromSS);
  }
  /* 언어를 바꾸면 화면에 이미 그려진 글자도 바로 새 언어로 바꿔요 */
  function relocalize() {
    const box = document.querySelector('#ee-settings .inline-drawer-content');
    if (box) { box.innerHTML = settingsInner(); bindSettings(); }   // 머리글은 그대로라 열림/닫힘 상태가 유지돼요
    const mb = document.querySelector('#ee-menu-btn span'); if (mb) mb.textContent = tl("표정 추출기");
    if (ui.el) { ui.el.remove(); ui.el = null; if (st.msg) ui.status(st.msg, st.busy); }
    if (root) { const wasOpen = !root.classList.contains('ee-off'); closeEdge(); root.remove(); root = null; if (wasOpen) openModal(); }
  }
  function addMenuButton() {
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;
    if (document.getElementById('ee-menu-btn')) return true;
    const b = document.createElement('div');
    b.id = 'ee-menu-btn'; b.className = 'list-group-item flex-container flexGap5';
    b.innerHTML = `<div class="fa-solid fa-masks-theater extensionsMenuExtensionButton"></div><span>${tl("표정 추출기")}</span>`;
    b.addEventListener('click', openModal); menu.appendChild(b); return true;
  }
  /* "사용" 체크박스: 끄면 마법봉 메뉴 항목과 창이 사라지고, 켜면 다시 생겨요 */
  function applyEnabled() {
    const on = !!S().enabled;
    if (on) addMenuButton(); else { document.getElementById('ee-menu-btn')?.remove(); if (root) closeModal(); }
    document.getElementById('ee-open')?.classList.toggle('ee-disabled', !on);
  }

  function init() {
    const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (host && !document.getElementById('ee-settings')) { host.insertAdjacentHTML('beforeend', settingsHtml()); bindSettings(); }
    try { const c = ctx(); if (c.eventSource?.on && c.eventTypes?.CHAT_CHANGED) c.eventSource.on(c.eventTypes.CHAT_CHANGED, onChatChanged); } catch (e) { console.warn('[EE] 캐릭터 변경 감지 실패', e); }
    applyEnabled();
    if (S().enabled) { let tries = 0; const t = setInterval(() => { if (addMenuButton() || ++tries > 20) clearInterval(t); }, 500); }
  }
  if (window.jQuery) window.jQuery(init);
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
