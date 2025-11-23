---
title: 'cf workers의 경로와 NFD, NFC 문제'
pubDate: '2025-11-23'
tags:
  - 'cloud'
  - 'unicode'
  - 'front'
  - 'TIL'
---
블로그를 만들던중 local에서는 잘 보이는 경로가 이상하게 배포만 하면은 404에러가 발생하는 문제가 있었다.

처음에는 전혀 방법을 못찾았다가. ai와 함께 조사를 해보니 
mac에서 한글을 utf-8로 구성하는 방식와 윈도우와 리눅스에서 하는 방식이 달랐다고 한다.
자세한 내용들은 https://ko.wikipedia.org/wiki/%EC%9C%A0%EB%8B%88%EC%BD%94%EB%93%9C_%EB%93%B1%EA%B0%80%EC%84%B1 
https://wormwlrm.github.io/2024/12/30/String-Normalize.html
들을 살펴보면 알 수 있다.

즉 문제는 mac은 NDF를 쓰고, 실제 cf로 배포가 되면 NFC로 한글을 받아드리는데 문제는
내가 로컬에서 저장된 제목이 한글인 파일들은 별다른 처리를 하지 않았기 때문에 실제로 배포만 되면은 해당 파일을 찾을 수가 없었던 것 이다.
해서 https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/String/normalize 이걸 통해서 정규화를 `.normalize("NFC")` 를 해주면 깔끔 하게 해결 된다.