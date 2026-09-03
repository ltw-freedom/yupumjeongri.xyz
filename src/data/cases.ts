import type { ImageMetadata } from 'astro';

/**
 * 실제 진행 현장 사진.
 *
 * 원본은 구글 드라이브(현장별 폴더)에 있고, 여기 쓰는 파일은 scripts 없이
 * 수동으로 골라 src/assets/cases/ 에 넣은 가공본이다(긴 변 1600px, EXIF·위치정보
 * 제거, 차량 번호판 블러). 새 사진을 추가할 때도 같은 기준을 지킬 것:
 *  - 고인이나 유가족이 특정될 수 있는 사진·서류·손글씨가 찍힌 컷은 쓰지 않는다
 *  - 체액·오염이 직접 드러나는 컷은 쓰지 않는다 (고독사 현장은 작업자 위주로)
 *  - 지역은 시·군·구(필요하면 동)까지만 적고 단지명·호수는 적지 않는다
 */

import heroLadderTruck from '../assets/cases/hero-ladder-truck.jpg';
import teamLoadingTruck from '../assets/cases/team-loading-truck.jpg';
import teamCrate from '../assets/cases/team-crate.jpg';
import balconyHighrise from '../assets/cases/balcony-highrise.jpg';
import loadingBagsSunny from '../assets/cases/loading-bags-sunny.jpg';
import ppeHallway from '../assets/cases/ppe-hallway.jpg';
import sortedBagsGuitar from '../assets/cases/sorted-bags-guitar.jpg';
import bagsVolume from '../assets/cases/bags-volume.jpg';
import livingBefore from '../assets/cases/living-before.jpg';
import curtainRail from '../assets/cases/curtain-rail.jpg';
import roomBeforeBed from '../assets/cases/room-before-bed.jpg';

import gangdongKitchenBefore from '../assets/cases/gangdong-kitchen-before.jpg';
import gangdongKitchenAfter from '../assets/cases/gangdong-kitchen-after.jpg';
import jungnangRoomBefore from '../assets/cases/jungnang-room-before.jpg';
import jungnangRoomAfter from '../assets/cases/jungnang-room-after.jpg';
import songpaLivingBefore from '../assets/cases/songpa-living-before.jpg';
import songpaLivingAfter from '../assets/cases/songpa-living-after.jpg';
import gwangjuKitchenBefore from '../assets/cases/gwangju-kitchen-before.jpg';
import gwangjuKitchenAfter from '../assets/cases/gwangju-kitchen-after.jpg';
import gwangjinSinkBefore from '../assets/cases/gwangjin-sink-before.jpg';
import gwangjinSinkAfter from '../assets/cases/gwangjin-sink-after.jpg';
import gwangjuRoomBefore from '../assets/cases/gwangju-room-before.jpg';
import gwangjuRoomAfter from '../assets/cases/gwangju-room-after.jpg';

export type Photo = {
  src: ImageMetadata;
  /** 화면 낭독기·검색용 설명. 무엇이 찍혔는지 사실대로 */
  alt: string;
  /** 사진 아래 짧은 캡션 (작업 내용 · 지역) */
  caption?: string;
};

/** 단독으로 쓰는 현장 사진 — 히어로, 사진 띠, 서비스 페이지 */
export const photos = {
  heroLadderTruck: {
    src: heroLadderTruck,
    alt: '아파트 동 앞에 사다리차를 세우고 고층 반출을 준비하는 모습',
    caption: '사다리차 반출 · 도봉구 아파트',
  },
  teamLoadingTruck: {
    src: teamLoadingTruck,
    alt: '작업자 두 명이 골목에 세운 트럭에 가구를 싣는 모습',
    caption: '가구 반출 · 중랑구 면목동 주택',
  },
  teamCrate: {
    src: teamCrate,
    alt: '마스크를 쓴 작업자들이 분류한 물품을 상자에 담아 트럭에 싣는 모습',
    caption: '분류 물품 상차 · 성남 중원구',
  },
  balconyHighrise: {
    src: balconyHighrise,
    alt: '고층 아파트 발코니에서 반출 동선을 확인하는 작업자',
    caption: '고층 반출 동선 확인 · 남양주 임대주택',
  },
  loadingBagsSunny: {
    src: loadingBagsSunny,
    alt: '맑은 날 아파트 앞에서 작업자가 마대를 트럭에 싣는 모습',
    caption: '마대 상차 · 도봉구 아파트',
  },
  ppeHallway: {
    src: ppeHallway,
    alt: '방호복을 입은 작업자들이 아파트 복도로 마대를 옮기는 모습',
    caption: '특수청소 반출 · 노원구 아파트',
  },
  sortedBagsGuitar: {
    src: sortedBagsGuitar,
    alt: '분류를 마친 마대들 사이에 따로 세워 둔 기타',
    caption: '보관품 선별 · 남양주 임대주택',
  },
  bagsVolume: {
    src: bagsVolume,
    alt: '방 안 가득 모아 둔 반출 대기 마대',
    caption: '반출 대기 · 동작구 흑석동',
  },
  livingBefore: {
    src: livingBefore,
    alt: '정리 전 거실. 소파와 운동기구, 텔레비전이 그대로 남아 있다',
    caption: '현장 확인 · 하남 덕풍동 아파트',
  },
  curtainRail: {
    src: curtainRail,
    alt: '전동 드릴로 커튼 레일을 철거하는 작업자',
    caption: '부속물 철거 · 강남구 아파트',
  },
  roomBeforeBed: {
    src: roomBeforeBed,
    alt: '정리 전 방. 침대와 장롱, 서랍장이 남아 있다',
    caption: '정리 전 · 강동구 명일동 주택',
  },
  kitchenAfter: {
    src: gwangjinSinkAfter,
    alt: '특수청소를 마친 흰색 주방에서 마무리 닦기를 하는 작업자',
    caption: '청소 마무리 · 광진구 아파트',
  },
} satisfies Record<string, Photo>;

export type CaseStudy = {
  slug: string;
  region: 'seoul' | 'gyeonggi';
  /** /area/{region}/{city}/ 의 city slug — 지역 페이지에서 같은 지역 사례를 먼저 보여준다 */
  city: string;
  /** 표기용 지역명 (시·군·구, 필요하면 동까지) */
  area: string;
  service: 'yupumjeongri' | 'godoksa-yupumjeongri' | 'binjip-jeongri';
  type: string;
  housing: string;
  scene: string;
  /** YYYY.MM — 일 단위는 적지 않는다 */
  date: string;
  note: string;
  before: ImageMetadata;
  after: ImageMetadata;
};

export const cases: CaseStudy[] = [
  {
    slug: 'gangdong-myeongil-kitchen',
    region: 'seoul',
    city: 'gangdong',
    area: '서울 강동구 명일동',
    service: 'yupumjeongri',
    type: '유품정리',
    housing: '단독주택',
    scene: '주방',
    date: '2026.08',
    note: '그릇·식재료·소형 가전을 분류해 반출하고, 싱크대와 바닥까지 닦아 마무리했습니다.',
    before: gangdongKitchenBefore,
    after: gangdongKitchenAfter,
  },
  {
    slug: 'jungnang-myeonmok-room',
    region: 'seoul',
    city: 'jungnang',
    area: '서울 중랑구 면목동',
    service: 'yupumjeongri',
    type: '유품정리',
    housing: '다세대주택',
    scene: '방',
    date: '2026.08',
    note: '짐을 모두 반출한 뒤 곰팡이가 번진 벽면을 닦아내고 바닥을 정돈했습니다.',
    before: jungnangRoomBefore,
    after: jungnangRoomAfter,
  },
  {
    slug: 'songpa-living',
    region: 'seoul',
    city: 'songpa',
    area: '서울 송파구',
    service: 'yupumjeongri',
    type: '유품정리',
    housing: '아파트',
    scene: '거실',
    date: '2026.08',
    note: '가구와 가전을 반출하고 다음 입주 절차를 바로 진행할 수 있는 상태로 비웠습니다.',
    before: songpaLivingBefore,
    after: songpaLivingAfter,
  },
  {
    slug: 'gwangju-kitchen',
    region: 'gyeonggi',
    city: 'gwangju',
    area: '경기 광주시',
    service: 'binjip-jeongri',
    type: '쓰레기집 정리',
    housing: '아파트',
    scene: '주방',
    date: '2026.08',
    note: '쌓인 생활 쓰레기를 먼저 반출하고, 주방 상판과 수납장 안까지 닦아냈습니다.',
    before: gwangjuKitchenBefore,
    after: gwangjuKitchenAfter,
  },
  {
    slug: 'gwangjin-sink',
    region: 'seoul',
    city: 'gwangjin',
    area: '서울 광진구',
    service: 'binjip-jeongri',
    type: '특수청소',
    housing: '아파트',
    scene: '주방',
    date: '2026.08',
    note: '오염이 굳은 싱크대와 상판을 약품으로 불려 벗겨내고 소독까지 마쳤습니다.',
    before: gwangjinSinkBefore,
    after: gwangjinSinkAfter,
  },
  {
    slug: 'gwangju-room',
    region: 'gyeonggi',
    city: 'gwangju',
    area: '경기 광주시',
    service: 'binjip-jeongri',
    type: '쓰레기집 정리',
    housing: '아파트',
    scene: '방',
    date: '2026.08',
    note: '방 하나를 채운 짐과 폐기물을 종류별로 나눠 반출하고 바닥을 비웠습니다.',
    before: gwangjuRoomBefore,
    after: gwangjuRoomAfter,
  },
];

/**
 * 지역 페이지용 — 같은 시·군·구 사례를 앞에, 그다음 같은 광역, 그다음 나머지.
 * 항상 limit 개를 채워서 돌려준다 (사례가 없는 지역도 빈 칸을 남기지 않는다).
 */
export function casesFor(region: string, city: string | undefined, limit = 2): CaseStudy[] {
  const rank = (c: CaseStudy) => (city && c.city === city ? 0 : c.region === region ? 1 : 2);
  return [...cases].sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}

export function casesByService(service: CaseStudy['service'], limit = 2): CaseStudy[] {
  const rank = (c: CaseStudy) => (c.service === service ? 0 : 1);
  return [...cases].sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}
