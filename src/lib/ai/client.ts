import OpenAI from "openai";
import type { AiAgent } from "./config";

// 按 agent 配置创建 OpenAI 兼容客户端（baseURL/apiKey 来自该 agent）。
export function getAiClient(agent: AiAgent): OpenAI {
  return new OpenAI({ apiKey: agent.apiKey, baseURL: agent.baseUrl });
}
