/**
 * 시·군·구별 공공 통계 — 시군구 페이지의 '주택·가구 통계' 블록(cityStatsContent.ts)이 쓴다.
 *
 * 왜 있나: 56개 시군구 페이지가 네이버에서 유사문서로 묶였다(docs/seo-naver.md 4-2·4-4·4-5).
 * 지어낸 지역 정보는 금지이므로, 지역마다 실제로 다른 본문은 출처가 있는 숫자로만 만든다.
 *
 * 출처: 국가데이터처(구 통계청) KOSIS, 2025 인구주택총조사(등록센서스), 기준 시점 2025-11-01, 자료갱신 2026-08-04.
 *  - housing    주택의 종류별 주택 (DT_1JU1501) — 단위 호. 다가구주택은 건물 1동을 1호로 센다.
 *  - households 가구주의 연령 및 가구원수별 가구(일반가구) (DT_1JC1511) — 단위 가구.
 *               onePerson65 = 1인 가구 중 가구주 65~69·70~74·75~79·80~84·85세 이상의 합.
 *  - vacant     건축연도 및 주택의 종류별 미거주 주택(빈집) (DT_1JU1512) — 단위 호, 건축연도 '계'.
 *
 * 숫자를 고치거나 다음 연도로 바꿀 때는 KOSIS 에서 같은 표·같은 항목을 다시 받아 통째로 바꿀 것.
 * 손으로 추정한 값을 섞지 않는다.
 */

export const cityStatsSource = {
  org: '국가데이터처(통계청)',
  survey: '2025 인구주택총조사',
  asOf: '2025년 11월 1일',
  updated: '2026년 8월',
  tables: [
    { id: 'DT_1JU1501', name: '주택의 종류별 주택' },
    { id: 'DT_1JC1511', name: '가구주의 연령 및 가구원수별 가구' },
    { id: 'DT_1JU1512', name: '미거주 주택(빈집)' },
  ],
  url: 'https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1JU1501',
} as const;

export type CityStats = {
  housing: {
    total: number;
    apartment: number;
    multiplex: number;
    rowhouse: number;
    /** 단독주택 중 일반 단독 */
    detachedGeneral: number;
    /** 단독주택 중 다가구 (건물 1동 = 1호) */
    multiHousehold: number;
    /** 단독주택 중 영업겸용 */
    detachedCommercial: number;
    /** 비주거용 건물 내 주택 */
    nonResidential: number;
  };
  households: { total: number; onePerson: number; onePerson65: number };
  vacant: { total: number; apartment: number; detached: number; multiplex: number };
};

export const cityStats: Record<string, CityStats> = {
  jongno: {
    housing: { total: 47214, apartment: 16430, multiplex: 12893, rowhouse: 5514, detachedGeneral: 6314, multiHousehold: 3644, detachedCommercial: 1567, nonResidential: 852 },
    households: { total: 65131, onePerson: 30684, onePerson65: 6560 },
    vacant: { total: 2416, apartment: 784, detached: 338, multiplex: 861 },
  },
  jung: {
    housing: { total: 44722, apartment: 28595, multiplex: 7787, rowhouse: 1840, detachedGeneral: 2222, multiHousehold: 2243, detachedCommercial: 1201, nonResidential: 834 },
    households: { total: 59346, onePerson: 29148, onePerson65: 6445 },
    vacant: { total: 2817, apartment: 1905, detached: 332, multiplex: 340 },
  },
  yongsan: {
    housing: { total: 78493, apartment: 40580, multiplex: 20104, rowhouse: 3984, detachedGeneral: 4793, multiHousehold: 6747, detachedCommercial: 1621, nonResidential: 664 },
    households: { total: 93448, onePerson: 40988, onePerson65: 7757 },
    vacant: { total: 7846, apartment: 3147, detached: 1884, multiplex: 2049 },
  },
  seongdong: {
    housing: { total: 93729, apartment: 70657, multiplex: 10954, rowhouse: 1884, detachedGeneral: 1809, multiHousehold: 5799, detachedCommercial: 1666, nonResidential: 960 },
    households: { total: 123336, onePerson: 48664, onePerson65: 10122 },
    vacant: { total: 2937, apartment: 1967, detached: 102, multiplex: 660 },
  },
  gwangjin: {
    housing: { total: 97994, apartment: 37426, multiplex: 40322, rowhouse: 4181, detachedGeneral: 838, multiHousehold: 10883, detachedCommercial: 2958, nonResidential: 1386 },
    households: { total: 160750, onePerson: 75319, onePerson65: 12143 },
    vacant: { total: 1921, apartment: 698, detached: 15, multiplex: 979 },
  },
  dongdaemun: {
    housing: { total: 116994, apartment: 78425, multiplex: 17919, rowhouse: 3381, detachedGeneral: 3957, multiHousehold: 9105, detachedCommercial: 2725, nonResidential: 1482 },
    households: { total: 163744, onePerson: 73639, onePerson65: 15351 },
    vacant: { total: 5041, apartment: 2844, detached: 728, multiplex: 1117 },
  },
  jungnang: {
    housing: { total: 123361, apartment: 63078, multiplex: 36977, rowhouse: 4216, detachedGeneral: 1868, multiHousehold: 12442, detachedCommercial: 3303, nonResidential: 1477 },
    households: { total: 174596, onePerson: 71249, onePerson65: 20546 },
    vacant: { total: 3586, apartment: 2262, detached: 31, multiplex: 1067 },
  },
  seongbuk: {
    housing: { total: 147191, apartment: 87995, multiplex: 30971, rowhouse: 6433, detachedGeneral: 8784, multiHousehold: 8766, detachedCommercial: 2899, nonResidential: 1343 },
    households: { total: 186466, onePerson: 71799, onePerson65: 16962 },
    vacant: { total: 4593, apartment: 1872, detached: 946, multiplex: 1386 },
  },
  gangbuk: {
    housing: { total: 102100, apartment: 38278, multiplex: 41158, rowhouse: 4990, detachedGeneral: 4810, multiHousehold: 9466, detachedCommercial: 2405, nonResidential: 993 },
    households: { total: 130411, onePerson: 54655, onePerson65: 18418 },
    vacant: { total: 5365, apartment: 1570, detached: 619, multiplex: 2666 },
  },
  dobong: {
    housing: { total: 110066, apartment: 66092, multiplex: 30811, rowhouse: 4240, detachedGeneral: 1405, multiHousehold: 5222, detachedCommercial: 1588, nonResidential: 708 },
    households: { total: 130122, onePerson: 44448, onePerson65: 16391 },
    vacant: { total: 4460, apartment: 2137, detached: 58, multiplex: 1982 },
  },
  nowon: {
    housing: { total: 193185, apartment: 167810, multiplex: 15465, rowhouse: 3588, detachedGeneral: 1445, multiHousehold: 3079, detachedCommercial: 1127, nonResidential: 671 },
    households: { total: 205025, onePerson: 68464, onePerson65: 25155 },
    vacant: { total: 8963, apartment: 7615, detached: 67, multiplex: 1049 },
  },
  eunpyeong: {
    housing: { total: 165146, apartment: 74168, multiplex: 71098, rowhouse: 5512, detachedGeneral: 3617, multiHousehold: 7284, detachedCommercial: 2269, nonResidential: 1198 },
    households: { total: 198997, onePerson: 71796, onePerson65: 20803 },
    vacant: { total: 7044, apartment: 2096, detached: 370, multiplex: 4014 },
  },
  seodaemun: {
    housing: { total: 107145, apartment: 60366, multiplex: 28776, rowhouse: 5379, detachedGeneral: 3115, multiHousehold: 6961, detachedCommercial: 1662, nonResidential: 886 },
    households: { total: 137778, onePerson: 57273, onePerson65: 12193 },
    vacant: { total: 4124, apartment: 1830, detached: 118, multiplex: 1696 },
  },
  mapo: {
    housing: { total: 130128, apartment: 77691, multiplex: 37566, rowhouse: 2972, detachedGeneral: 2526, multiHousehold: 5616, detachedCommercial: 2316, nonResidential: 1441 },
    households: { total: 167118, onePerson: 73242, onePerson65: 11626 },
    vacant: { total: 5318, apartment: 2392, detached: 100, multiplex: 2473 },
  },
  yangcheon: {
    housing: { total: 147727, apartment: 93082, multiplex: 42427, rowhouse: 3990, detachedGeneral: 640, multiHousehold: 5076, detachedCommercial: 1712, nonResidential: 800 },
    households: { total: 169089, onePerson: 49370, onePerson65: 16647 },
    vacant: { total: 5593, apartment: 2561, detached: 33, multiplex: 2705 },
  },
  gangseo: {
    housing: { total: 205470, apartment: 120533, multiplex: 69642, rowhouse: 4836, detachedGeneral: 1344, multiHousehold: 6113, detachedCommercial: 1942, nonResidential: 1060 },
    households: { total: 255799, onePerson: 108459, onePerson65: 24974 },
    vacant: { total: 12124, apartment: 5215, detached: 293, multiplex: 6144 },
  },
  guro: {
    housing: { total: 139827, apartment: 88243, multiplex: 32152, rowhouse: 7600, detachedGeneral: 1586, multiHousehold: 7710, detachedCommercial: 1729, nonResidential: 807 },
    households: { total: 172595, onePerson: 65153, onePerson65: 16733 },
    vacant: { total: 6575, apartment: 3163, detached: 52, multiplex: 2570 },
  },
  geumcheon: {
    housing: { total: 72909, apartment: 33150, multiplex: 26745, rowhouse: 4067, detachedGeneral: 372, multiHousehold: 6870, detachedCommercial: 1196, nonResidential: 509 },
    households: { total: 113400, onePerson: 55126, onePerson65: 11572 },
    vacant: { total: 2137, apartment: 832, detached: 37, multiplex: 984 },
  },
  yeongdeungpo: {
    housing: { total: 114728, apartment: 80998, multiplex: 17564, rowhouse: 1670, detachedGeneral: 1904, multiHousehold: 9250, detachedCommercial: 2248, nonResidential: 1094 },
    households: { total: 178380, onePerson: 81908, onePerson65: 14269 },
    vacant: { total: 2194, apartment: 1451, detached: 81, multiplex: 490 },
  },
  dongjak: {
    housing: { total: 121447, apartment: 69379, multiplex: 33820, rowhouse: 5016, detachedGeneral: 2022, multiHousehold: 8194, detachedCommercial: 2020, nonResidential: 996 },
    households: { total: 175902, onePerson: 78375, onePerson65: 13772 },
    vacant: { total: 1051, apartment: 265, detached: 167, multiplex: 445 },
  },
  gwanak: {
    housing: { total: 132634, apartment: 59322, multiplex: 44618, rowhouse: 6312, detachedGeneral: 3318, multiHousehold: 13680, detachedCommercial: 3461, nonResidential: 1923 },
    households: { total: 268074, onePerson: 158667, onePerson65: 20307 },
    vacant: { total: 1260, apartment: 487, detached: 165, multiplex: 519 },
  },
  seocho: {
    housing: { total: 137444, apartment: 98789, multiplex: 27575, rowhouse: 5227, detachedGeneral: 858, multiHousehold: 2921, detachedCommercial: 960, nonResidential: 1114 },
    households: { total: 161177, onePerson: 50435, onePerson65: 9943 },
    vacant: { total: 5776, apartment: 3797, detached: 25, multiplex: 1531 },
  },
  gangnam: {
    housing: { total: 192711, apartment: 146914, multiplex: 32873, rowhouse: 5476, detachedGeneral: 759, multiHousehold: 3877, detachedCommercial: 1305, nonResidential: 1507 },
    households: { total: 225873, onePerson: 79351, onePerson65: 15540 },
    vacant: { total: 10976, apartment: 5369, detached: 12, multiplex: 4944 },
  },
  songpa: {
    housing: { total: 223437, apartment: 137516, multiplex: 72209, rowhouse: 4825, detachedGeneral: 484, multiHousehold: 5147, detachedCommercial: 1832, nonResidential: 1424 },
    households: { total: 267887, onePerson: 91108, onePerson65: 19068 },
    vacant: { total: 6348, apartment: 2903, detached: 244, multiplex: 2850 },
  },
  gangdong: {
    housing: { total: 170045, apartment: 116258, multiplex: 40068, rowhouse: 3338, detachedGeneral: 521, multiHousehold: 6618, detachedCommercial: 2207, nonResidential: 1035 },
    households: { total: 209771, onePerson: 70590, onePerson65: 18767 },
    vacant: { total: 5825, apartment: 3846, detached: 9, multiplex: 1766 },
  },
  suwon: {
    housing: { total: 412930, apartment: 310343, multiplex: 60761, rowhouse: 9636, detachedGeneral: 5371, multiHousehold: 16249, detachedCommercial: 8178, nonResidential: 2392 },
    households: { total: 510479, onePerson: 186214, onePerson65: 38751 },
    vacant: { total: 16819, apartment: 10579, detached: 256, multiplex: 4994 },
  },
  seongnam: {
    housing: { total: 281902, apartment: 206151, multiplex: 33822, rowhouse: 11125, detachedGeneral: 2872, multiHousehold: 20676, detachedCommercial: 5847, nonResidential: 1409 },
    households: { total: 382964, onePerson: 135448, onePerson65: 35853 },
    vacant: { total: 9087, apartment: 7322, detached: 109, multiplex: 1167 },
  },
  uijeongbu: {
    housing: { total: 176228, apartment: 138391, multiplex: 22164, rowhouse: 2857, detachedGeneral: 3015, multiHousehold: 6104, detachedCommercial: 2696, nonResidential: 1001 },
    households: { total: 196898, onePerson: 65966, onePerson65: 21171 },
    vacant: { total: 9047, apartment: 6198, detached: 387, multiplex: 2001 },
  },
  anyang: {
    housing: { total: 197179, apartment: 153149, multiplex: 31448, rowhouse: 3196, detachedGeneral: 1086, multiHousehold: 4942, detachedCommercial: 2220, nonResidential: 1138 },
    households: { total: 227335, onePerson: 64523, onePerson65: 19306 },
    vacant: { total: 6653, apartment: 4132, detached: 13, multiplex: 2165 },
  },
  bucheon: {
    housing: { total: 282877, apartment: 169126, multiplex: 88832, rowhouse: 6724, detachedGeneral: 1966, multiHousehold: 9929, detachedCommercial: 3815, nonResidential: 2485 },
    households: { total: 321814, onePerson: 104884, onePerson65: 33007 },
    vacant: { total: 15940, apartment: 7186, detached: 152, multiplex: 7471 },
  },
  gwangmyeong: {
    housing: { total: 103584, apartment: 85763, multiplex: 13466, rowhouse: 735, detachedGeneral: 576, multiHousehold: 1873, detachedCommercial: 775, nonResidential: 396 },
    households: { total: 114276, onePerson: 30319, onePerson65: 10343 },
    vacant: { total: 2928, apartment: 2143, detached: 16, multiplex: 692 },
  },
  pyeongtaek: {
    housing: { total: 266249, apartment: 191682, multiplex: 31010, rowhouse: 7569, detachedGeneral: 20179, multiHousehold: 8001, detachedCommercial: 5724, nonResidential: 2084 },
    households: { total: 266997, onePerson: 100083, onePerson65: 19408 },
    vacant: { total: 36588, apartment: 23106, detached: 2192, multiplex: 8154 },
  },
  dongducheon: {
    housing: { total: 40994, apartment: 24095, multiplex: 7598, rowhouse: 2594, detachedGeneral: 4151, multiHousehold: 1192, detachedCommercial: 1009, nonResidential: 355 },
    households: { total: 39169, onePerson: 15255, onePerson65: 6473 },
    vacant: { total: 5501, apartment: 2444, detached: 558, multiplex: 1822 },
  },
  ansan: {
    housing: { total: 231354, apartment: 121854, multiplex: 84171, rowhouse: 8594, detachedGeneral: 4245, multiHousehold: 6350, detachedCommercial: 4751, nonResidential: 1389 },
    households: { total: 268000, onePerson: 97259, onePerson65: 22717 },
    vacant: { total: 14939, apartment: 4646, detached: 343, multiplex: 9302 },
  },
  goyang: {
    housing: { total: 359840, apartment: 286564, multiplex: 37982, rowhouse: 12576, detachedGeneral: 9342, multiHousehold: 6369, detachedCommercial: 5398, nonResidential: 1609 },
    households: { total: 431423, onePerson: 132693, onePerson65: 38668 },
    vacant: { total: 17042, apartment: 10203, detached: 259, multiplex: 5079 },
  },
  gwacheon: {
    housing: { total: 24646, apartment: 20333, multiplex: 2443, rowhouse: 184, detachedGeneral: 307, multiHousehold: 1053, detachedCommercial: 232, nonResidential: 94 },
    households: { total: 27111, onePerson: 4671, onePerson65: 1743 },
    vacant: { total: 3247, apartment: 3172, detached: 6, multiplex: 63 },
  },
  guri: {
    housing: { total: 60609, apartment: 48624, multiplex: 5217, rowhouse: 2050, detachedGeneral: 907, multiHousehold: 2250, detachedCommercial: 1140, nonResidential: 421 },
    households: { total: 75638, onePerson: 22895, onePerson65: 7065 },
    vacant: { total: 1208, apartment: 872, detached: 12, multiplex: 233 },
  },
  namyangju: {
    housing: { total: 267951, apartment: 210454, multiplex: 26647, rowhouse: 12205, detachedGeneral: 11242, multiHousehold: 2465, detachedCommercial: 3345, nonResidential: 1593 },
    households: { total: 282498, onePerson: 74161, onePerson65: 25474 },
    vacant: { total: 13878, apartment: 8845, detached: 721, multiplex: 2919 },
  },
  osan: {
    housing: { total: 96852, apartment: 80333, multiplex: 8865, rowhouse: 1803, detachedGeneral: 2142, multiHousehold: 1609, detachedCommercial: 1500, nonResidential: 600 },
    households: { total: 107981, onePerson: 40193, onePerson65: 7124 },
    vacant: { total: 6280, apartment: 3889, detached: 111, multiplex: 2020 },
  },
  siheung: {
    housing: { total: 197015, apartment: 159403, multiplex: 27011, rowhouse: 1785, detachedGeneral: 1448, multiHousehold: 3091, detachedCommercial: 2981, nonResidential: 1296 },
    households: { total: 214655, onePerson: 70346, onePerson65: 15457 },
    vacant: { total: 10351, apartment: 6814, detached: 15, multiplex: 3193 },
  },
  gunpo: {
    housing: { total: 92341, apartment: 74988, multiplex: 12170, rowhouse: 1247, detachedGeneral: 222, multiHousehold: 2021, detachedCommercial: 1252, nonResidential: 441 },
    households: { total: 104790, onePerson: 33306, onePerson65: 10568 },
    vacant: { total: 3922, apartment: 2654, detached: 10, multiplex: 1084 },
  },
  uiwang: {
    housing: { total: 60081, apartment: 50896, multiplex: 6292, rowhouse: 609, detachedGeneral: 864, multiHousehold: 661, detachedCommercial: 549, nonResidential: 210 },
    households: { total: 61774, onePerson: 15127, onePerson65: 4849 },
    vacant: { total: 4041, apartment: 2471, detached: 113, multiplex: 1306 },
  },
  hanam: {
    housing: { total: 101642, apartment: 91208, multiplex: 2399, rowhouse: 1428, detachedGeneral: 1017, multiHousehold: 3239, detachedCommercial: 1697, nonResidential: 654 },
    households: { total: 131208, onePerson: 40140, onePerson65: 9787 },
    vacant: { total: 2849, apartment: 2187, detached: 377, multiplex: 94 },
  },
  yongin: {
    housing: { total: 383236, apartment: 300283, multiplex: 37001, rowhouse: 11887, detachedGeneral: 23916, multiHousehold: 4606, detachedCommercial: 3753, nonResidential: 1790 },
    households: { total: 421152, onePerson: 114353, onePerson65: 29367 },
    vacant: { total: 15353, apartment: 8308, detached: 703, multiplex: 5076 },
  },
  paju: {
    housing: { total: 201002, apartment: 148686, multiplex: 20967, rowhouse: 4029, detachedGeneral: 20025, multiHousehold: 2938, detachedCommercial: 3027, nonResidential: 1330 },
    households: { total: 208758, onePerson: 61849, onePerson65: 17404 },
    vacant: { total: 14329, apartment: 9182, detached: 1044, multiplex: 3294 },
  },
  icheon: {
    housing: { total: 87013, apartment: 46234, multiplex: 12291, rowhouse: 3709, detachedGeneral: 19251, multiHousehold: 2682, detachedCommercial: 1553, nonResidential: 1293 },
    households: { total: 94578, onePerson: 33187, onePerson65: 8310 },
    vacant: { total: 7329, apartment: 3674, detached: 441, multiplex: 2344 },
  },
  anseong: {
    housing: { total: 88920, apartment: 58595, multiplex: 4798, rowhouse: 2746, detachedGeneral: 18689, multiHousehold: 1485, detachedCommercial: 1669, nonResidential: 938 },
    households: { total: 88746, onePerson: 33876, onePerson65: 9171 },
    vacant: { total: 9414, apartment: 6821, detached: 632, multiplex: 1240 },
  },
  gimpo: {
    housing: { total: 174631, apartment: 145119, multiplex: 9395, rowhouse: 5647, detachedGeneral: 10001, multiHousehold: 1087, detachedCommercial: 2450, nonResidential: 932 },
    households: { total: 191653, onePerson: 55522, onePerson65: 14898 },
    vacant: { total: 7210, apartment: 5043, detached: 272, multiplex: 1383 },
  },
  hwaseong: {
    housing: { total: 369907, apartment: 308301, multiplex: 19588, rowhouse: 6061, detachedGeneral: 24668, multiHousehold: 3146, detachedCommercial: 6141, nonResidential: 2002 },
    households: { total: 400047, onePerson: 128844, onePerson65: 21721 },
    vacant: { total: 23577, apartment: 18018, detached: 1065, multiplex: 3652 },
  },
  gwangju: {
    housing: { total: 146762, apartment: 62507, multiplex: 61389, rowhouse: 4580, detachedGeneral: 12033, multiHousehold: 3495, detachedCommercial: 1626, nonResidential: 1132 },
    households: { total: 160550, onePerson: 45804, onePerson65: 12386 },
    vacant: { total: 8323, apartment: 2064, detached: 857, multiplex: 4793 },
  },
  yangju: {
    housing: { total: 123791, apartment: 100144, multiplex: 8406, rowhouse: 3356, detachedGeneral: 8241, multiHousehold: 1108, detachedCommercial: 1580, nonResidential: 956 },
    households: { total: 120811, onePerson: 36789, onePerson65: 11239 },
    vacant: { total: 10554, apartment: 7990, detached: 155, multiplex: 1525 },
  },
  pocheon: {
    housing: { total: 59967, apartment: 23717, multiplex: 11432, rowhouse: 2752, detachedGeneral: 18001, multiHousehold: 1551, detachedCommercial: 1379, nonResidential: 1135 },
    households: { total: 62773, onePerson: 23568, onePerson65: 8650 },
    vacant: { total: 5713, apartment: 2653, detached: 616, multiplex: 1904 },
  },
  yeoju: {
    housing: { total: 48235, apartment: 18383, multiplex: 5084, rowhouse: 1578, detachedGeneral: 20124, multiHousehold: 1107, detachedCommercial: 970, nonResidential: 989 },
    households: { total: 49951, onePerson: 17655, onePerson65: 6584 },
    vacant: { total: 4908, apartment: 1975, detached: 1602, multiplex: 837 },
  },
  yeoncheon: {
    housing: { total: 18789, apartment: 6760, multiplex: 1348, rowhouse: 1255, detachedGeneral: 8099, multiHousehold: 266, detachedCommercial: 649, nonResidential: 412 },
    households: { total: 19043, onePerson: 7591, onePerson65: 3592 },
    vacant: { total: 1624, apartment: 803, detached: 125, multiplex: 338 },
  },
  gapyeong: {
    housing: { total: 29910, apartment: 7549, multiplex: 3735, rowhouse: 2175, detachedGeneral: 13391, multiHousehold: 1113, detachedCommercial: 1076, nonResidential: 871 },
    households: { total: 28034, onePerson: 11159, onePerson65: 4985 },
    vacant: { total: 5446, apartment: 1069, detached: 2686, multiplex: 897 },
  },
  yangpyeong: {
    housing: { total: 56279, apartment: 12901, multiplex: 5359, rowhouse: 1939, detachedGeneral: 32116, multiHousehold: 1759, detachedCommercial: 1261, nonResidential: 944 },
    households: { total: 54642, onePerson: 18977, onePerson65: 8761 },
    vacant: { total: 8106, apartment: 1415, detached: 5042, multiplex: 1024 },
  },
};
