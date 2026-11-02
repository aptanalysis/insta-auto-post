export type Category = {
  slug: string;
  name: string;
  emoji: string;
  /** 카테고리 화면에서 바로 눌러볼 수 있는 추천 검색어 */
  keywords: string[];
};

export const CATEGORIES: Category[] = [
  { slug: "diaper", name: "기저귀", emoji: "🧷", keywords: ["하기스 기저귀", "팸퍼스 기저귀", "보솜이 기저귀", "밤부베베 기저귀", "팬티형 기저귀", "밴드형 기저귀"] },
  { slug: "formula", name: "분유", emoji: "🍼", keywords: ["앱솔루트 분유", "임페리얼 분유", "압타밀 분유", "일동후디스 산양분유", "액상분유"] },
  { slug: "wipes", name: "물티슈", emoji: "🧻", keywords: ["아기 물티슈", "베베숲 물티슈", "몽디에스 물티슈", "캡형 물티슈"] },
  { slug: "feeding", name: "수유용품", emoji: "🥛", keywords: ["젖병", "더블하트 젖병", "모윰 젖병", "유축기", "젖병소독기", "분유포트"] },
  { slug: "babyfood", name: "이유식", emoji: "🥣", keywords: ["아기 이유식", "아기 간식", "떡뻥", "아기 퓨레", "이유식 마스터기"] },
  { slug: "stroller", name: "유모차", emoji: "🛒", keywords: ["휴대용 유모차", "절충형 유모차", "디럭스 유모차", "부가부 유모차", "요요 유모차"] },
  { slug: "carseat", name: "카시트", emoji: "🚗", keywords: ["신생아 카시트", "회전형 카시트", "주니어 카시트", "다이치 카시트", "싸이벡스 카시트"] },
  { slug: "carrier", name: "아기띠·힙시트", emoji: "🤱", keywords: ["아기띠", "힙시트", "코니 아기띠", "에르고 아기띠"] },
  { slug: "bath", name: "목욕·위생", emoji: "🛁", keywords: ["아기 욕조", "아기 바디워시", "아기 샴푸", "아기 로션", "아기 세제", "섬유유연제 유아"] },
  { slug: "toy", name: "장난감·교구", emoji: "🧸", keywords: ["아기 장난감", "모빌", "아기체육관", "치발기", "보행기", "점퍼루"] },
  { slug: "furniture", name: "침구·가구", emoji: "🛏️", keywords: ["아기 침대", "범퍼침대", "아기 이불", "하이체어", "바운서", "놀이매트"] },
  { slug: "clothing", name: "의류", emoji: "👕", keywords: ["아기 내복", "바디슈트", "우주복", "아기 양말", "턱받이"] },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
