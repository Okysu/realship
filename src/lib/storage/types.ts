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
}
