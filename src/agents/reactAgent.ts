import Agent from "../core/agent.js";
import HelloAgentsLLM from "../core/llm.js";
import Config from "../core/config.js";
import Message from "../core/messsage.js";
import ToolRegistry, { Tool } from "../tools/registry.js";
import { ToolExecutor } from "../tools/ToolExecutor.js";
import t from "term-style";

/**
 * ReAct Agent - 推理与行动结合的智能体
 *
 * ReAct (Reasoning + Acting) 模式让智能体通过以下循环来解决问题:
 * 1. Thought: 分析情况，决定下一步行动
 * 2. Action: 执行具体的工具调用
 * 3. Observation: 观察工具执行的结果
 * 4. 重复直到任务完成
 */
class ReActAgent extends Agent {
  // 工具注册表
  toolRegistry: ToolRegistry;
  // 工具执行器
  toolExecutor: ToolExecutor;
  // ReAct 系统提示
  private reactSystemPrompt: string;

  constructor(
    name: string,
    llm: HelloAgentsLLM = new HelloAgentsLLM(),
    systemPrompt?: string,
    config: Config = new Config(),
    toolRegistry?: ToolRegistry,
  ) {
    super(name, llm, systemPrompt, config);
    this.toolRegistry = toolRegistry || new ToolRegistry();
    this.toolExecutor = new ToolExecutor(this.toolRegistry);
    this.reactSystemPrompt = this.buildReactSystemPrompt();
    t.success("初始化 ReActAgent 成功");
  }

  /**
   * 构建 ReAct 系统提示
   * 包含工具描述和 ReAct 模式的使用说明
   */
  private buildReactSystemPrompt(): string {
    const toolDescriptions = this.toolRegistry.getToolDescriptions();

    let prompt = this.systemPrompt || "你是一个有用的AI助手。";

    if (toolDescriptions && toolDescriptions.trim() !== "暂无可用工具") {
      prompt += `

## ReAct 模式

你必须按照 ReAct (Reasoning + Acting) 模式来回答问题。每个步骤必须包含以下部分：

1. **Thought:** 分析当前情况，思考下一步应该做什么
2. **Action:** 选择一个工具并执行（如果需要）
3. **Observation:** 观察上一步行动的结果

### 可用工具

${toolDescriptions}

### 输出格式

当你需要使用工具时，请严格按照以下格式输出：

\`\`\`
Thought: [你的思考过程]
Action: [工具名称] [参数JSON]
\`\`\`

例如：
\`\`\`
Thought: 我需要搜索信息来回答用户的问题
Action: search {"query": "什么是 ReAct Agent?"}
\`\`\`

工具执行后，系统会提供 Observation，你需要基于观察结果继续思考。

### 重要规则

1. 每次回复只能有一个 Thought 和最多一个 Action
2. 如果已经得到足够信息来回答，直接给出最终答案，不要继续调用工具
3. 最终答案以 "Answer:" 开头
4. 工具参数必须是有效的 JSON 格式
5. 在调用工具之前，必须先说明你的思考过程
`;
    }

    return prompt;
  }

  /**
   * 运行 ReAct Agent
   */
  async run(
    inputText: string,
    maxIterations: number = 5,
    kwargs?: Record<string, any>,
  ): Promise<string> {
    const messages: Message[] = [];

    // 添加 ReAct 系统提示
    messages.push(new Message("system", this.reactSystemPrompt));

    // 添加历史消息
    const history = this.getHistory();
    messages.push(...history);

    // 添加用户输入
    messages.push(new Message("user", inputText));

    let iteration = 0;
    let finalAnswer = "";
    const observations: string[] = [];

    // ReAct 循环
    while (iteration < maxIterations) {
      iteration++;
      t.info(`--- ReAct 迭代 ${iteration}/${maxIterations} ---`);

      const response = await this.llm.invoke(messages, kwargs);

      // 检查是否是最终答案
      if (this.isFinalAnswer(response)) {
        finalAnswer = this.extractAnswer(response);
        t.success("ReAct Agent 找到最终答案");
        break;
      }

      // 解析 Thought 和 Action
      const { action } = this.parseReActResponse(response);

      if (!action) {
        // 没有需要执行的行动，可能需要更多上下文
        t.warn("未检测到有效的 Action，继续...");
        messages.push(new Message("assistant", response));
        continue;
      }

      // 执行工具调用
      const observation = await this.executeAction(action);
      observations.push(observation);

      // 更新消息历史
      messages.push(new Message("assistant", response));

      // 以统一的格式添加 Observation
      messages.push(
        new Message("user", `Observation: ${observation}`),
      );
    }

    // 保存对话历史（跳过 system 消息，因为每次都会重新构建）
    messages.forEach((msg) => {
      if (msg.role !== "system") {
        this.addMessage(msg);
      }
    });

    return finalAnswer || "未能完成目标任务，已达到最大迭代次数。";
  }

  /**
   * 判断是否是最终答案
   */
  private isFinalAnswer(response: string): boolean {
    return response.trim().toLowerCase().startsWith("answer:");
  }

  /**
   * 提取最终答案
   */
  private extractAnswer(response: string): string {
    const match = response.match(/answer:\s*(.*)/is);
    return match && match[1] ? match[1].trim() : response;
  }

  /**
   * 解析 ReAct 响应，提取 Thought 和 Action
   */
  private parseReActResponse(response: string): {
    thought?: string;
    action?: { toolName: string; parameters: any };
  } {
    const result: any = {};

    // 提取 Thought
    const thoughtMatch = response.match(/thought:\s*(.*?)(?:\n\s*action:|$)/is);
    if (thoughtMatch && thoughtMatch[1]) {
      result.thought = thoughtMatch[1].trim();
    }

    // 提取 Action
    const actionMatch = response.match(/action:\s*(\w+)\s*({.*?})\s*$/is);
    if (actionMatch) {
      const toolName = actionMatch[1];
      const parametersStr = actionMatch[2];

      if (parametersStr) {
        try {
          result.action = {
            toolName,
            parameters: parametersStr,
          };
        } catch (e) {
          t.error(`解析 Action 参数失败: ${parametersStr}`);
        }
      }
    }

    return result;
  }

  /**
   * 执行 Action（调用工具）
   */
  private async executeAction(action: {
    toolName: string;
    parameters: any;
  }): Promise<string> {
    const { toolName, parameters } = action;

    const spinner = t.spinner.start(`执行 Action: ${toolName}`);

    try {
      const result = await this.toolExecutor.executeToolCall(
        toolName,
        parameters,
      );
      spinner.succeed(`执行 Action: ${toolName} 完成`);
      return this.formatObservation(result);
    } catch (error: any) {
      spinner.fail(`执行 Action: ${toolName} 失败`);
      t.error(error.message);
      return `Error: ${error.message}`;
    }
  }

  /**
   * 格式化观察结果
   */
  private formatObservation(result: any): string {
    if (typeof result === "string") {
      return result;
    }
    return JSON.stringify(result, null, 2);
  }

  /**
   * 添加工具到注册表
   */
  addTool(tool: Tool): void {
    this.toolRegistry.registerTool(tool);
    this.reactSystemPrompt = this.buildReactSystemPrompt();
  }

  /**
   * 从注册表移除工具
   */
  removeTool(name: string): void {
    this.toolRegistry.unregister(name);
    this.reactSystemPrompt = this.buildReactSystemPrompt();
  }

  /**
   * 列出所有可用工具
   */
  listTools(): string[] {
    return this.toolRegistry.getList();
  }
}

export default ReActAgent;
