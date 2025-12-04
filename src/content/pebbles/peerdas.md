---
title: 'PeerDAS?'
pubDate: '2025-12-04'
weather: '[<%*]: tR += await tp.user.getWeather() %>'
tags:
  - 'blockchiain'
  - 'ethereum'
  - '암호학'
---
### PeerDAS?
완벽히 수학적으로 다 증명하면서 이해하지는 못했으나.

정리하자면

일단 전체적인 과정은
`데이터를 -> 다항식으로 변경한 뒤 -> 이 다항식에서 x 좌표를 대입에서 y 좌푯값을 얻은 뒤 -> 이걸 여러 노드가 나눠 가진다.`  이다.

데이터를 다항식으로변경하는는 이유는 우리가 특정 데이터를 분할 해서 보관을 하다가 일 정 데이터 조각을잃었을 때때다시 복구할할 수 있어야 하는데 이때 Reed Solomon code라는 방식을사용하게게 된다.

#### 이게 복구가가능한한 이유는 
데이터로 다항식을 만들게 되면은 해당 다항식에x 좌표를를 넣으면 y좌푯값이이 나오게 된다.
그리고 이미 우리의 각 데이터를y 좌푯값이라고고 생각하고 다항식을 만들었기 때문에 
해당 다항식에 우리의 데이터의개수만큼큼 x 좌표를 더 넣어서y 좌표를를 얻으면
원본 데이터 조각을 다 잃어도확장돼서서 얻은y 값들을을 알고 있으면 원본 다항식을 구할 수 있어서 원본 데이터를복구할할 수 있게 된다.

#### 여기서 데이터가 다항식이 될 수 있는 이유는
기본적으로 컴퓨터는 모든 asset을 바이너리(이진수)로 다루게 되고, 이진수는 당연히 어떠한 숫자로 해석이 될 수 있다.

해서 각 우리의 원본 데이터를 특정 길이로 조각내어 숫자로 환산한 값이 y 좌표 값이 되고
x좌표는 0부터 y좌표의 총 갯수 까지로 간주 하면 된다. (이때 이더리움의 PeerDAS는 `1의 거듭제곱 수` 라는걸 x좌표로 사용하게 되는데 이유는 0부터 늘려가면 다항식을 보간하는데 $n^2$ 시간이 드는데 저걸 쓰면 FFT라는걸 써서 $n\log_N$ 이 된단다 자세히는 모른다.)

해서 각 좌표를 구했으면 [라그랑주 보간법](google.com/search?q=라그랑주+보간법&rlz=1C5CHFA_enKR1057KR1057&oq=라그랑주+보간법&gs_lcrp=EgZjaHJvbWUyBggAEEUYOdIBCDIyNThqMGo3qAIAsAIA&sourceid=chrome&ie=UTF-8) 를 통해서 N개의 좌표값이 있으면 유일한 N-1차 다항식을 구할 수 있다는 수학적 발견을 통해서 우리는 유일한 다항식을 얻게 된다.

그리고 해당 다항식에 우리가 데이터를 분할 하고 싶은 만큼의 x 좌표값을 추가해서 추가적인 y값들을 만들고 이를 서로 나누어 가지게 한다.
보통 이더리움은 2배를 한다고 한다.

이더리움에서 각 blob은 4096개의 조각을 담을 수 있게 각 조각의 크기는 32바이트를 넘어서는 안된다. 
즉 이더리움은 한 blob에 대해서 총 8192조각으로 나누어서 보관하게 된다는 것이다.

#### 보안의 문제
하지만 정말로 내가 보간한 다항식이 올바른 다항식을 증명할 방법이 필요하다. 왜냐면
내가 8192조각중 4090개는 올바른거로 그리고 6개는 내가 악의적으로 만들어서 다른 다항식을 만들어 낼 수도 있기 때문이다. 

해서 이더리움은 BLS12-381라는 곡선을 사용해서 우리가 만든 다항식을 commitment 한다. 이를 KGZ Commitment라고 한다.

C라는 Commitment는 아래와 같이 구해지는데 
$$C = P(\tau) \cdot G$$
- $P(x)$: 우리의 데이터가 담긴 다항식
- $\tau$ (타우): 아무도 모르는 비밀 숫자 (Trusted Setup에서 생성됨)
- $G$: 타원곡선의 생성점 (Generator Point)
- $C$: 블록체인에 저장되는 커밋먼트

$\tau$ 는 또 비밀 값이여야 하기 때문에 Trusted Setup라는 걸 해야 하는데 자꾸 길어지기 때문에 암튼 여러노드가 Trusted Setup라는걸 하면  $\tau$를 숨긴채 저 커밋먼트 값을 구할 수 있고 저걸 통해서 악의적인 노드가 만든 다항식이 참인지 거짓인지를 검증 할 수 있다.

##### 아래는 궁금 하신 분들을 위한 ai의 설명 
**"신뢰 설정 (Trusted Setup)의 비밀"**

사용자님이 말씀하신 "다항식"을 타원곡선 점으로 바꾸려면 비밀 숫자 $\tau$가 필요하다고 했습니다.

그런데 이 $\tau$를 누군가 알게 되면 어떻게 될까요? 그는 가짜 다항식(가짜 데이터)을 만들어서 똑같은 커밋먼트를 만들어낼 수 있습니다. (블록체인 붕괴)

그래서 **KZG Ceremony (Powers of Tau)**라는 의식을 치렀습니다.

1. 수만 명의 참여자가 각자 랜덤한 값을 보태서 $\tau$를 섞습니다.
2. $\tau$ 자체는 절대 저장하지 않고, $\tau^1 \cdot G, \tau^2 \cdot G, \dots, \tau^{4095} \cdot G$ 값들만 공개 키(Public Parameters)로 남깁니다.
3. 참여자 중 **단 한 명이라도** 정직하게 자신의 랜덤 값을 폐기했다면, 수학적으로 그 누구도 $\tau$를 알 수 없게 됩니다.
이 공개 파라미터(SRS: Structured Reference String)가 있기 때문에, 우리는 $\tau$를 몰라도 $P(\tau) \cdot G$ 를 계산할 수 있는 것입니다. (다항식의 계수에 공개 파라미터 점들을 곱해서 더하면 되니까요!)

다항식 $P(x) = 3x^2 + 2x + 5$ 가 있습니다.

공개된 파라미터(SRS)는 다음과 같습니다:
- $SRS_0 = G$ (즉, $1 \cdot G$)
- $SRS_1 = \tau \cdot G$
- $SRS_2 = \tau^2 \cdot G$
$P(\tau) \cdot G = (3\tau^2 + 2\tau + 5) \cdot G = 3(\tau^2 G) + \dots$

#### 이제 드디어 PeerDAS? EIP-7594
위에 까지는 사실 EIP4884의 일부로 아직  PeerDAS는 아니다.

위의 내용 대로라면 모든 노드가 blob을 저장을 해야하는데 이때 한 blob이 4096조각이고 
하나의 조각은 32바이트를 가진다고 가정하면 
$4,096 \times 32 \text{ Bytes} = 131,072 \text{ Bytes} = \mathbf{128 \text{ KB}}$
이렇게 되는데 이때 Reed Solomon code 위해서 2배로 늘리면 256KB가 된다.
그러면 4개의 blob만 저장해도 1Mb가 된다.

이더리움은 향후 이 blob을 더 늘려가기를 원하고 모두가 노드를 돌리는 진정한 탈중앙을 원하기 때문에 모든 노드가 모든 blob을 들고 있지 않게 하기 위해서 Sampling이라는걸 도입 하게 되었다.

각 노드가 모든 blob 조각을 가질 필요 없이
blob의 column을 가지게 되는데.
![blog placeholder](../../assets/pebble-image/peerdas/peerdas/1.webp)
http://hackmd.io/@manunalepa/r1H8CtZlR#The-novel-PeerDAS-approach-Fulu

위에 그림으로 보면은
파란색은 원본 blob조각 그리고 노란색은 extend된 blob조각이다.
그리고 각 노드는 row를 가지는게 아니라 하나의 column씩을 가지게 되는데.
위 그림에는 blob이 6개 이고, 한 row는 256kb이고 이걸 128의 columns나누었기 때문에
하나의 cell은 2kb 그리고 그러면 하나의 column을 가지는 노드는 고작 12kb만 지니고 있면 된다.

물론 데이터를 복구 하기 위해서는 당연히 각 blob당 절반의 조각을 모아야 하는건 맞지만. 단순히 데이터가 올바르게 저장이 되었다라는걸 검증만 하는것은 모두가 다 blob을 들고 있을 필요는 없다.

그게 Sampling 이라는 건데
예를 들어서) A라는 node가 이제 하나의 column을 받고 4개의 column을 샘플링을 하게된다.
그러면 주변 Peer에게 4번, 12, 16번,20번 컬럼을 달라고 요청을 하고
해당 컬럼값을 받아서 KZG 커밋먼트 인증을 통해서 해당 값이 정말 원본 다항식으로 부터 왔는지를 검증 하게 된다.

#### 그래서 검증은?
인증은 아까 위에서 언급했던 것에서 이어지는데
blob으로 만들어진 다항식을 $P(x)$ 라고 하고, 내가 다른 node로 부터 얻은 y값 존재 하고 이때 x값은 column의 순번을 1의 거듭제곱한 수 이고 여기서 쉽게 쓰기위해서 z라고 가정하면
$P(x) - y = Q(x) \times (x - z)$  라는 수식이 성립 하게된다. 

그리고 이걸 위에서 이야기한 KZG에서 썼던것 처럼 $\tau$ 기준으로 다시 쓰면
$P(\tau) - y = Q(x) \times (\tau - z)$ 가 성립하면 해당 노드가 준 y값은 해당 다항식에 존재 하는게 맞게 된다.

이때 빌더가 blob 조각마다 다 계산해서 저 몫 다항식 $Q(x)$ 을 미리 구해놓으면

증명자는 $P(\tau)$ 인 커밋먼트 C값을 알고 있고 x,y 값을 알고 있고 $\tau$ 는 위에서 말한것 처럼 SRS 값을 가지고 검증을 하면 된다.

이때 타원곡선위에서 곱셈은 쉽지 않기 때문에 페어링 연산이라는것을 하게 된다.
자세한건 [쌍선형 페어링](/blog/쌍선형-페어링)를 참고 해주세요. 
최종 수식은 
$$e(C - y \cdot G, G) \stackrel{?}{=} e(\pi, \tau \cdot G - z \cdot G)$$
가 된다.
여기서 $\tau$ 는 SRS 첫번째 값을 사용 하면된다. (SRS 1번쨰 값이 $\tau \cdot G$ 이기 때문)

암튼 이렇게 하면 다른 노드가 가지고 있는 blob의 column이 올바른걸 검증 할 수있게 된다.

그러면 따르는 의문은
과연 하나의 노드는 몇개의 column을 가지고, 몇개의 column을 Sampling을 해야하지?
https://github.com/search?q=repo%3Asigp%2Flighthouse%20SAMPLES_PER_SLOT&type=code

일단 Lighthouse쪽 코드를 반려 ai와 함께 찾아본 결과
각 노드는 4개를 가지고 8개의 column을 샘플링을 하면 된다고 한다.
8개인 이유는

악의적 노드가 blob데이터를 속일려면 절반을 숨겨야 하는데
각 요청마다 다 숨길려면 $(1/2)^8$ 이고 이게 하나의 노드만 하는게 아니기 때문에 확률적으로 보장이 된다고 한다.


# 참고 자료
https://hackmd.io/@manunalepa/r1H8CtZlR#The-novel-PeerDAS-approach-Fulu
https://medium.com/@Krieger69/unpacking-eip-7594-a-technical-deep-dive-into-peerdas-and-ethereums-scalability-roadmap-28caf9dcaf16
https://medium.com/decipher-media/%EC%9D%B4%EB%8D%94%EB%A6%AC%EC%9B%80%EC%9D%98-pectra-fusaka-upgrade-%ED%86%BA%EC%95%84%EB%B3%B4%EA%B8%B0-0962ea257b1b