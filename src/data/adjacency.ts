import { districtCities, type DistrictCity } from './districts';

/**
 * 시·군·구 지리 인접표 — "인근 지역" 내부 링크용.
 *
 * 이전에는 districts.ts 배열의 앞뒤 항목을 인근으로 썼는데, 배열 순서가 행정 코드순이라
 * 의정부 페이지에 안양·부천·광명·평택이 붙는 식으로 실제 생활권과 어긋났다.
 * 방문자가 "우리 동네 옆 동네"로 읽을 수 있어야 링크를 타고, 검색엔진도 같은 생활권끼리
 * 묶인 링크를 지역 관련성 신호로 본다.
 *
 * 규칙:
 *  - 실제 경계를 맞대거나 같은 생활권(출퇴근·장보기 권역)인 곳만 적는다.
 *  - 광역이 달라도(서울 ↔ 경기) 붙어 있으면 적는다 — 노원·도봉 ↔ 의정부, 강동 ↔ 하남 등.
 *  - 순서는 생활권이 가까운 순. 페이지에는 앞에서 limit 개만 노출된다.
 *  - 양방향을 각각 적는다. 빠뜨리면 한쪽 페이지에만 링크가 생긴다.
 */
const adjacency: Record<string, string[]> = {
  // --- 서울 ---
  jongno: ['jung', 'seodaemun', 'seongbuk', 'eunpyeong', 'dongdaemun'],
  jung: ['jongno', 'yongsan', 'seongdong', 'dongdaemun', 'seodaemun'],
  yongsan: ['jung', 'mapo', 'seongdong', 'dongjak', 'seocho'],
  seongdong: ['gwangjin', 'dongdaemun', 'jung', 'yongsan', 'gangnam'],
  gwangjin: ['seongdong', 'dongdaemun', 'jungnang', 'songpa', 'guri'],
  dongdaemun: ['seongdong', 'gwangjin', 'jungnang', 'seongbuk', 'jongno'],
  jungnang: ['dongdaemun', 'gwangjin', 'nowon', 'seongbuk', 'guri'],
  seongbuk: ['gangbuk', 'dongdaemun', 'jongno', 'jungnang', 'nowon'],
  gangbuk: ['dobong', 'seongbuk', 'nowon', 'eunpyeong'],
  dobong: ['nowon', 'gangbuk', 'uijeongbu', 'yangju'],
  nowon: ['dobong', 'gangbuk', 'jungnang', 'uijeongbu', 'guri'],
  eunpyeong: ['seodaemun', 'mapo', 'jongno', 'goyang', 'gangbuk'],
  seodaemun: ['mapo', 'eunpyeong', 'jongno', 'jung'],
  mapo: ['seodaemun', 'yongsan', 'yeongdeungpo', 'eunpyeong', 'goyang'],
  yangcheon: ['gangseo', 'guro', 'yeongdeungpo', 'bucheon'],
  gangseo: ['yangcheon', 'guro', 'gimpo', 'bucheon', 'mapo'],
  guro: ['yangcheon', 'geumcheon', 'yeongdeungpo', 'gwangmyeong', 'bucheon'],
  geumcheon: ['guro', 'gwanak', 'gwangmyeong', 'anyang'],
  yeongdeungpo: ['guro', 'yangcheon', 'dongjak', 'mapo', 'gwanak'],
  dongjak: ['gwanak', 'seocho', 'yeongdeungpo', 'yongsan'],
  gwanak: ['dongjak', 'geumcheon', 'seocho', 'gwacheon', 'anyang'],
  seocho: ['gangnam', 'dongjak', 'gwanak', 'gwacheon', 'seongnam'],
  gangnam: ['seocho', 'songpa', 'seongnam', 'seongdong'],
  songpa: ['gangnam', 'gangdong', 'hanam', 'seongnam', 'gwangjin'],
  gangdong: ['songpa', 'hanam', 'guri', 'gwangjin'],

  // --- 경기 ---
  suwon: ['hwaseong', 'yongin', 'uiwang', 'osan', 'gunpo'],
  seongnam: ['yongin', 'gwangju', 'hanam', 'gangnam', 'seocho', 'songpa'],
  uijeongbu: ['yangju', 'pocheon', 'namyangju', 'dongducheon', 'nowon', 'dobong'],
  anyang: ['gunpo', 'uiwang', 'gwacheon', 'gwangmyeong', 'gwanak', 'geumcheon'],
  bucheon: ['gwangmyeong', 'siheung', 'gimpo', 'guro', 'yangcheon', 'gangseo'],
  gwangmyeong: ['guro', 'geumcheon', 'anyang', 'bucheon', 'siheung'],
  pyeongtaek: ['osan', 'anseong', 'hwaseong', 'yongin'],
  dongducheon: ['yangju', 'pocheon', 'uijeongbu', 'yeoncheon'],
  ansan: ['siheung', 'gunpo', 'hwaseong', 'uiwang', 'suwon'],
  goyang: ['paju', 'gimpo', 'eunpyeong', 'mapo', 'yangju'],
  gwacheon: ['anyang', 'uiwang', 'seocho', 'gwanak', 'seongnam'],
  guri: ['namyangju', 'gangdong', 'jungnang', 'gwangjin', 'nowon'],
  namyangju: ['guri', 'uijeongbu', 'hanam', 'gapyeong', 'pocheon', 'yangpyeong'],
  osan: ['hwaseong', 'pyeongtaek', 'suwon', 'yongin'],
  siheung: ['ansan', 'bucheon', 'gwangmyeong', 'gunpo', 'anyang'],
  gunpo: ['anyang', 'uiwang', 'ansan', 'suwon', 'siheung'],
  uiwang: ['anyang', 'gunpo', 'gwacheon', 'suwon', 'seongnam'],
  hanam: ['seongnam', 'gangdong', 'songpa', 'namyangju', 'gwangju'],
  yongin: ['suwon', 'seongnam', 'hwaseong', 'gwangju', 'icheon', 'anseong'],
  paju: ['goyang', 'gimpo', 'yangju', 'yeoncheon'],
  icheon: ['yeoju', 'gwangju', 'yongin', 'anseong'],
  anseong: ['pyeongtaek', 'yongin', 'icheon'],
  gimpo: ['goyang', 'paju', 'gangseo', 'bucheon'],
  hwaseong: ['suwon', 'osan', 'yongin', 'ansan', 'pyeongtaek'],
  gwangju: ['seongnam', 'hanam', 'yongin', 'icheon', 'yeoju', 'yangpyeong'],
  yangju: ['uijeongbu', 'dongducheon', 'pocheon', 'goyang', 'paju', 'dobong'],
  pocheon: ['uijeongbu', 'yangju', 'dongducheon', 'namyangju', 'gapyeong', 'yeoncheon'],
  yeoju: ['icheon', 'gwangju', 'yangpyeong'],
  yeoncheon: ['dongducheon', 'pocheon', 'yangju', 'paju'],
  gapyeong: ['namyangju', 'pocheon', 'yangpyeong'],
  yangpyeong: ['namyangju', 'gwangju', 'yeoju', 'gapyeong', 'hanam'],
};

const bySlug = new Map(districtCities.map((city) => [city.slug, city]));

/** 인접 시·군·구를 생활권 가까운 순으로 돌려준다. 광역이 달라도 포함된다. */
export function nearbyDistricts(citySlug: string, limit = 4): DistrictCity[] {
  const slugs = adjacency[citySlug] ?? [];
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((city): city is DistrictCity => Boolean(city) && city!.slug !== citySlug)
    .slice(0, limit);
}
