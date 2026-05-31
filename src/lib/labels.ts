// 各枚举的中文标签（admin 与公开页共用）。

export const stageTypeLabels = {
  REGISTRATION: "报名",
  PRELIMINARY: "初赛",
  SEMIFINAL: "复赛",
  FINAL: "决赛",
} as const;

export const stageStatusLabels = {
  UPCOMING: "未开始",
  OPEN: "进行中",
  REVIEWING: "评审中",
  CLOSED: "已结束",
} as const;

export const roleLabels = {
  PARTICIPANT: "参赛者",
  JUDGE: "评委",
  ADMIN: "管理员",
} as const;

export const submissionStatusLabels = {
  DRAFT: "草稿",
  SUBMITTED: "已提交",
  UNDER_REVIEW: "评审中",
  SCORED: "已出分",
  WITHDRAWN: "已撤回",
} as const;

export const externalLinkTypeLabels = {
  DEMO_VIDEO: "演示视频",
  REPO: "代码仓库",
  APP_MARKET: "应用市场",
  BETA_TEST: "邀测链接",
  HOMEPAGE: "项目主页",
  OTHER: "其他链接",
} as const;

export const materialKindLabels = {
  DETAIL_PAGE: "作品详情",
  DEMO_VIDEO: "演示视频",
  REPO: "代码仓库",
  APP_MARKET: "应用市场",
  BETA_TEST: "邀测链接",
  HOMEPAGE: "项目主页",
  ATTACHMENT: "附件",
  FORM_SECTION: "项目说明",
} as const;
