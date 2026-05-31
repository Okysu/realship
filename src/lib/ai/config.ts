// 一个 AI 评审 agent 的端点配置。
export type AiAgent = {
  name: string; // 展示名（区分多 agent）
  baseUrl: string;
  apiKey: string;
  model: string;
};

// 解析多组 AI 端点用于「多 agent 交叉评分」：
//   优先 AI_AGENTS（JSON 数组：[{name,baseUrl,apiKey,model}, ...]）；
//   否则回退单组 AI_API_KEY / AI_BASE_URL / AI_MODEL（向后兼容）。
export function getAiAgents(): AiAgent[] {
  const raw = process.env.AI_AGENTS?.trim();
  if (raw) {
    try {
      const arr = JSON.parse(raw) as Array<Partial<AiAgent>>;
      if (Array.isArray(arr)) {
        const agents = arr
          .filter((a) => a.baseUrl && a.apiKey && a.model)
          .map((a, i) => ({
            name: a.name || a.model || `agent-${i + 1}`,
            baseUrl: a.baseUrl as string,
            apiKey: a.apiKey as string,
            model: a.model as string,
          }));
        if (agents.length > 0) return agents;
      }
    } catch {
      // AI_AGENTS 解析失败 → 回退单组
    }
  }
  if (
    process.env.AI_API_KEY &&
    process.env.AI_BASE_URL &&
    process.env.AI_MODEL
  ) {
    return [
      {
        name: process.env.AI_MODEL,
        baseUrl: process.env.AI_BASE_URL,
        apiKey: process.env.AI_API_KEY,
        model: process.env.AI_MODEL,
      },
    ];
  }
  return [];
}

// 任一可用 agent 即视为启用（未配置 → AI 功能禁用，不 Mock）。
export function isAiEnabled(): boolean {
  return getAiAgents().length > 0;
}
