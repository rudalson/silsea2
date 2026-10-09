// references/images에서 추출한 Phase 0 코어 팔레트.
// 2026-08-03 화풍·HEX 사용자 승인 완료.
// 2026-08-10 캐릭터·아이템 색은 유지하고 어린이용 환경 명도 보정 팔레트를 확장함.
export const PALETTE = {
  source: "references/images",
  base: ["#F1F6FA", "#DEB5C6", "#D294AC", "#957242"],
  shadow: ["#9598A2", "#745767", "#5D4326"],
  // 실비아 전용 다색 팔레트. 실세아의 기존 색상은 유지한다.
  sylvia: ["#D8C5F0", "#A18AC4", "#79639E", "#495077", "#30334F", "#F4ECFF", "#7BDBCF", "#47A9B6", "#80C7F2", "#578BCA", "#AA84DA", "#F2B6D8", "#FFF0A6"],
  sunlight: ["#FFF3D9", "#F5D5A5", "#FFB94D", "#ED8A3C", "#B96A31", "#704729", "#FFE69A", "#ECA0A0"],
  moonlight: ["#E9E5FF", "#C2BCEB", "#9991D0", "#737AC8", "#464A8D", "#292C59", "#B5D9FF", "#F7F3FF"],
  alora: ["#F7F9E8", "#DCE9D4", "#92CCB5", "#27C8AE", "#087D72", "#83E7E3", "#AD83D6", "#EBA9D5", "#555078", "#FBE4D4"],
  aurora: ["#EFE6FA", "#D4C2E7", "#B092CB", "#209F87", "#086B60", "#6EDDCB", "#AA7DCB", "#E6A2CD", "#49445F", "#FCF5FF", "#96D7C0"],
  oceandream: ["#F9FAEF", "#D6EEE7", "#9ADDCB", "#36D4D7", "#068CC9", "#0759A4", "#233B76", "#8BE9EA", "#BCDDF5", "#F6DCCD"],
  highlight: ["#F4FBFD", "#CDE5B9"],
  outline: "#42474E",
  danger: ["#D1333D", "#752B5A"],
  // 호박 적 전용: 기존 제한 팔레트 안에서 따뜻한 주황 실루엣을 보장한다.
  pumpkin: ["#F47B20", "#FFB52A", "#C8541B"],
  collect: ["#F5DF4F", "#3DBFE3", "#E573A0"],
  bgFar: ["#CDE5B9", "#4691A2"],
  bgMid: ["#BFC596", "#4DABA1"],
  bgNear: ["#4ECCA0", "#183D30", "#5D4326"],
  environmentSky: ["#9ADDF2", "#D9F3FA"],
  environmentFar: ["#FFF6D8", "#DCEB85"],
  environmentMid: ["#82CB70", "#59AE72"],
  environmentNear: ["#51CE87", "#285144", "#9A6535"],
  environmentNight: ["#172447", "#193A3E", "#214D59"],
  environmentNeutral: ["#45494B", "#A8AA96", "#D09A4E"],
  storybook: {
    bg: "#EFE1CD",
    heading: "#CF6CA7",
    label: "#78455F",
    arrow: "#A76587",
    buttonShadow: "#795348",
    buttonHover: "#F6C9DF",
    buttonNormal: "#F9DFEB",
    buttonBorder: "#B87D9B",
    buttonInner: "#FFF7E6",
    caption: "#664D53",
    captionStroke: "#FFF4E1"
  }
};
