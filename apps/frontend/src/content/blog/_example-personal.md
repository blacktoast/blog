---
title: "예시 — Personal 전용 글"
description: "이 글은 personal 빌드에서만 노출됩니다. main 빌드에서는 슬러그·OG·RSS·sitemap 어디에도 등장하지 않습니다."
pubDate: 2026-04-29
tags: [personal]
---

이 글은 frontmatter `tags: [personal]`가 들어 있어서 **개인용 빌드에서만 보입니다**.

## 어떻게 동작하나요?

`PUBLIC_TYPE` 환경변수를 기준으로 라우팅 단계에서 필터됩니다.

- `PUBLIC_TYPE=main` (공개 사이트) → 이 글의 슬러그 페이지가 빌드되지 않고, blog 리스트·RSS·sitemap·OG 이미지 모두 0건.
- `PUBLIC_TYPE=personal` (개인 사이트) → 평소 글과 동일하게 모든 표면에 노출.

## 작성 규칙

```yaml
tags: [personal]
```

`PERSONAL_TAGS` 상수(`apps/frontend/src/constants.ts`)에 등록된 태그가 하나라도 frontmatter `tags`에 포함되면 main 빌드에서 제외됩니다. 다른 일반 태그와 같이 써도 됩니다 — 예: `tags: [personal, "독서"]`.

## 다른 태그는?

`personal` 외 태그(`독서`, `회고` 등)는 그대로 공개됩니다. 같은 글에 둘이 공존해도 personal이 하나라도 있으면 비공개입니다.

이 파일은 예시이므로 검증이 끝나면 삭제하셔도 됩니다.
