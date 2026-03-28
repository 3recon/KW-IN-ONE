export const QUICK_LINKS = [
  { id: "klas", title: "KLAS", url: "https://klas.kw.ac.kr/" },
  { id: "kw-home", title: "광운대 홈페이지", url: "https://www.kw.ac.kr/ko/" },
  { id: "e-learning", title: "E-러닝", url: "https://selc.or.kr/lms/main/MainView.do" },
  { id: "k-mooc", title: "K-MOOC", url: "https://www.kmooc.kr/" },
  { id: "webmail", title: "웹메일", url: "https://wmail.kw.ac.kr/" },
  { id: "everytime", title: "에브리타임", url: "https://kw.everytime.kr/" },
  { id: "dining", title: "학식", url: "https://www.kw.ac.kr/ko/life/facility11.jsp" },
  { id: "campus-phone", title: "교내전화번호", url: "https://www.kw.ac.kr/ko/tour/phone.jsp" },
  { id: "library", title: "중앙도서관", url: "https://kupis.kw.ac.kr/" }
];

export const NOTICE_URL =
  "https://www.kw.ac.kr/ko/life/notice.jsp?srCategoryId=&mode=list&searchKey=1&searchVal=";

export const DINING_URL = "https://www.kw.ac.kr/ko/life/facility11.jsp";

export const DEFAULT_SETTINGS = {
  refreshMinutes: 30,
  selectedNoticeCategories: ["전체"]
};

export const SAMPLE_NOTICES = [
  {
    source: "광운대 공지",
    category: "일반",
    title: "공지사항을 불러오지 못해 예시 공지가 표시됩니다.",
    url: NOTICE_URL,
    publishedAt: "지금"
  },
  {
    source: "광운대 공지",
    category: "학사",
    title: "설정 화면에서 필요한 카테고리만 선택할 수 있습니다.",
    url: NOTICE_URL,
    publishedAt: "MVP"
  },
  {
    source: "광운대 공지",
    category: "학생",
    title: "선택한 카테고리에 맞는 공지만 3건까지 노출합니다.",
    url: NOTICE_URL,
    publishedAt: "안내"
  }
];

export const SAMPLE_MEALS = {
  date: "오늘",
  focusLabel: "예시 식단",
  entries: [
    {
      name: "천원의 아침",
      time: "08:30 ~ 09:30",
      items: ["토스트", "스크램블 에그", "샐러드"]
    },
    {
      name: "자율중식",
      time: "11:30 ~ 14:00",
      items: ["제육볶음", "된장국", "김치", "쌀밥"]
    }
  ]
};
