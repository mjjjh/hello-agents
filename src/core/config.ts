import * as dotenv from 'dotenv'; // 可选，用于加载 .env 文件
dotenv.config();

export default class Config {
  constructor(
    public debug?: boolean,
    public logLevel?: string,
    public temperature?: number,
    public maxTokens?: number,
  ) {}

  /**
   * 从环境变量创建配置（对应 Python @classmethod from_env）
   */
  static fromEnv(): Config {
    const debug = process.env.DEBUG?.toLowerCase() === 'true';
    const logLevel = process.env.LOG_LEVEL || 'INFO';
    const temperature = parseFloat(process.env.TEMPERATURE || '0.7');
    const maxTokens = process.env.MAX_TOKENS 
      ? parseInt(process.env.MAX_TOKENS)
      : 4096; // 默认值

    return new Config(debug, logLevel, temperature, maxTokens);
  }

  /**
   * 转成对象（对应 Python to_dict）
   */
  toDict(): Record<string, any> {
    return {
      debug: this.debug,
      logLevel: this.logLevel,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
    };
  }
}