import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 独立产物：Docker 部署只需 .next/standalone（自带精简 node_modules + server.js），镜像更小。
  output: "standalone",
  experimental: {
    // 附件上传走 Server Action，放宽请求体上限至 200MB（默认 1MB）。
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
