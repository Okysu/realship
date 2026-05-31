// 文件存储抽象——业务代码只依赖此接口，可在 local / S3 间零改动切换。

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StoredObject {
  body: Buffer;
  contentType: string;
}

export interface StorageProvider {
  put(input: PutObjectInput): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;

  // 预签名直传：返回一个浏览器可直接 PUT 上传的 URL（绕过服务器中转，省带宽）。
  //   - S3 驱动：返回对象存储的预签名 PUT URL，浏览器直传 S3。
  //   - local 驱动：返回自有上传端点（/api/upload/...），前端仍用统一的 PUT 逻辑。
  // method 固定 PUT；客户端须带相同 contentType 头。
  presignPut(input: {
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<{ url: string; headers: Record<string, string> }>;

  // 校验对象是否真实存在并返回大小（confirm 阶段防伪造登记）。不存在返回 null。
  head(key: string): Promise<{ sizeBytes: number; contentType: string } | null>;

  // 预签名下载 URL：S3 返回直连下载链接（省服务器流量）；local 返回 null（回退鉴权路由）。
  presignGet(key: string, expiresIn?: number): Promise<string | null>;
}
