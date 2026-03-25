import Message  from "./messsage.js"
import  HelloAgentsLLM  from "./llm.js";
import  Config  from "./config.js";

/**
 * Agent 基类（抽象类）
 */
export default abstract class Agent {
  // 私有历史记录
  private _history: Message[] = [];

  constructor(
    public name: string,
    public llm: HelloAgentsLLM,
    public systemPrompt?: string,
    public config: Config = new Config()
  ) {
    // llm 使用config中的参数进行初始化（如 temperature 和 maxTokens）
    this.llm.temperature = this.config.temperature || this.llm.temperature;
    this.llm.maxTokens = this.config.maxTokens || this.llm.maxTokens;
  }

  /**
   * 抽象方法：运行 Agent（必须子类实现）
   */
  abstract run(inputText: string, kwargs?: any): Promise<string>;

  /**
   * 添加消息到历史
   */
  addMessage(message: Message): void {
    this._history.push(message);
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this._history = [];
  }

  /**
   * 获取历史（副本，防止外部修改）
   */
  getHistory(): Message[] {
    return [...this._history];
  }

  /**
   * 字符串输出（对应 Python __str__）
   */
  toString(): string {
    return `Agent(name=${this.name}, model=${this.llm.model})`;
  }
}