/**
 * 자동 생성 파일 — 직접 수정하지 말 것.
 * 재생성: node scripts/generate-districts.mjs
 * 원본: 국토교통부 법정동코드 (scripts/data/bjd-seoul-gyeonggi.csv)
 *       + 유품정리연구소 검수 slug 맵 (scripts/data/*_dong_slug.json)
 *
 * 서울 25개 구, 경기 31개 시·군, 동·읍·면 페이지 1090개.
 * '…N가' 법정동은 어간이 동이면 병합(성수동1가→성수동), 로·가면 제외(을지로3가).
 */

export type DistrictDong = {
  slug: string;
  /** 페이지가 쓰는 동 이름 (잠실동 · 가평읍 · 성수동[1·2가 병합] …) */
  name: string;
  /** 일반구가 있는 경기 시의 소속 구 (성남시 수정구 등) */
  gu?: string;
};

export type DistrictCity = {
  slug: string;
  name: string;
  region: 'seoul' | 'gyeonggi';
  dongs: DistrictDong[];
};

export const districtCities: DistrictCity[] = [
  {
    "slug": "jongno",
    "name": "종로구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "cheongun",
        "name": "청운동"
      },
      {
        "slug": "singyo",
        "name": "신교동"
      },
      {
        "slug": "gungjeong",
        "name": "궁정동"
      },
      {
        "slug": "hyoja",
        "name": "효자동"
      },
      {
        "slug": "changseong",
        "name": "창성동"
      },
      {
        "slug": "tongui",
        "name": "통의동"
      },
      {
        "slug": "jeokseon",
        "name": "적선동"
      },
      {
        "slug": "tongin",
        "name": "통인동"
      },
      {
        "slug": "nusang",
        "name": "누상동"
      },
      {
        "slug": "nuha",
        "name": "누하동"
      },
      {
        "slug": "ogin",
        "name": "옥인동"
      },
      {
        "slug": "chebu",
        "name": "체부동"
      },
      {
        "slug": "pirun",
        "name": "필운동"
      },
      {
        "slug": "naeja",
        "name": "내자동"
      },
      {
        "slug": "sajik",
        "name": "사직동"
      },
      {
        "slug": "doryeom",
        "name": "도렴동"
      },
      {
        "slug": "dangju",
        "name": "당주동"
      },
      {
        "slug": "naesu",
        "name": "내수동"
      },
      {
        "slug": "sejongno",
        "name": "세종로"
      },
      {
        "slug": "cheongjin",
        "name": "청진동"
      },
      {
        "slug": "seorin",
        "name": "서린동"
      },
      {
        "slug": "susong",
        "name": "수송동"
      },
      {
        "slug": "junghak",
        "name": "중학동"
      },
      {
        "slug": "gongpyeong",
        "name": "공평동"
      },
      {
        "slug": "gwanhun",
        "name": "관훈동"
      },
      {
        "slug": "gyeonji",
        "name": "견지동"
      },
      {
        "slug": "waryong",
        "name": "와룡동"
      },
      {
        "slug": "gwonnong",
        "name": "권농동"
      },
      {
        "slug": "unni",
        "name": "운니동"
      },
      {
        "slug": "ikseon",
        "name": "익선동"
      },
      {
        "slug": "gyeongun",
        "name": "경운동"
      },
      {
        "slug": "gwancheol",
        "name": "관철동"
      },
      {
        "slug": "insa",
        "name": "인사동"
      },
      {
        "slug": "nagwon",
        "name": "낙원동"
      },
      {
        "slug": "palpan",
        "name": "팔판동"
      },
      {
        "slug": "samcheong",
        "name": "삼청동"
      },
      {
        "slug": "anguk",
        "name": "안국동"
      },
      {
        "slug": "sogyeok",
        "name": "소격동"
      },
      {
        "slug": "hwa",
        "name": "화동"
      },
      {
        "slug": "sagan",
        "name": "사간동"
      },
      {
        "slug": "songhyeon",
        "name": "송현동"
      },
      {
        "slug": "gahoe",
        "name": "가회동"
      },
      {
        "slug": "jae",
        "name": "재동"
      },
      {
        "slug": "gye",
        "name": "계동"
      },
      {
        "slug": "wonseo",
        "name": "원서동"
      },
      {
        "slug": "hunjeong",
        "name": "훈정동"
      },
      {
        "slug": "myo",
        "name": "묘동"
      },
      {
        "slug": "bongik",
        "name": "봉익동"
      },
      {
        "slug": "donui",
        "name": "돈의동"
      },
      {
        "slug": "jangsa",
        "name": "장사동"
      },
      {
        "slug": "gwansu",
        "name": "관수동"
      },
      {
        "slug": "inui",
        "name": "인의동"
      },
      {
        "slug": "yeji",
        "name": "예지동"
      },
      {
        "slug": "wonnam",
        "name": "원남동"
      },
      {
        "slug": "yeonji",
        "name": "연지동"
      },
      {
        "slug": "hyoje",
        "name": "효제동"
      },
      {
        "slug": "ihwa",
        "name": "이화동"
      },
      {
        "slug": "yeongeon",
        "name": "연건동"
      },
      {
        "slug": "chungsin",
        "name": "충신동"
      },
      {
        "slug": "dongsung",
        "name": "동숭동"
      },
      {
        "slug": "hyehwa",
        "name": "혜화동"
      },
      {
        "slug": "changsin",
        "name": "창신동"
      },
      {
        "slug": "sungin",
        "name": "숭인동"
      },
      {
        "slug": "gyonam",
        "name": "교남동"
      },
      {
        "slug": "pyeong",
        "name": "평동"
      },
      {
        "slug": "songwol",
        "name": "송월동"
      },
      {
        "slug": "hongpa",
        "name": "홍파동"
      },
      {
        "slug": "gyobuk",
        "name": "교북동"
      },
      {
        "slug": "haengchon",
        "name": "행촌동"
      },
      {
        "slug": "gugi",
        "name": "구기동"
      },
      {
        "slug": "pyeongchang",
        "name": "평창동"
      },
      {
        "slug": "buam",
        "name": "부암동"
      },
      {
        "slug": "hongji",
        "name": "홍지동"
      },
      {
        "slug": "sinyeong",
        "name": "신영동"
      },
      {
        "slug": "muak",
        "name": "무악동"
      }
    ]
  },
  {
    "slug": "jung",
    "name": "중구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "mugyo",
        "name": "무교동"
      },
      {
        "slug": "da",
        "name": "다동"
      },
      {
        "slug": "samgak",
        "name": "삼각동"
      },
      {
        "slug": "suha",
        "name": "수하동"
      },
      {
        "slug": "janggyo",
        "name": "장교동"
      },
      {
        "slug": "supyo",
        "name": "수표동"
      },
      {
        "slug": "sogong",
        "name": "소공동"
      },
      {
        "slug": "namchang",
        "name": "남창동"
      },
      {
        "slug": "bukchang",
        "name": "북창동"
      },
      {
        "slug": "bongnae",
        "name": "봉래동"
      },
      {
        "slug": "hoehyeon",
        "name": "회현동"
      },
      {
        "slug": "myeong",
        "name": "명동"
      },
      {
        "slug": "namsan",
        "name": "남산동"
      },
      {
        "slug": "jeo",
        "name": "저동"
      },
      {
        "slug": "inhyeon",
        "name": "인현동"
      },
      {
        "slug": "yegwan",
        "name": "예관동"
      },
      {
        "slug": "mukjeong",
        "name": "묵정동"
      },
      {
        "slug": "pil",
        "name": "필동"
      },
      {
        "slug": "namhak",
        "name": "남학동"
      },
      {
        "slug": "juja",
        "name": "주자동"
      },
      {
        "slug": "yejang",
        "name": "예장동"
      },
      {
        "slug": "jangchung",
        "name": "장충동"
      },
      {
        "slug": "gwanghui",
        "name": "광희동"
      },
      {
        "slug": "ssangnim",
        "name": "쌍림동"
      },
      {
        "slug": "jugyo",
        "name": "주교동"
      },
      {
        "slug": "bangsan",
        "name": "방산동"
      },
      {
        "slug": "ojang",
        "name": "오장동"
      },
      {
        "slug": "ipjeong",
        "name": "입정동"
      },
      {
        "slug": "sallim",
        "name": "산림동"
      },
      {
        "slug": "cho",
        "name": "초동"
      },
      {
        "slug": "sindang",
        "name": "신당동"
      },
      {
        "slug": "heungin",
        "name": "흥인동"
      },
      {
        "slug": "muhak",
        "name": "무학동"
      },
      {
        "slug": "hwanghak",
        "name": "황학동"
      },
      {
        "slug": "seosomun",
        "name": "서소문동"
      },
      {
        "slug": "jeong",
        "name": "정동"
      },
      {
        "slug": "sunhwa",
        "name": "순화동"
      },
      {
        "slug": "jungnim",
        "name": "중림동"
      },
      {
        "slug": "malli",
        "name": "만리동"
      }
    ]
  },
  {
    "slug": "yongsan",
    "name": "용산구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "huam",
        "name": "후암동"
      },
      {
        "slug": "yongsan",
        "name": "용산동"
      },
      {
        "slug": "garwol",
        "name": "갈월동"
      },
      {
        "slug": "namyeong",
        "name": "남영동"
      },
      {
        "slug": "dongja",
        "name": "동자동"
      },
      {
        "slug": "seogye",
        "name": "서계동"
      },
      {
        "slug": "cheongpa",
        "name": "청파동"
      },
      {
        "slug": "sinchang",
        "name": "신창동"
      },
      {
        "slug": "sancheon",
        "name": "산천동"
      },
      {
        "slug": "cheongam",
        "name": "청암동"
      },
      {
        "slug": "hyochang",
        "name": "효창동"
      },
      {
        "slug": "dowon",
        "name": "도원동"
      },
      {
        "slug": "yongmun",
        "name": "용문동"
      },
      {
        "slug": "munbae",
        "name": "문배동"
      },
      {
        "slug": "singye",
        "name": "신계동"
      },
      {
        "slug": "ichon",
        "name": "이촌동"
      },
      {
        "slug": "itaewon",
        "name": "이태원동"
      },
      {
        "slug": "hannam",
        "name": "한남동"
      },
      {
        "slug": "dongbinggo",
        "name": "동빙고동"
      },
      {
        "slug": "seobinggo",
        "name": "서빙고동"
      },
      {
        "slug": "juseong",
        "name": "주성동"
      },
      {
        "slug": "bogwang",
        "name": "보광동"
      }
    ]
  },
  {
    "slug": "seongdong",
    "name": "성동구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "sangwangsimni",
        "name": "상왕십리동"
      },
      {
        "slug": "hawangsimni",
        "name": "하왕십리동"
      },
      {
        "slug": "hongik",
        "name": "홍익동"
      },
      {
        "slug": "doseon",
        "name": "도선동"
      },
      {
        "slug": "majang",
        "name": "마장동"
      },
      {
        "slug": "sageun",
        "name": "사근동"
      },
      {
        "slug": "haengdang",
        "name": "행당동"
      },
      {
        "slug": "eungbong",
        "name": "응봉동"
      },
      {
        "slug": "geumho",
        "name": "금호동"
      },
      {
        "slug": "oksu",
        "name": "옥수동"
      },
      {
        "slug": "seongsu",
        "name": "성수동"
      },
      {
        "slug": "songjeong",
        "name": "송정동"
      },
      {
        "slug": "yongdap",
        "name": "용답동"
      }
    ]
  },
  {
    "slug": "gwangjin",
    "name": "광진구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "junggok",
        "name": "중곡동"
      },
      {
        "slug": "neung",
        "name": "능동"
      },
      {
        "slug": "guui",
        "name": "구의동"
      },
      {
        "slug": "gwangjang",
        "name": "광장동"
      },
      {
        "slug": "jayang",
        "name": "자양동"
      },
      {
        "slug": "hwayang",
        "name": "화양동"
      },
      {
        "slug": "gunja",
        "name": "군자동"
      }
    ]
  },
  {
    "slug": "dongdaemun",
    "name": "동대문구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "sinseol",
        "name": "신설동"
      },
      {
        "slug": "yongdu",
        "name": "용두동"
      },
      {
        "slug": "jegi",
        "name": "제기동"
      },
      {
        "slug": "jeonnong",
        "name": "전농동"
      },
      {
        "slug": "dapsimni",
        "name": "답십리동"
      },
      {
        "slug": "jangan",
        "name": "장안동"
      },
      {
        "slug": "cheongnyangni",
        "name": "청량리동"
      },
      {
        "slug": "hoegi",
        "name": "회기동"
      },
      {
        "slug": "hwigyeong",
        "name": "휘경동"
      },
      {
        "slug": "imun",
        "name": "이문동"
      }
    ]
  },
  {
    "slug": "jungnang",
    "name": "중랑구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "myeonmok",
        "name": "면목동"
      },
      {
        "slug": "sangbong",
        "name": "상봉동"
      },
      {
        "slug": "junghwa",
        "name": "중화동"
      },
      {
        "slug": "muk",
        "name": "묵동"
      },
      {
        "slug": "mangu",
        "name": "망우동"
      },
      {
        "slug": "sinnae",
        "name": "신내동"
      }
    ]
  },
  {
    "slug": "seongbuk",
    "name": "성북구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "seongbuk",
        "name": "성북동"
      },
      {
        "slug": "donam",
        "name": "돈암동"
      },
      {
        "slug": "dongsomun",
        "name": "동소문동"
      },
      {
        "slug": "samseon",
        "name": "삼선동"
      },
      {
        "slug": "dongseon",
        "name": "동선동"
      },
      {
        "slug": "anam",
        "name": "안암동"
      },
      {
        "slug": "bomun",
        "name": "보문동"
      },
      {
        "slug": "jeongneung",
        "name": "정릉동"
      },
      {
        "slug": "gireum",
        "name": "길음동"
      },
      {
        "slug": "jongam",
        "name": "종암동"
      },
      {
        "slug": "hawolgok",
        "name": "하월곡동"
      },
      {
        "slug": "sangwolgok",
        "name": "상월곡동"
      },
      {
        "slug": "jangwi",
        "name": "장위동"
      },
      {
        "slug": "seokgwan",
        "name": "석관동"
      }
    ]
  },
  {
    "slug": "gangbuk",
    "name": "강북구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "mia",
        "name": "미아동"
      },
      {
        "slug": "beon",
        "name": "번동"
      },
      {
        "slug": "suyu",
        "name": "수유동"
      },
      {
        "slug": "ui",
        "name": "우이동"
      }
    ]
  },
  {
    "slug": "dobong",
    "name": "도봉구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "ssangmun",
        "name": "쌍문동"
      },
      {
        "slug": "banghak",
        "name": "방학동"
      },
      {
        "slug": "chang",
        "name": "창동"
      },
      {
        "slug": "dobong",
        "name": "도봉동"
      }
    ]
  },
  {
    "slug": "nowon",
    "name": "노원구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "wolgye",
        "name": "월계동"
      },
      {
        "slug": "gongneung",
        "name": "공릉동"
      },
      {
        "slug": "hagye",
        "name": "하계동"
      },
      {
        "slug": "sanggye",
        "name": "상계동"
      },
      {
        "slug": "junggye",
        "name": "중계동"
      }
    ]
  },
  {
    "slug": "eunpyeong",
    "name": "은평구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "susaek",
        "name": "수색동"
      },
      {
        "slug": "nokbeon",
        "name": "녹번동"
      },
      {
        "slug": "bulgwang",
        "name": "불광동"
      },
      {
        "slug": "galhyeon",
        "name": "갈현동"
      },
      {
        "slug": "gusan",
        "name": "구산동"
      },
      {
        "slug": "daejo",
        "name": "대조동"
      },
      {
        "slug": "eungam",
        "name": "응암동"
      },
      {
        "slug": "yeokchon",
        "name": "역촌동"
      },
      {
        "slug": "sinsa",
        "name": "신사동"
      },
      {
        "slug": "jeungsan",
        "name": "증산동"
      },
      {
        "slug": "jingwan",
        "name": "진관동"
      }
    ]
  },
  {
    "slug": "seodaemun",
    "name": "서대문구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "hap",
        "name": "합동"
      },
      {
        "slug": "migeun",
        "name": "미근동"
      },
      {
        "slug": "naengcheon",
        "name": "냉천동"
      },
      {
        "slug": "cheonyeon",
        "name": "천연동"
      },
      {
        "slug": "okcheon",
        "name": "옥천동"
      },
      {
        "slug": "yeongcheon",
        "name": "영천동"
      },
      {
        "slug": "hyeonjeo",
        "name": "현저동"
      },
      {
        "slug": "bugahyeon",
        "name": "북아현동"
      },
      {
        "slug": "hongje",
        "name": "홍제동"
      },
      {
        "slug": "daehyeon",
        "name": "대현동"
      },
      {
        "slug": "daesin",
        "name": "대신동"
      },
      {
        "slug": "sinchon",
        "name": "신촌동"
      },
      {
        "slug": "bongwon",
        "name": "봉원동"
      },
      {
        "slug": "changcheon",
        "name": "창천동"
      },
      {
        "slug": "yeonhui",
        "name": "연희동"
      },
      {
        "slug": "hongeun",
        "name": "홍은동"
      },
      {
        "slug": "bukgajwa",
        "name": "북가좌동"
      },
      {
        "slug": "namgajwa",
        "name": "남가좌동"
      }
    ]
  },
  {
    "slug": "mapo",
    "name": "마포구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "ahyeon",
        "name": "아현동"
      },
      {
        "slug": "gongdeok",
        "name": "공덕동"
      },
      {
        "slug": "singongdeok",
        "name": "신공덕동"
      },
      {
        "slug": "dohwa",
        "name": "도화동"
      },
      {
        "slug": "yonggang",
        "name": "용강동"
      },
      {
        "slug": "tojeong",
        "name": "토정동"
      },
      {
        "slug": "mapo",
        "name": "마포동"
      },
      {
        "slug": "daeheung",
        "name": "대흥동"
      },
      {
        "slug": "yeomni",
        "name": "염리동"
      },
      {
        "slug": "nogosan",
        "name": "노고산동"
      },
      {
        "slug": "sinsu",
        "name": "신수동"
      },
      {
        "slug": "hyeonseok",
        "name": "현석동"
      },
      {
        "slug": "gusu",
        "name": "구수동"
      },
      {
        "slug": "changjeon",
        "name": "창전동"
      },
      {
        "slug": "sangsu",
        "name": "상수동"
      },
      {
        "slug": "hajung",
        "name": "하중동"
      },
      {
        "slug": "sinjeong",
        "name": "신정동"
      },
      {
        "slug": "dangin",
        "name": "당인동"
      },
      {
        "slug": "seogyo",
        "name": "서교동"
      },
      {
        "slug": "donggyo",
        "name": "동교동"
      },
      {
        "slug": "hapjeong",
        "name": "합정동"
      },
      {
        "slug": "mangwon",
        "name": "망원동"
      },
      {
        "slug": "yeonnam",
        "name": "연남동"
      },
      {
        "slug": "seongsan",
        "name": "성산동"
      },
      {
        "slug": "jung",
        "name": "중동"
      },
      {
        "slug": "sangam",
        "name": "상암동"
      }
    ]
  },
  {
    "slug": "yangcheon",
    "name": "양천구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "sinjeong",
        "name": "신정동"
      },
      {
        "slug": "mok",
        "name": "목동"
      },
      {
        "slug": "sinwol",
        "name": "신월동"
      }
    ]
  },
  {
    "slug": "gangseo",
    "name": "강서구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "yeomchang",
        "name": "염창동"
      },
      {
        "slug": "deungchon",
        "name": "등촌동"
      },
      {
        "slug": "hwagok",
        "name": "화곡동"
      },
      {
        "slug": "gayang",
        "name": "가양동"
      },
      {
        "slug": "magok",
        "name": "마곡동"
      },
      {
        "slug": "naebalsan",
        "name": "내발산동"
      },
      {
        "slug": "oebalsan",
        "name": "외발산동"
      },
      {
        "slug": "gonghang",
        "name": "공항동"
      },
      {
        "slug": "banghwa",
        "name": "방화동"
      },
      {
        "slug": "gaehwa",
        "name": "개화동"
      },
      {
        "slug": "gwahae",
        "name": "과해동"
      },
      {
        "slug": "ogok",
        "name": "오곡동"
      },
      {
        "slug": "osoe",
        "name": "오쇠동"
      }
    ]
  },
  {
    "slug": "guro",
    "name": "구로구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "sindorim",
        "name": "신도림동"
      },
      {
        "slug": "guro",
        "name": "구로동"
      },
      {
        "slug": "garibong",
        "name": "가리봉동"
      },
      {
        "slug": "gocheok",
        "name": "고척동"
      },
      {
        "slug": "gaebong",
        "name": "개봉동"
      },
      {
        "slug": "oryu",
        "name": "오류동"
      },
      {
        "slug": "gung",
        "name": "궁동"
      },
      {
        "slug": "onsu",
        "name": "온수동"
      },
      {
        "slug": "cheonwang",
        "name": "천왕동"
      },
      {
        "slug": "hang",
        "name": "항동"
      }
    ]
  },
  {
    "slug": "geumcheon",
    "name": "금천구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "gasan",
        "name": "가산동"
      },
      {
        "slug": "doksan",
        "name": "독산동"
      },
      {
        "slug": "siheung",
        "name": "시흥동"
      }
    ]
  },
  {
    "slug": "yeongdeungpo",
    "name": "영등포구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "yeongdeungpo",
        "name": "영등포동"
      },
      {
        "slug": "yeouido",
        "name": "여의도동"
      },
      {
        "slug": "dangsan",
        "name": "당산동"
      },
      {
        "slug": "dorim",
        "name": "도림동"
      },
      {
        "slug": "mullae",
        "name": "문래동"
      },
      {
        "slug": "yangpyeong",
        "name": "양평동"
      },
      {
        "slug": "yanghwa",
        "name": "양화동"
      },
      {
        "slug": "singil",
        "name": "신길동"
      },
      {
        "slug": "daerim",
        "name": "대림동"
      }
    ]
  },
  {
    "slug": "dongjak",
    "name": "동작구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "noryangjin",
        "name": "노량진동"
      },
      {
        "slug": "sangdo",
        "name": "상도동"
      },
      {
        "slug": "sangdo1",
        "name": "상도1동"
      },
      {
        "slug": "bon",
        "name": "본동"
      },
      {
        "slug": "heukseok",
        "name": "흑석동"
      },
      {
        "slug": "dongjak",
        "name": "동작동"
      },
      {
        "slug": "sadang",
        "name": "사당동"
      },
      {
        "slug": "daebang",
        "name": "대방동"
      },
      {
        "slug": "sindaebang",
        "name": "신대방동"
      }
    ]
  },
  {
    "slug": "gwanak",
    "name": "관악구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "bongcheon",
        "name": "봉천동"
      },
      {
        "slug": "sillim",
        "name": "신림동"
      },
      {
        "slug": "namhyeon",
        "name": "남현동"
      }
    ]
  },
  {
    "slug": "seocho",
    "name": "서초구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "bangbae",
        "name": "방배동"
      },
      {
        "slug": "yangjae",
        "name": "양재동"
      },
      {
        "slug": "umyeon",
        "name": "우면동"
      },
      {
        "slug": "wonji",
        "name": "원지동"
      },
      {
        "slug": "jamwon",
        "name": "잠원동"
      },
      {
        "slug": "banpo",
        "name": "반포동"
      },
      {
        "slug": "seocho",
        "name": "서초동"
      },
      {
        "slug": "naegok",
        "name": "내곡동"
      },
      {
        "slug": "yeomgok",
        "name": "염곡동"
      },
      {
        "slug": "sinwon",
        "name": "신원동"
      }
    ]
  },
  {
    "slug": "gangnam",
    "name": "강남구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "yeoksam",
        "name": "역삼동"
      },
      {
        "slug": "gaepo",
        "name": "개포동"
      },
      {
        "slug": "cheongdam",
        "name": "청담동"
      },
      {
        "slug": "samseong",
        "name": "삼성동"
      },
      {
        "slug": "daechi",
        "name": "대치동"
      },
      {
        "slug": "sinsa",
        "name": "신사동"
      },
      {
        "slug": "nonhyeon",
        "name": "논현동"
      },
      {
        "slug": "apgujeong",
        "name": "압구정동"
      },
      {
        "slug": "segok",
        "name": "세곡동"
      },
      {
        "slug": "jagok",
        "name": "자곡동"
      },
      {
        "slug": "yulhyeon",
        "name": "율현동"
      },
      {
        "slug": "irwon",
        "name": "일원동"
      },
      {
        "slug": "suseo",
        "name": "수서동"
      },
      {
        "slug": "dogok",
        "name": "도곡동"
      }
    ]
  },
  {
    "slug": "songpa",
    "name": "송파구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "jamsil",
        "name": "잠실동"
      },
      {
        "slug": "sincheon",
        "name": "신천동"
      },
      {
        "slug": "pungnap",
        "name": "풍납동"
      },
      {
        "slug": "songpa",
        "name": "송파동"
      },
      {
        "slug": "seokchon",
        "name": "석촌동"
      },
      {
        "slug": "samjeon",
        "name": "삼전동"
      },
      {
        "slug": "garak",
        "name": "가락동"
      },
      {
        "slug": "munjeong",
        "name": "문정동"
      },
      {
        "slug": "jangji",
        "name": "장지동"
      },
      {
        "slug": "bangi",
        "name": "방이동"
      },
      {
        "slug": "ogeum",
        "name": "오금동"
      },
      {
        "slug": "geoyeo",
        "name": "거여동"
      },
      {
        "slug": "macheon",
        "name": "마천동"
      }
    ]
  },
  {
    "slug": "gangdong",
    "name": "강동구",
    "region": "seoul",
    "dongs": [
      {
        "slug": "myeongil",
        "name": "명일동"
      },
      {
        "slug": "godeok",
        "name": "고덕동"
      },
      {
        "slug": "sangil",
        "name": "상일동"
      },
      {
        "slug": "gil",
        "name": "길동"
      },
      {
        "slug": "dunchon",
        "name": "둔촌동"
      },
      {
        "slug": "amsa",
        "name": "암사동"
      },
      {
        "slug": "seongnae",
        "name": "성내동"
      },
      {
        "slug": "cheonho",
        "name": "천호동"
      },
      {
        "slug": "gangil",
        "name": "강일동"
      }
    ]
  },
  {
    "slug": "suwon",
    "name": "수원시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "pajang",
        "name": "파장동",
        "gu": "장안구"
      },
      {
        "slug": "jeongja",
        "name": "정자동",
        "gu": "장안구"
      },
      {
        "slug": "imok",
        "name": "이목동",
        "gu": "장안구"
      },
      {
        "slug": "yuljeon",
        "name": "율전동",
        "gu": "장안구"
      },
      {
        "slug": "cheoncheon",
        "name": "천천동",
        "gu": "장안구"
      },
      {
        "slug": "yeonghwa",
        "name": "영화동",
        "gu": "장안구"
      },
      {
        "slug": "songjuk",
        "name": "송죽동",
        "gu": "장안구"
      },
      {
        "slug": "jowon",
        "name": "조원동",
        "gu": "장안구"
      },
      {
        "slug": "yeonmu",
        "name": "연무동",
        "gu": "장안구"
      },
      {
        "slug": "sanggwanggyo",
        "name": "상광교동",
        "gu": "장안구"
      },
      {
        "slug": "hagwanggyo",
        "name": "하광교동",
        "gu": "장안구"
      },
      {
        "slug": "seryu",
        "name": "세류동",
        "gu": "권선구"
      },
      {
        "slug": "pyeong",
        "name": "평동",
        "gu": "권선구"
      },
      {
        "slug": "gosaek",
        "name": "고색동",
        "gu": "권선구"
      },
      {
        "slug": "omokcheon",
        "name": "오목천동",
        "gu": "권선구"
      },
      {
        "slug": "pyeongni",
        "name": "평리동",
        "gu": "권선구"
      },
      {
        "slug": "seodun",
        "name": "서둔동",
        "gu": "권선구"
      },
      {
        "slug": "guun",
        "name": "구운동",
        "gu": "권선구"
      },
      {
        "slug": "tap",
        "name": "탑동",
        "gu": "권선구"
      },
      {
        "slug": "geumgok",
        "name": "금곡동",
        "gu": "권선구"
      },
      {
        "slug": "homaesil",
        "name": "호매실동",
        "gu": "권선구"
      },
      {
        "slug": "gokbanjeong",
        "name": "곡반정동",
        "gu": "권선구"
      },
      {
        "slug": "gwonseon",
        "name": "권선동",
        "gu": "권선구"
      },
      {
        "slug": "jangji",
        "name": "장지동",
        "gu": "권선구"
      },
      {
        "slug": "daehwanggyo",
        "name": "대황교동",
        "gu": "권선구"
      },
      {
        "slug": "ipbuk",
        "name": "입북동",
        "gu": "권선구"
      },
      {
        "slug": "dangsu",
        "name": "당수동",
        "gu": "권선구"
      },
      {
        "slug": "namchang",
        "name": "남창동",
        "gu": "팔달구"
      },
      {
        "slug": "yeong",
        "name": "영동",
        "gu": "팔달구"
      },
      {
        "slug": "jung",
        "name": "중동",
        "gu": "팔달구"
      },
      {
        "slug": "gucheon",
        "name": "구천동",
        "gu": "팔달구"
      },
      {
        "slug": "namsu",
        "name": "남수동",
        "gu": "팔달구"
      },
      {
        "slug": "maehyang",
        "name": "매향동",
        "gu": "팔달구"
      },
      {
        "slug": "buksu",
        "name": "북수동",
        "gu": "팔달구"
      },
      {
        "slug": "sinpung",
        "name": "신풍동",
        "gu": "팔달구"
      },
      {
        "slug": "jangan",
        "name": "장안동",
        "gu": "팔달구"
      },
      {
        "slug": "gyo",
        "name": "교동",
        "gu": "팔달구"
      },
      {
        "slug": "maegyo",
        "name": "매교동",
        "gu": "팔달구"
      },
      {
        "slug": "godeung",
        "name": "고등동",
        "gu": "팔달구"
      },
      {
        "slug": "hwaseo",
        "name": "화서동",
        "gu": "팔달구"
      },
      {
        "slug": "ji",
        "name": "지동",
        "gu": "팔달구"
      },
      {
        "slug": "uman",
        "name": "우만동",
        "gu": "팔달구"
      },
      {
        "slug": "ingye",
        "name": "인계동",
        "gu": "팔달구"
      },
      {
        "slug": "maetan",
        "name": "매탄동",
        "gu": "영통구"
      },
      {
        "slug": "woncheon",
        "name": "원천동",
        "gu": "영통구"
      },
      {
        "slug": "iui",
        "name": "이의동",
        "gu": "영통구"
      },
      {
        "slug": "ha",
        "name": "하동",
        "gu": "영통구"
      },
      {
        "slug": "yeongtong",
        "name": "영통동",
        "gu": "영통구"
      },
      {
        "slug": "sin",
        "name": "신동",
        "gu": "영통구"
      },
      {
        "slug": "mangpo",
        "name": "망포동",
        "gu": "영통구"
      }
    ]
  },
  {
    "slug": "seongnam",
    "name": "성남시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "sinheung",
        "name": "신흥동",
        "gu": "수정구"
      },
      {
        "slug": "taepyeong",
        "name": "태평동",
        "gu": "수정구"
      },
      {
        "slug": "sujin",
        "name": "수진동",
        "gu": "수정구"
      },
      {
        "slug": "dandae",
        "name": "단대동",
        "gu": "수정구"
      },
      {
        "slug": "sanseong",
        "name": "산성동",
        "gu": "수정구"
      },
      {
        "slug": "yangji",
        "name": "양지동",
        "gu": "수정구"
      },
      {
        "slug": "bokjeong",
        "name": "복정동",
        "gu": "수정구"
      },
      {
        "slug": "changgok",
        "name": "창곡동",
        "gu": "수정구"
      },
      {
        "slug": "sinchon",
        "name": "신촌동",
        "gu": "수정구"
      },
      {
        "slug": "oya",
        "name": "오야동",
        "gu": "수정구"
      },
      {
        "slug": "simgok",
        "name": "심곡동",
        "gu": "수정구"
      },
      {
        "slug": "godeung",
        "name": "고등동",
        "gu": "수정구"
      },
      {
        "slug": "sangjeok",
        "name": "상적동",
        "gu": "수정구"
      },
      {
        "slug": "dunjeon",
        "name": "둔전동",
        "gu": "수정구"
      },
      {
        "slug": "siheung",
        "name": "시흥동",
        "gu": "수정구"
      },
      {
        "slug": "geumto",
        "name": "금토동",
        "gu": "수정구"
      },
      {
        "slug": "sasong",
        "name": "사송동",
        "gu": "수정구"
      },
      {
        "slug": "seongnam",
        "name": "성남동",
        "gu": "중원구"
      },
      {
        "slug": "geumgwang",
        "name": "금광동",
        "gu": "중원구"
      },
      {
        "slug": "eunhaeng",
        "name": "은행동",
        "gu": "중원구"
      },
      {
        "slug": "sangdaewon",
        "name": "상대원동",
        "gu": "중원구"
      },
      {
        "slug": "yeosu",
        "name": "여수동",
        "gu": "중원구"
      },
      {
        "slug": "dochon",
        "name": "도촌동",
        "gu": "중원구"
      },
      {
        "slug": "galhyeon",
        "name": "갈현동",
        "gu": "중원구"
      },
      {
        "slug": "hadaewon",
        "name": "하대원동",
        "gu": "중원구"
      },
      {
        "slug": "jungang",
        "name": "중앙동",
        "gu": "중원구"
      },
      {
        "slug": "bundang",
        "name": "분당동",
        "gu": "분당구"
      },
      {
        "slug": "sunae",
        "name": "수내동",
        "gu": "분당구"
      },
      {
        "slug": "jeongja",
        "name": "정자동",
        "gu": "분당구"
      },
      {
        "slug": "yul",
        "name": "율동",
        "gu": "분당구"
      },
      {
        "slug": "seohyeon",
        "name": "서현동",
        "gu": "분당구"
      },
      {
        "slug": "imae",
        "name": "이매동",
        "gu": "분당구"
      },
      {
        "slug": "yatap",
        "name": "야탑동",
        "gu": "분당구"
      },
      {
        "slug": "pangyo",
        "name": "판교동",
        "gu": "분당구"
      },
      {
        "slug": "sampyeong",
        "name": "삼평동",
        "gu": "분당구"
      },
      {
        "slug": "baekhyeon",
        "name": "백현동",
        "gu": "분당구"
      },
      {
        "slug": "geumgok",
        "name": "금곡동",
        "gu": "분당구"
      },
      {
        "slug": "gungnae",
        "name": "궁내동",
        "gu": "분당구"
      },
      {
        "slug": "dongwon",
        "name": "동원동",
        "gu": "분당구"
      },
      {
        "slug": "gumi",
        "name": "구미동",
        "gu": "분당구"
      },
      {
        "slug": "unjung",
        "name": "운중동",
        "gu": "분당구"
      },
      {
        "slug": "daejang",
        "name": "대장동",
        "gu": "분당구"
      },
      {
        "slug": "seogun",
        "name": "석운동",
        "gu": "분당구"
      },
      {
        "slug": "hasanun",
        "name": "하산운동",
        "gu": "분당구"
      }
    ]
  },
  {
    "slug": "uijeongbu",
    "name": "의정부시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "uijeongbu",
        "name": "의정부동"
      },
      {
        "slug": "howon",
        "name": "호원동"
      },
      {
        "slug": "jangam",
        "name": "장암동"
      },
      {
        "slug": "singok",
        "name": "신곡동"
      },
      {
        "slug": "yonghyeon",
        "name": "용현동"
      },
      {
        "slug": "millak",
        "name": "민락동"
      },
      {
        "slug": "nagyang",
        "name": "낙양동"
      },
      {
        "slug": "jail",
        "name": "자일동"
      },
      {
        "slug": "geumo",
        "name": "금오동"
      },
      {
        "slug": "ganeung",
        "name": "가능동"
      },
      {
        "slug": "nogyang",
        "name": "녹양동"
      },
      {
        "slug": "gosan",
        "name": "고산동"
      },
      {
        "slug": "sangok",
        "name": "산곡동"
      }
    ]
  },
  {
    "slug": "anyang",
    "name": "안양시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "anyang",
        "name": "안양동",
        "gu": "만안구"
      },
      {
        "slug": "seoksu",
        "name": "석수동",
        "gu": "만안구"
      },
      {
        "slug": "bakdal",
        "name": "박달동",
        "gu": "만안구"
      },
      {
        "slug": "bisan",
        "name": "비산동",
        "gu": "동안구"
      },
      {
        "slug": "gwanyang",
        "name": "관양동",
        "gu": "동안구"
      },
      {
        "slug": "pyeongchon",
        "name": "평촌동",
        "gu": "동안구"
      },
      {
        "slug": "hogye",
        "name": "호계동",
        "gu": "동안구"
      }
    ]
  },
  {
    "slug": "bucheon",
    "name": "부천시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "wonmi",
        "name": "원미동",
        "gu": "원미구"
      },
      {
        "slug": "simgok",
        "name": "심곡동",
        "gu": "원미구"
      },
      {
        "slug": "chunui",
        "name": "춘의동",
        "gu": "원미구"
      },
      {
        "slug": "dodang",
        "name": "도당동",
        "gu": "원미구"
      },
      {
        "slug": "yakdae",
        "name": "약대동",
        "gu": "원미구"
      },
      {
        "slug": "sosa",
        "name": "소사동",
        "gu": "원미구"
      },
      {
        "slug": "yeokgok",
        "name": "역곡동",
        "gu": "원미구"
      },
      {
        "slug": "jung",
        "name": "중동",
        "gu": "원미구"
      },
      {
        "slug": "sang",
        "name": "상동",
        "gu": "원미구"
      },
      {
        "slug": "sosabon",
        "name": "소사본동",
        "gu": "소사구"
      },
      {
        "slug": "simgokbon",
        "name": "심곡본동",
        "gu": "소사구"
      },
      {
        "slug": "beombak",
        "name": "범박동",
        "gu": "소사구"
      },
      {
        "slug": "goean",
        "name": "괴안동",
        "gu": "소사구"
      },
      {
        "slug": "songnae",
        "name": "송내동",
        "gu": "소사구"
      },
      {
        "slug": "okgil",
        "name": "옥길동",
        "gu": "소사구"
      },
      {
        "slug": "gyesu",
        "name": "계수동",
        "gu": "소사구"
      },
      {
        "slug": "ojeong",
        "name": "오정동",
        "gu": "오정구"
      },
      {
        "slug": "yeowol",
        "name": "여월동",
        "gu": "오정구"
      },
      {
        "slug": "jak",
        "name": "작동",
        "gu": "오정구"
      },
      {
        "slug": "wonjong",
        "name": "원종동",
        "gu": "오정구"
      },
      {
        "slug": "gogang",
        "name": "고강동",
        "gu": "오정구"
      },
      {
        "slug": "daejang",
        "name": "대장동",
        "gu": "오정구"
      },
      {
        "slug": "samjeong",
        "name": "삼정동",
        "gu": "오정구"
      },
      {
        "slug": "nae",
        "name": "내동",
        "gu": "오정구"
      }
    ]
  },
  {
    "slug": "gwangmyeong",
    "name": "광명시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "gwangmyeong",
        "name": "광명동"
      },
      {
        "slug": "cheolsan",
        "name": "철산동"
      },
      {
        "slug": "haan",
        "name": "하안동"
      },
      {
        "slug": "soha",
        "name": "소하동"
      },
      {
        "slug": "noonsa",
        "name": "노온사동"
      },
      {
        "slug": "iljik",
        "name": "일직동"
      },
      {
        "slug": "gahak",
        "name": "가학동"
      },
      {
        "slug": "okgil",
        "name": "옥길동"
      }
    ]
  },
  {
    "slug": "pyeongtaek",
    "name": "평택시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "seojeong",
        "name": "서정동"
      },
      {
        "slug": "jangdang",
        "name": "장당동"
      },
      {
        "slug": "mogok",
        "name": "모곡동"
      },
      {
        "slug": "chilgoe",
        "name": "칠괴동"
      },
      {
        "slug": "chirwon",
        "name": "칠원동"
      },
      {
        "slug": "doil",
        "name": "도일동"
      },
      {
        "slug": "gajae",
        "name": "가재동"
      },
      {
        "slug": "jangan",
        "name": "장안동"
      },
      {
        "slug": "ichung",
        "name": "이충동"
      },
      {
        "slug": "jisan",
        "name": "지산동"
      },
      {
        "slug": "dokgok",
        "name": "독곡동"
      },
      {
        "slug": "sinjang",
        "name": "신장동"
      },
      {
        "slug": "pyeongtaek",
        "name": "평택동"
      },
      {
        "slug": "tongbok",
        "name": "통복동"
      },
      {
        "slug": "gunmun",
        "name": "군문동"
      },
      {
        "slug": "yucheon",
        "name": "유천동"
      },
      {
        "slug": "hapjeong",
        "name": "합정동"
      },
      {
        "slug": "bijeon",
        "name": "비전동"
      },
      {
        "slug": "dongsak",
        "name": "동삭동"
      },
      {
        "slug": "segyo",
        "name": "세교동"
      },
      {
        "slug": "jije",
        "name": "지제동"
      },
      {
        "slug": "sindae",
        "name": "신대동"
      },
      {
        "slug": "sosa",
        "name": "소사동"
      },
      {
        "slug": "yongi",
        "name": "용이동"
      },
      {
        "slug": "wolgok",
        "name": "월곡동"
      },
      {
        "slug": "cheongnyong",
        "name": "청룡동"
      },
      {
        "slug": "jukbaek",
        "name": "죽백동"
      },
      {
        "slug": "godeok",
        "name": "고덕동"
      },
      {
        "slug": "paengseong-eup",
        "name": "팽성읍"
      },
      {
        "slug": "anjung-eup",
        "name": "안중읍"
      },
      {
        "slug": "poseung-eup",
        "name": "포승읍"
      },
      {
        "slug": "cheongbuk-eup",
        "name": "청북읍"
      },
      {
        "slug": "jinwi-myeon",
        "name": "진위면"
      },
      {
        "slug": "seotan-myeon",
        "name": "서탄면"
      },
      {
        "slug": "godeok-myeon",
        "name": "고덕면"
      },
      {
        "slug": "oseong-myeon",
        "name": "오성면"
      },
      {
        "slug": "hyeondeok-myeon",
        "name": "현덕면"
      }
    ]
  },
  {
    "slug": "dongducheon",
    "name": "동두천시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "songnae",
        "name": "송내동"
      },
      {
        "slug": "jihaeng",
        "name": "지행동"
      },
      {
        "slug": "saengyeon",
        "name": "생연동"
      },
      {
        "slug": "gwangam",
        "name": "광암동"
      },
      {
        "slug": "geolsan",
        "name": "걸산동"
      },
      {
        "slug": "bosan",
        "name": "보산동"
      },
      {
        "slug": "dongducheon",
        "name": "동두천동"
      },
      {
        "slug": "anheung",
        "name": "안흥동"
      },
      {
        "slug": "sangbongam",
        "name": "상봉암동"
      },
      {
        "slug": "habongam",
        "name": "하봉암동"
      },
      {
        "slug": "tapdong",
        "name": "탑동동"
      },
      {
        "slug": "sangpae",
        "name": "상패동"
      }
    ]
  },
  {
    "slug": "ansan",
    "name": "안산시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "ildong",
        "name": "일동",
        "gu": "상록구"
      },
      {
        "slug": "idong",
        "name": "이동",
        "gu": "상록구"
      },
      {
        "slug": "sadong",
        "name": "사동",
        "gu": "상록구"
      },
      {
        "slug": "bono",
        "name": "본오동",
        "gu": "상록구"
      },
      {
        "slug": "palgogi",
        "name": "팔곡이동",
        "gu": "상록구"
      },
      {
        "slug": "yangsang",
        "name": "양상동",
        "gu": "상록구"
      },
      {
        "slug": "bugok",
        "name": "부곡동",
        "gu": "상록구"
      },
      {
        "slug": "seongpo",
        "name": "성포동",
        "gu": "상록구"
      },
      {
        "slug": "wolpi",
        "name": "월피동",
        "gu": "상록구"
      },
      {
        "slug": "palgogil",
        "name": "팔곡일동",
        "gu": "상록구"
      },
      {
        "slug": "geongeon",
        "name": "건건동",
        "gu": "상록구"
      },
      {
        "slug": "sasa",
        "name": "사사동",
        "gu": "상록구"
      },
      {
        "slug": "suam",
        "name": "수암동",
        "gu": "상록구"
      },
      {
        "slug": "jangsang",
        "name": "장상동",
        "gu": "상록구"
      },
      {
        "slug": "jangha",
        "name": "장하동",
        "gu": "상록구"
      },
      {
        "slug": "gojan",
        "name": "고잔동",
        "gu": "단원구"
      },
      {
        "slug": "wadong",
        "name": "와동",
        "gu": "단원구"
      },
      {
        "slug": "singil",
        "name": "신길동",
        "gu": "단원구"
      },
      {
        "slug": "seonggok",
        "name": "성곡동",
        "gu": "단원구"
      },
      {
        "slug": "wonsi",
        "name": "원시동",
        "gu": "단원구"
      },
      {
        "slug": "mongnae",
        "name": "목내동",
        "gu": "단원구"
      },
      {
        "slug": "choji",
        "name": "초지동",
        "gu": "단원구"
      },
      {
        "slug": "wongok",
        "name": "원곡동",
        "gu": "단원구"
      },
      {
        "slug": "seonbu",
        "name": "선부동",
        "gu": "단원구"
      },
      {
        "slug": "daebudong",
        "name": "대부동동",
        "gu": "단원구"
      },
      {
        "slug": "daebubuk",
        "name": "대부북동",
        "gu": "단원구"
      },
      {
        "slug": "daebunam",
        "name": "대부남동",
        "gu": "단원구"
      },
      {
        "slug": "seongam",
        "name": "선감동",
        "gu": "단원구"
      },
      {
        "slug": "pungdo",
        "name": "풍도동",
        "gu": "단원구"
      },
      {
        "slug": "hwajeong",
        "name": "화정동",
        "gu": "단원구"
      }
    ]
  },
  {
    "slug": "goyang",
    "name": "고양시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "jugyo",
        "name": "주교동",
        "gu": "덕양구"
      },
      {
        "slug": "wondang",
        "name": "원당동",
        "gu": "덕양구"
      },
      {
        "slug": "sinwon",
        "name": "신원동",
        "gu": "덕양구"
      },
      {
        "slug": "wonheung",
        "name": "원흥동",
        "gu": "덕양구"
      },
      {
        "slug": "donae",
        "name": "도내동",
        "gu": "덕양구"
      },
      {
        "slug": "seongsa",
        "name": "성사동",
        "gu": "덕양구"
      },
      {
        "slug": "bukhan",
        "name": "북한동",
        "gu": "덕양구"
      },
      {
        "slug": "hyoja",
        "name": "효자동",
        "gu": "덕양구"
      },
      {
        "slug": "jichuk",
        "name": "지축동",
        "gu": "덕양구"
      },
      {
        "slug": "ogeum",
        "name": "오금동",
        "gu": "덕양구"
      },
      {
        "slug": "samsong",
        "name": "삼송동",
        "gu": "덕양구"
      },
      {
        "slug": "dongsan",
        "name": "동산동",
        "gu": "덕양구"
      },
      {
        "slug": "yongdu",
        "name": "용두동",
        "gu": "덕양구"
      },
      {
        "slug": "byeokje",
        "name": "벽제동",
        "gu": "덕양구"
      },
      {
        "slug": "seonyu",
        "name": "선유동",
        "gu": "덕양구"
      },
      {
        "slug": "goyang",
        "name": "고양동",
        "gu": "덕양구"
      },
      {
        "slug": "daeja",
        "name": "대자동",
        "gu": "덕양구"
      },
      {
        "slug": "gwansan",
        "name": "관산동",
        "gu": "덕양구"
      },
      {
        "slug": "naeyu",
        "name": "내유동",
        "gu": "덕양구"
      },
      {
        "slug": "todang",
        "name": "토당동",
        "gu": "덕양구"
      },
      {
        "slug": "naegok",
        "name": "내곡동",
        "gu": "덕양구"
      },
      {
        "slug": "daejang",
        "name": "대장동",
        "gu": "덕양구"
      },
      {
        "slug": "hwajeong",
        "name": "화정동",
        "gu": "덕양구"
      },
      {
        "slug": "gangmae",
        "name": "강매동",
        "gu": "덕양구"
      },
      {
        "slug": "haengjunae",
        "name": "행주내동",
        "gu": "덕양구"
      },
      {
        "slug": "haengjuoe",
        "name": "행주외동",
        "gu": "덕양구"
      },
      {
        "slug": "sinpyeong",
        "name": "신평동",
        "gu": "덕양구"
      },
      {
        "slug": "haengsin",
        "name": "행신동",
        "gu": "덕양구"
      },
      {
        "slug": "hwajeon",
        "name": "화전동",
        "gu": "덕양구"
      },
      {
        "slug": "hyeoncheon",
        "name": "현천동",
        "gu": "덕양구"
      },
      {
        "slug": "deogeun",
        "name": "덕은동",
        "gu": "덕양구"
      },
      {
        "slug": "hyangdong",
        "name": "향동동",
        "gu": "덕양구"
      },
      {
        "slug": "siksa",
        "name": "식사동",
        "gu": "일산동구"
      },
      {
        "slug": "jungsan",
        "name": "중산동",
        "gu": "일산동구"
      },
      {
        "slug": "jeongbalsan",
        "name": "정발산동",
        "gu": "일산동구"
      },
      {
        "slug": "janghang",
        "name": "장항동",
        "gu": "일산동구"
      },
      {
        "slug": "madu",
        "name": "마두동",
        "gu": "일산동구"
      },
      {
        "slug": "baekseok",
        "name": "백석동",
        "gu": "일산동구"
      },
      {
        "slug": "pung",
        "name": "풍동",
        "gu": "일산동구"
      },
      {
        "slug": "sanhwang",
        "name": "산황동",
        "gu": "일산동구"
      },
      {
        "slug": "sarihyeon",
        "name": "사리현동",
        "gu": "일산동구"
      },
      {
        "slug": "jiyeong",
        "name": "지영동",
        "gu": "일산동구"
      },
      {
        "slug": "seolmun",
        "name": "설문동",
        "gu": "일산동구"
      },
      {
        "slug": "munbong",
        "name": "문봉동",
        "gu": "일산동구"
      },
      {
        "slug": "seongseok",
        "name": "성석동",
        "gu": "일산동구"
      },
      {
        "slug": "ilsan",
        "name": "일산동",
        "gu": "일산서구"
      },
      {
        "slug": "juyeop",
        "name": "주엽동",
        "gu": "일산서구"
      },
      {
        "slug": "tanhyeon",
        "name": "탄현동",
        "gu": "일산서구"
      },
      {
        "slug": "daehwa",
        "name": "대화동",
        "gu": "일산서구"
      },
      {
        "slug": "deogi",
        "name": "덕이동",
        "gu": "일산서구"
      },
      {
        "slug": "gajwa",
        "name": "가좌동",
        "gu": "일산서구"
      },
      {
        "slug": "gusan",
        "name": "구산동",
        "gu": "일산서구"
      },
      {
        "slug": "beopgot",
        "name": "법곳동",
        "gu": "일산서구"
      }
    ]
  },
  {
    "slug": "gwacheon",
    "name": "과천시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "gwanmun",
        "name": "관문동"
      },
      {
        "slug": "munwon",
        "name": "문원동"
      },
      {
        "slug": "galhyeon",
        "name": "갈현동"
      },
      {
        "slug": "makgye",
        "name": "막계동"
      },
      {
        "slug": "gwacheon",
        "name": "과천동"
      },
      {
        "slug": "juam",
        "name": "주암동"
      },
      {
        "slug": "jungang",
        "name": "중앙동"
      },
      {
        "slug": "wonmun",
        "name": "원문동"
      },
      {
        "slug": "byeoryang",
        "name": "별양동"
      },
      {
        "slug": "burim",
        "name": "부림동"
      }
    ]
  },
  {
    "slug": "guri",
    "name": "구리시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "galmae",
        "name": "갈매동"
      },
      {
        "slug": "sano",
        "name": "사노동"
      },
      {
        "slug": "inchang",
        "name": "인창동"
      },
      {
        "slug": "gyomun",
        "name": "교문동"
      },
      {
        "slug": "sutaek",
        "name": "수택동"
      },
      {
        "slug": "acheon",
        "name": "아천동"
      },
      {
        "slug": "topyeong",
        "name": "토평동"
      }
    ]
  },
  {
    "slug": "namyangju",
    "name": "남양주시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "hopyeong",
        "name": "호평동"
      },
      {
        "slug": "pyeongnae",
        "name": "평내동"
      },
      {
        "slug": "geumgok",
        "name": "금곡동"
      },
      {
        "slug": "ilpae",
        "name": "일패동"
      },
      {
        "slug": "ipae",
        "name": "이패동"
      },
      {
        "slug": "sampae",
        "name": "삼패동"
      },
      {
        "slug": "suseok",
        "name": "수석동"
      },
      {
        "slug": "jigeum",
        "name": "지금동"
      },
      {
        "slug": "donong",
        "name": "도농동"
      },
      {
        "slug": "byeolnae",
        "name": "별내동"
      },
      {
        "slug": "dasan",
        "name": "다산동"
      },
      {
        "slug": "wabu-eup",
        "name": "와부읍"
      },
      {
        "slug": "jinjeop-eup",
        "name": "진접읍"
      },
      {
        "slug": "hwado-eup",
        "name": "화도읍"
      },
      {
        "slug": "jingeon-eup",
        "name": "진건읍"
      },
      {
        "slug": "onam-eup",
        "name": "오남읍"
      },
      {
        "slug": "toegyewon-eup",
        "name": "퇴계원읍"
      },
      {
        "slug": "byeolnae-myeon",
        "name": "별내면"
      },
      {
        "slug": "sudong-myeon",
        "name": "수동면"
      },
      {
        "slug": "joan-myeon",
        "name": "조안면"
      }
    ]
  },
  {
    "slug": "osan",
    "name": "오산시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "osan",
        "name": "오산동"
      },
      {
        "slug": "busan",
        "name": "부산동"
      },
      {
        "slug": "won",
        "name": "원동"
      },
      {
        "slug": "gwol",
        "name": "궐동"
      },
      {
        "slug": "cheonghak",
        "name": "청학동"
      },
      {
        "slug": "gajang",
        "name": "가장동"
      },
      {
        "slug": "geumam",
        "name": "금암동"
      },
      {
        "slug": "sucheong",
        "name": "수청동"
      },
      {
        "slug": "eungye",
        "name": "은계동"
      },
      {
        "slug": "naesammi",
        "name": "내삼미동"
      },
      {
        "slug": "oesammi",
        "name": "외삼미동"
      },
      {
        "slug": "yangsan",
        "name": "양산동"
      },
      {
        "slug": "segyo",
        "name": "세교동"
      },
      {
        "slug": "jigot",
        "name": "지곶동"
      },
      {
        "slug": "seorang",
        "name": "서랑동"
      },
      {
        "slug": "seo",
        "name": "서동"
      },
      {
        "slug": "beoreum",
        "name": "벌음동"
      },
      {
        "slug": "dugok",
        "name": "두곡동"
      },
      {
        "slug": "tap",
        "name": "탑동"
      },
      {
        "slug": "nueup",
        "name": "누읍동"
      },
      {
        "slug": "gasu",
        "name": "가수동"
      },
      {
        "slug": "gohyeon",
        "name": "고현동"
      },
      {
        "slug": "cheongho",
        "name": "청호동"
      },
      {
        "slug": "galgot",
        "name": "갈곶동"
      }
    ]
  },
  {
    "slug": "siheung",
    "name": "시흥시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "daeya",
        "name": "대야동"
      },
      {
        "slug": "sincheon",
        "name": "신천동"
      },
      {
        "slug": "bangsan",
        "name": "방산동"
      },
      {
        "slug": "po",
        "name": "포동"
      },
      {
        "slug": "misan",
        "name": "미산동"
      },
      {
        "slug": "eunhaeng",
        "name": "은행동"
      },
      {
        "slug": "anhyeon",
        "name": "안현동"
      },
      {
        "slug": "maehwa",
        "name": "매화동"
      },
      {
        "slug": "dochang",
        "name": "도창동"
      },
      {
        "slug": "geumi",
        "name": "금이동"
      },
      {
        "slug": "gwarim",
        "name": "과림동"
      },
      {
        "slug": "gyesu",
        "name": "계수동"
      },
      {
        "slug": "hwajeong",
        "name": "화정동"
      },
      {
        "slug": "neunggok",
        "name": "능곡동"
      },
      {
        "slug": "hajung",
        "name": "하중동"
      },
      {
        "slug": "hasang",
        "name": "하상동"
      },
      {
        "slug": "gwangseok",
        "name": "광석동"
      },
      {
        "slug": "murwang",
        "name": "물왕동"
      },
      {
        "slug": "sanhyeon",
        "name": "산현동"
      },
      {
        "slug": "jonam",
        "name": "조남동"
      },
      {
        "slug": "nongok",
        "name": "논곡동"
      },
      {
        "slug": "mokgam",
        "name": "목감동"
      },
      {
        "slug": "geomo",
        "name": "거모동"
      },
      {
        "slug": "gunja",
        "name": "군자동"
      },
      {
        "slug": "janghyeon",
        "name": "장현동"
      },
      {
        "slug": "janggok",
        "name": "장곡동"
      },
      {
        "slug": "wolgot",
        "name": "월곶동"
      },
      {
        "slug": "jeongwang",
        "name": "정왕동"
      },
      {
        "slug": "jugyul",
        "name": "죽율동"
      },
      {
        "slug": "mujinae",
        "name": "무지내동"
      },
      {
        "slug": "baegot",
        "name": "배곧동"
      }
    ]
  },
  {
    "slug": "gunpo",
    "name": "군포시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "dang",
        "name": "당동"
      },
      {
        "slug": "dangjeong",
        "name": "당정동"
      },
      {
        "slug": "bugok",
        "name": "부곡동"
      },
      {
        "slug": "sanbon",
        "name": "산본동"
      },
      {
        "slug": "geumjeong",
        "name": "금정동"
      },
      {
        "slug": "dundae",
        "name": "둔대동"
      },
      {
        "slug": "sokdal",
        "name": "속달동"
      },
      {
        "slug": "daeyami",
        "name": "대야미동"
      },
      {
        "slug": "domagyo",
        "name": "도마교동"
      }
    ]
  },
  {
    "slug": "uiwang",
    "name": "의왕시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "gocheon",
        "name": "고천동"
      },
      {
        "slug": "i",
        "name": "이동"
      },
      {
        "slug": "sam",
        "name": "삼동"
      },
      {
        "slug": "wanggok",
        "name": "왕곡동"
      },
      {
        "slug": "ojeon",
        "name": "오전동"
      },
      {
        "slug": "hagui",
        "name": "학의동"
      },
      {
        "slug": "naeson",
        "name": "내손동"
      },
      {
        "slug": "cheonggye",
        "name": "청계동"
      },
      {
        "slug": "poil",
        "name": "포일동"
      },
      {
        "slug": "woram",
        "name": "월암동"
      },
      {
        "slug": "chopyeong",
        "name": "초평동"
      }
    ]
  },
  {
    "slug": "hanam",
    "name": "하남시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "cheonhyeon",
        "name": "천현동"
      },
      {
        "slug": "hasangok",
        "name": "하산곡동"
      },
      {
        "slug": "changu",
        "name": "창우동"
      },
      {
        "slug": "baealmi",
        "name": "배알미동"
      },
      {
        "slug": "sangsangok",
        "name": "상산곡동"
      },
      {
        "slug": "sinjang",
        "name": "신장동"
      },
      {
        "slug": "dangjeong",
        "name": "당정동"
      },
      {
        "slug": "deokpung",
        "name": "덕풍동"
      },
      {
        "slug": "mangwol",
        "name": "망월동"
      },
      {
        "slug": "pungsan",
        "name": "풍산동"
      },
      {
        "slug": "misa",
        "name": "미사동"
      },
      {
        "slug": "seon",
        "name": "선동"
      },
      {
        "slug": "gambuk",
        "name": "감북동"
      },
      {
        "slug": "gamil",
        "name": "감일동"
      },
      {
        "slug": "gami",
        "name": "감이동"
      },
      {
        "slug": "hagam",
        "name": "학암동"
      },
      {
        "slug": "gyosan",
        "name": "교산동"
      },
      {
        "slug": "chungung",
        "name": "춘궁동"
      },
      {
        "slug": "hasachang",
        "name": "하사창동"
      },
      {
        "slug": "sangsachang",
        "name": "상사창동"
      },
      {
        "slug": "hang",
        "name": "항동"
      },
      {
        "slug": "choil",
        "name": "초일동"
      },
      {
        "slug": "choi",
        "name": "초이동"
      },
      {
        "slug": "gwangam",
        "name": "광암동"
      }
    ]
  },
  {
    "slug": "yongin",
    "name": "용인시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "gimnyangjang",
        "name": "김량장동",
        "gu": "처인구"
      },
      {
        "slug": "yeokbuk",
        "name": "역북동",
        "gu": "처인구"
      },
      {
        "slug": "samga",
        "name": "삼가동",
        "gu": "처인구"
      },
      {
        "slug": "nam",
        "name": "남동",
        "gu": "처인구"
      },
      {
        "slug": "yubang",
        "name": "유방동",
        "gu": "처인구"
      },
      {
        "slug": "gorim",
        "name": "고림동",
        "gu": "처인구"
      },
      {
        "slug": "mapyeong",
        "name": "마평동",
        "gu": "처인구"
      },
      {
        "slug": "unhak",
        "name": "운학동",
        "gu": "처인구"
      },
      {
        "slug": "ho",
        "name": "호동",
        "gu": "처인구"
      },
      {
        "slug": "haegok",
        "name": "해곡동",
        "gu": "처인구"
      },
      {
        "slug": "pogok-eup",
        "name": "포곡읍",
        "gu": "처인구"
      },
      {
        "slug": "mohyeon-eup",
        "name": "모현읍",
        "gu": "처인구"
      },
      {
        "slug": "idong-eup",
        "name": "이동읍",
        "gu": "처인구"
      },
      {
        "slug": "namsa-eup",
        "name": "남사읍",
        "gu": "처인구"
      },
      {
        "slug": "wonsam-myeon",
        "name": "원삼면",
        "gu": "처인구"
      },
      {
        "slug": "baegam-myeon",
        "name": "백암면",
        "gu": "처인구"
      },
      {
        "slug": "yangji-myeon",
        "name": "양지면",
        "gu": "처인구"
      },
      {
        "slug": "singal",
        "name": "신갈동",
        "gu": "기흥구"
      },
      {
        "slug": "gugal",
        "name": "구갈동",
        "gu": "기흥구"
      },
      {
        "slug": "sanggal",
        "name": "상갈동",
        "gu": "기흥구"
      },
      {
        "slug": "hagal",
        "name": "하갈동",
        "gu": "기흥구"
      },
      {
        "slug": "bora",
        "name": "보라동",
        "gu": "기흥구"
      },
      {
        "slug": "jigok",
        "name": "지곡동",
        "gu": "기흥구"
      },
      {
        "slug": "gongse",
        "name": "공세동",
        "gu": "기흥구"
      },
      {
        "slug": "gomae",
        "name": "고매동",
        "gu": "기흥구"
      },
      {
        "slug": "nongseo",
        "name": "농서동",
        "gu": "기흥구"
      },
      {
        "slug": "seocheon",
        "name": "서천동",
        "gu": "기흥구"
      },
      {
        "slug": "yeongdeok",
        "name": "영덕동",
        "gu": "기흥구"
      },
      {
        "slug": "eonnam",
        "name": "언남동",
        "gu": "기흥구"
      },
      {
        "slug": "mabuk",
        "name": "마북동",
        "gu": "기흥구"
      },
      {
        "slug": "cheongdeok",
        "name": "청덕동",
        "gu": "기흥구"
      },
      {
        "slug": "dongbaek",
        "name": "동백동",
        "gu": "기흥구"
      },
      {
        "slug": "jung",
        "name": "중동",
        "gu": "기흥구"
      },
      {
        "slug": "sangha",
        "name": "상하동",
        "gu": "기흥구"
      },
      {
        "slug": "bojeong",
        "name": "보정동",
        "gu": "기흥구"
      },
      {
        "slug": "pungdeokcheon",
        "name": "풍덕천동",
        "gu": "수지구"
      },
      {
        "slug": "jukjeon",
        "name": "죽전동",
        "gu": "수지구"
      },
      {
        "slug": "dongcheon",
        "name": "동천동",
        "gu": "수지구"
      },
      {
        "slug": "gogi",
        "name": "고기동",
        "gu": "수지구"
      },
      {
        "slug": "sinbong",
        "name": "신봉동",
        "gu": "수지구"
      },
      {
        "slug": "seongbok",
        "name": "성복동",
        "gu": "수지구"
      },
      {
        "slug": "sanghyeon",
        "name": "상현동",
        "gu": "수지구"
      }
    ]
  },
  {
    "slug": "paju",
    "name": "파주시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "geumchon",
        "name": "금촌동"
      },
      {
        "slug": "adong",
        "name": "아동동"
      },
      {
        "slug": "yadong",
        "name": "야동동"
      },
      {
        "slug": "geomsan",
        "name": "검산동"
      },
      {
        "slug": "maekgeum",
        "name": "맥금동"
      },
      {
        "slug": "gyoha",
        "name": "교하동"
      },
      {
        "slug": "yadang",
        "name": "야당동"
      },
      {
        "slug": "dayul",
        "name": "다율동"
      },
      {
        "slug": "odo",
        "name": "오도동"
      },
      {
        "slug": "sangjiseok",
        "name": "상지석동"
      },
      {
        "slug": "sannam",
        "name": "산남동"
      },
      {
        "slug": "dongpae",
        "name": "동패동"
      },
      {
        "slug": "dangha",
        "name": "당하동"
      },
      {
        "slug": "munbal",
        "name": "문발동"
      },
      {
        "slug": "songchon",
        "name": "송촌동"
      },
      {
        "slug": "mokdong",
        "name": "목동동"
      },
      {
        "slug": "hajiseok",
        "name": "하지석동"
      },
      {
        "slug": "seopae",
        "name": "서패동"
      },
      {
        "slug": "sinchon",
        "name": "신촌동"
      },
      {
        "slug": "yeondasan",
        "name": "연다산동"
      },
      {
        "slug": "wadong",
        "name": "와동동"
      },
      {
        "slug": "geumneung",
        "name": "금릉동"
      },
      {
        "slug": "munsan-eup",
        "name": "문산읍"
      },
      {
        "slug": "paju-eup",
        "name": "파주읍"
      },
      {
        "slug": "beobwon-eup",
        "name": "법원읍"
      },
      {
        "slug": "jori-eup",
        "name": "조리읍"
      },
      {
        "slug": "wollong-myeon",
        "name": "월롱면"
      },
      {
        "slug": "tanhyeon-myeon",
        "name": "탄현면"
      },
      {
        "slug": "gwangtan-myeon",
        "name": "광탄면"
      },
      {
        "slug": "papyeong-myeon",
        "name": "파평면"
      },
      {
        "slug": "jeokseong-myeon",
        "name": "적성면"
      },
      {
        "slug": "gunnae-myeon",
        "name": "군내면"
      },
      {
        "slug": "jangdan-myeon",
        "name": "장단면"
      },
      {
        "slug": "jindong-myeon",
        "name": "진동면"
      },
      {
        "slug": "jinseo-myeon",
        "name": "진서면"
      }
    ]
  },
  {
    "slug": "icheon",
    "name": "이천시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "changjeon",
        "name": "창전동"
      },
      {
        "slug": "gwango",
        "name": "관고동"
      },
      {
        "slug": "jungni",
        "name": "중리동"
      },
      {
        "slug": "jeungil",
        "name": "증일동"
      },
      {
        "slug": "yulhyeon",
        "name": "율현동"
      },
      {
        "slug": "jilli",
        "name": "진리동"
      },
      {
        "slug": "anheung",
        "name": "안흥동"
      },
      {
        "slug": "galsan",
        "name": "갈산동"
      },
      {
        "slug": "jeungpo",
        "name": "증포동"
      },
      {
        "slug": "songjeong",
        "name": "송정동"
      },
      {
        "slug": "saeum",
        "name": "사음동"
      },
      {
        "slug": "danwol",
        "name": "단월동"
      },
      {
        "slug": "daepo",
        "name": "대포동"
      },
      {
        "slug": "godam",
        "name": "고담동"
      },
      {
        "slug": "jangnok",
        "name": "장록동"
      },
      {
        "slug": "janghowon-eup",
        "name": "장호원읍"
      },
      {
        "slug": "bubal-eup",
        "name": "부발읍"
      },
      {
        "slug": "sindun-myeon",
        "name": "신둔면"
      },
      {
        "slug": "baeksa-myeon",
        "name": "백사면"
      },
      {
        "slug": "hobeop-myeon",
        "name": "호법면"
      },
      {
        "slug": "majang-myeon",
        "name": "마장면"
      },
      {
        "slug": "daewol-myeon",
        "name": "대월면"
      },
      {
        "slug": "moga-myeon",
        "name": "모가면"
      },
      {
        "slug": "seolseong-myeon",
        "name": "설성면"
      },
      {
        "slug": "yulmyeon",
        "name": "율면"
      }
    ]
  },
  {
    "slug": "anseong",
    "name": "안성시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "bongsan",
        "name": "봉산동"
      },
      {
        "slug": "sungin",
        "name": "숭인동"
      },
      {
        "slug": "yeong",
        "name": "영동"
      },
      {
        "slug": "bongnam",
        "name": "봉남동"
      },
      {
        "slug": "gupo",
        "name": "구포동"
      },
      {
        "slug": "dongbon",
        "name": "동본동"
      },
      {
        "slug": "myeongnyun",
        "name": "명륜동"
      },
      {
        "slug": "okcheon",
        "name": "옥천동"
      },
      {
        "slug": "nagwon",
        "name": "낙원동"
      },
      {
        "slug": "changjeon",
        "name": "창전동"
      },
      {
        "slug": "seongnam",
        "name": "성남동"
      },
      {
        "slug": "sinheung",
        "name": "신흥동"
      },
      {
        "slug": "inji",
        "name": "인지동"
      },
      {
        "slug": "geumsan",
        "name": "금산동"
      },
      {
        "slug": "yeonji",
        "name": "연지동"
      },
      {
        "slug": "daecheon",
        "name": "대천동"
      },
      {
        "slug": "seoin",
        "name": "서인동"
      },
      {
        "slug": "seokjeong",
        "name": "석정동"
      },
      {
        "slug": "ayang",
        "name": "아양동"
      },
      {
        "slug": "geumseok",
        "name": "금석동"
      },
      {
        "slug": "gye",
        "name": "계동"
      },
      {
        "slug": "oksan",
        "name": "옥산동"
      },
      {
        "slug": "sagok",
        "name": "사곡동"
      },
      {
        "slug": "dogi",
        "name": "도기동"
      },
      {
        "slug": "dangwang",
        "name": "당왕동"
      },
      {
        "slug": "gasa",
        "name": "가사동"
      },
      {
        "slug": "gahyeon",
        "name": "가현동"
      },
      {
        "slug": "singeonji",
        "name": "신건지동"
      },
      {
        "slug": "sinsohyeon",
        "name": "신소현동"
      },
      {
        "slug": "sinmosan",
        "name": "신모산동"
      },
      {
        "slug": "hyeonsu",
        "name": "현수동"
      },
      {
        "slug": "balhwa",
        "name": "발화동"
      },
      {
        "slug": "jungni",
        "name": "중리동"
      },
      {
        "slug": "gongdo-eup",
        "name": "공도읍"
      },
      {
        "slug": "bogae-myeon",
        "name": "보개면"
      },
      {
        "slug": "geumgwang-myeon",
        "name": "금광면"
      },
      {
        "slug": "seoun-myeon",
        "name": "서운면"
      },
      {
        "slug": "miyang-myeon",
        "name": "미양면"
      },
      {
        "slug": "daedeok-myeon",
        "name": "대덕면"
      },
      {
        "slug": "yangseong-myeon",
        "name": "양성면"
      },
      {
        "slug": "wongok-myeon",
        "name": "원곡면"
      },
      {
        "slug": "iljuk-myeon",
        "name": "일죽면"
      },
      {
        "slug": "juksan-myeon",
        "name": "죽산면"
      },
      {
        "slug": "samjuk-myeon",
        "name": "삼죽면"
      },
      {
        "slug": "gosam-myeon",
        "name": "고삼면"
      }
    ]
  },
  {
    "slug": "gimpo",
    "name": "김포시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "bukbyeon",
        "name": "북변동"
      },
      {
        "slug": "geolpo",
        "name": "걸포동"
      },
      {
        "slug": "unyang",
        "name": "운양동"
      },
      {
        "slug": "janggi",
        "name": "장기동"
      },
      {
        "slug": "gamjeong",
        "name": "감정동"
      },
      {
        "slug": "sau",
        "name": "사우동"
      },
      {
        "slug": "pungmu",
        "name": "풍무동"
      },
      {
        "slug": "masan",
        "name": "마산동"
      },
      {
        "slug": "gurae",
        "name": "구래동"
      },
      {
        "slug": "tongjin-eup",
        "name": "통진읍"
      },
      {
        "slug": "gochon-eup",
        "name": "고촌읍"
      },
      {
        "slug": "yangchon-eup",
        "name": "양촌읍"
      },
      {
        "slug": "daegot-myeon",
        "name": "대곶면"
      },
      {
        "slug": "wolgot-myeon",
        "name": "월곶면"
      },
      {
        "slug": "haseong-myeon",
        "name": "하성면"
      }
    ]
  },
  {
    "slug": "hwaseong",
    "name": "화성시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "jinan",
        "name": "진안동"
      },
      {
        "slug": "byeongjeom",
        "name": "병점동"
      },
      {
        "slug": "neungdong",
        "name": "능동"
      },
      {
        "slug": "gisan",
        "name": "기산동"
      },
      {
        "slug": "banwol",
        "name": "반월동"
      },
      {
        "slug": "banjeong",
        "name": "반정동"
      },
      {
        "slug": "hwanggye",
        "name": "황계동"
      },
      {
        "slug": "baeyang",
        "name": "배양동"
      },
      {
        "slug": "gian",
        "name": "기안동"
      },
      {
        "slug": "songsan",
        "name": "송산동"
      },
      {
        "slug": "annyeong",
        "name": "안녕동"
      },
      {
        "slug": "bansong",
        "name": "반송동"
      },
      {
        "slug": "seogu",
        "name": "석우동"
      },
      {
        "slug": "osan",
        "name": "오산동"
      },
      {
        "slug": "cheonggye",
        "name": "청계동"
      },
      {
        "slug": "yeongcheon",
        "name": "영천동"
      },
      {
        "slug": "jungdong",
        "name": "중동"
      },
      {
        "slug": "sindong",
        "name": "신동"
      },
      {
        "slug": "mokdong",
        "name": "목동"
      },
      {
        "slug": "sancheok",
        "name": "산척동"
      },
      {
        "slug": "jangji",
        "name": "장지동"
      },
      {
        "slug": "songdong",
        "name": "송동"
      },
      {
        "slug": "banggyo",
        "name": "방교동"
      },
      {
        "slug": "geumgok",
        "name": "금곡동"
      },
      {
        "slug": "saesol",
        "name": "새솔동"
      },
      {
        "slug": "bongdam-eup",
        "name": "봉담읍"
      },
      {
        "slug": "ujeong-eup",
        "name": "우정읍"
      },
      {
        "slug": "hyangnam-eup",
        "name": "향남읍"
      },
      {
        "slug": "namyang-eup",
        "name": "남양읍"
      },
      {
        "slug": "maesong-myeon",
        "name": "매송면"
      },
      {
        "slug": "bibong-myeon",
        "name": "비봉면"
      },
      {
        "slug": "mado-myeon",
        "name": "마도면"
      },
      {
        "slug": "songsan-myeon",
        "name": "송산면"
      },
      {
        "slug": "seosin-myeon",
        "name": "서신면"
      },
      {
        "slug": "paltan-myeon",
        "name": "팔탄면"
      },
      {
        "slug": "jangan-myeon",
        "name": "장안면"
      },
      {
        "slug": "yanggam-myeon",
        "name": "양감면"
      },
      {
        "slug": "jeongnam-myeon",
        "name": "정남면"
      }
    ]
  },
  {
    "slug": "gwangju",
    "name": "광주시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "gyeongan",
        "name": "경안동"
      },
      {
        "slug": "ssangnyeong",
        "name": "쌍령동"
      },
      {
        "slug": "songjeong",
        "name": "송정동"
      },
      {
        "slug": "hoedeok",
        "name": "회덕동"
      },
      {
        "slug": "tanbeol",
        "name": "탄벌동"
      },
      {
        "slug": "mokhyeon",
        "name": "목현동"
      },
      {
        "slug": "sam",
        "name": "삼동"
      },
      {
        "slug": "jungdae",
        "name": "중대동"
      },
      {
        "slug": "jik",
        "name": "직동"
      },
      {
        "slug": "taejeon",
        "name": "태전동"
      },
      {
        "slug": "jangji",
        "name": "장지동"
      },
      {
        "slug": "yeok",
        "name": "역동"
      },
      {
        "slug": "mok",
        "name": "목동"
      },
      {
        "slug": "gosan",
        "name": "고산동"
      },
      {
        "slug": "sinhyeon",
        "name": "신현동"
      },
      {
        "slug": "neungpyeong",
        "name": "능평동"
      },
      {
        "slug": "munhyeong",
        "name": "문형동"
      },
      {
        "slug": "chuja",
        "name": "추자동"
      },
      {
        "slug": "maesan",
        "name": "매산동"
      },
      {
        "slug": "yangbeol",
        "name": "양벌동"
      },
      {
        "slug": "chowol-eup",
        "name": "초월읍"
      },
      {
        "slug": "gonjiam-eup",
        "name": "곤지암읍"
      },
      {
        "slug": "docheok-myeon",
        "name": "도척면"
      },
      {
        "slug": "toechon-myeon",
        "name": "퇴촌면"
      },
      {
        "slug": "namjong-myeon",
        "name": "남종면"
      },
      {
        "slug": "namhansanseong-myeon",
        "name": "남한산성면"
      }
    ]
  },
  {
    "slug": "yangju",
    "name": "양주시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "yuyang",
        "name": "유양동"
      },
      {
        "slug": "eodun",
        "name": "어둔동"
      },
      {
        "slug": "nambang",
        "name": "남방동"
      },
      {
        "slug": "majeon",
        "name": "마전동"
      },
      {
        "slug": "sanbuk",
        "name": "산북동"
      },
      {
        "slug": "gwangsa",
        "name": "광사동"
      },
      {
        "slug": "mansong",
        "name": "만송동"
      },
      {
        "slug": "samsung",
        "name": "삼숭동"
      },
      {
        "slug": "goeup",
        "name": "고읍동"
      },
      {
        "slug": "deokjeong",
        "name": "덕정동"
      },
      {
        "slug": "bongyang",
        "name": "봉양동"
      },
      {
        "slug": "hoeam",
        "name": "회암동"
      },
      {
        "slug": "yuljeong",
        "name": "율정동"
      },
      {
        "slug": "okjeong",
        "name": "옥정동"
      },
      {
        "slug": "goam",
        "name": "고암동"
      },
      {
        "slug": "deokgye",
        "name": "덕계동"
      },
      {
        "slug": "hoejeong",
        "name": "회정동"
      },
      {
        "slug": "baekseok-eup",
        "name": "백석읍"
      },
      {
        "slug": "eunhyeon-myeon",
        "name": "은현면"
      },
      {
        "slug": "nammyeon",
        "name": "남면"
      },
      {
        "slug": "gwangjeok-myeon",
        "name": "광적면"
      },
      {
        "slug": "jangheung-myeon",
        "name": "장흥면"
      }
    ]
  },
  {
    "slug": "pocheon",
    "name": "포천시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "sineup",
        "name": "신읍동"
      },
      {
        "slug": "eoryong",
        "name": "어룡동"
      },
      {
        "slug": "jajak",
        "name": "자작동"
      },
      {
        "slug": "seondan",
        "name": "선단동"
      },
      {
        "slug": "seorun",
        "name": "설운동"
      },
      {
        "slug": "donggyo",
        "name": "동교동"
      },
      {
        "slug": "soheul-eup",
        "name": "소흘읍"
      },
      {
        "slug": "gunnae-myeon",
        "name": "군내면"
      },
      {
        "slug": "naechon-myeon",
        "name": "내촌면"
      },
      {
        "slug": "gasan-myeon",
        "name": "가산면"
      },
      {
        "slug": "sinbuk-myeon",
        "name": "신북면"
      },
      {
        "slug": "changsu-myeon",
        "name": "창수면"
      },
      {
        "slug": "yeongjung-myeon",
        "name": "영중면"
      },
      {
        "slug": "ildong-myeon",
        "name": "일동면"
      },
      {
        "slug": "idong-myeon",
        "name": "이동면"
      },
      {
        "slug": "yeongbuk-myeon",
        "name": "영북면"
      },
      {
        "slug": "gwanin-myeon",
        "name": "관인면"
      },
      {
        "slug": "hwahyeon-myeon",
        "name": "화현면"
      }
    ]
  },
  {
    "slug": "yeoju",
    "name": "여주시",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "sangdong",
        "name": "상동"
      },
      {
        "slug": "hongmun",
        "name": "홍문동"
      },
      {
        "slug": "changdong",
        "name": "창동"
      },
      {
        "slug": "uman",
        "name": "우만동"
      },
      {
        "slug": "danhyeon",
        "name": "단현동"
      },
      {
        "slug": "sinjin",
        "name": "신진동"
      },
      {
        "slug": "hadong",
        "name": "하동"
      },
      {
        "slug": "gyodong",
        "name": "교동"
      },
      {
        "slug": "wolsong",
        "name": "월송동"
      },
      {
        "slug": "gaeop",
        "name": "가업동"
      },
      {
        "slug": "yeolla",
        "name": "연라동"
      },
      {
        "slug": "sanggeo",
        "name": "상거동"
      },
      {
        "slug": "hageo",
        "name": "하거동"
      },
      {
        "slug": "samgyo",
        "name": "삼교동"
      },
      {
        "slug": "jeombong",
        "name": "점봉동"
      },
      {
        "slug": "neunghyeon",
        "name": "능현동"
      },
      {
        "slug": "myeokgok",
        "name": "멱곡동"
      },
      {
        "slug": "yeonyang",
        "name": "연양동"
      },
      {
        "slug": "maeryong",
        "name": "매룡동"
      },
      {
        "slug": "cheonsong",
        "name": "천송동"
      },
      {
        "slug": "ohak",
        "name": "오학동"
      },
      {
        "slug": "hyeonam",
        "name": "현암동"
      },
      {
        "slug": "ogeum",
        "name": "오금동"
      },
      {
        "slug": "ganam-eup",
        "name": "가남읍"
      },
      {
        "slug": "jeomdong-myeon",
        "name": "점동면"
      },
      {
        "slug": "heungcheon-myeon",
        "name": "흥천면"
      },
      {
        "slug": "geumsa-myeon",
        "name": "금사면"
      },
      {
        "slug": "sejongdaewang-myeon",
        "name": "세종대왕면"
      },
      {
        "slug": "daesin-myeon",
        "name": "대신면"
      },
      {
        "slug": "bungnae-myeon",
        "name": "북내면"
      },
      {
        "slug": "gangcheon-myeon",
        "name": "강천면"
      },
      {
        "slug": "sanbuk-myeon",
        "name": "산북면"
      }
    ]
  },
  {
    "slug": "yeoncheon",
    "name": "연천군",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "yeoncheon-eup",
        "name": "연천읍"
      },
      {
        "slug": "jeongok-eup",
        "name": "전곡읍"
      },
      {
        "slug": "gunnam-myeon",
        "name": "군남면"
      },
      {
        "slug": "cheongsan-myeon",
        "name": "청산면"
      },
      {
        "slug": "baekhak-myeon",
        "name": "백학면"
      },
      {
        "slug": "misan-myeon",
        "name": "미산면"
      },
      {
        "slug": "wangjing-myeon",
        "name": "왕징면"
      },
      {
        "slug": "sinseo-myeon",
        "name": "신서면"
      },
      {
        "slug": "jungmyeon",
        "name": "중면"
      },
      {
        "slug": "jangnam-myeon",
        "name": "장남면"
      }
    ]
  },
  {
    "slug": "gapyeong",
    "name": "가평군",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "gapyeong-eup",
        "name": "가평읍"
      },
      {
        "slug": "seorak-myeon",
        "name": "설악면"
      },
      {
        "slug": "cheongpyeong-myeon",
        "name": "청평면"
      },
      {
        "slug": "sangmyeon",
        "name": "상면"
      },
      {
        "slug": "jojong-myeon",
        "name": "조종면"
      },
      {
        "slug": "bungmyeon",
        "name": "북면"
      }
    ]
  },
  {
    "slug": "yangpyeong",
    "name": "양평군",
    "region": "gyeonggi",
    "dongs": [
      {
        "slug": "yangpyeong-eup",
        "name": "양평읍"
      },
      {
        "slug": "gangsang-myeon",
        "name": "강상면"
      },
      {
        "slug": "gangha-myeon",
        "name": "강하면"
      },
      {
        "slug": "yangseo-myeon",
        "name": "양서면"
      },
      {
        "slug": "okcheon-myeon",
        "name": "옥천면"
      },
      {
        "slug": "seojong-myeon",
        "name": "서종면"
      },
      {
        "slug": "danwol-myeon",
        "name": "단월면"
      },
      {
        "slug": "cheongun-myeon",
        "name": "청운면"
      },
      {
        "slug": "yangdong-myeon",
        "name": "양동면"
      },
      {
        "slug": "jipyeong-myeon",
        "name": "지평면"
      },
      {
        "slug": "yongmun-myeon",
        "name": "용문면"
      },
      {
        "slug": "gaegun-myeon",
        "name": "개군면"
      }
    ]
  }
];

export function getDistrictCity(region: string, slug: string): DistrictCity | undefined {
  return districtCities.find((city) => city.region === region && city.slug === slug);
}

export function getDong(city: DistrictCity, dongSlug: string): DistrictDong | undefined {
  return city.dongs.find((dong) => dong.slug === dongSlug);
}

/** 같은 시·구 안의 인접 법정동 (내부 링크용) — 목록상 앞뒤로 감싸며 뽑는다 */
export function nearbyDongs(city: DistrictCity, dongSlug: string, limit = 6): DistrictDong[] {
  const pool = city.dongs.filter((d) => d.slug !== dongSlug);
  const index = city.dongs.findIndex((d) => d.slug === dongSlug);
  if (index === -1) return pool.slice(0, limit);
  const start = Math.max(0, Math.min(index, pool.length - limit));
  return pool.slice(start, start + limit);
}
