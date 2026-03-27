import Agent from "../core/agent.js";
import HelloAgentsLLM from "../core/llm.js";
import Config from "../core/config.js";
import Message from "../core/messsage.js";
import ToolRegistry,{Tool} from "../tools/registry.js";
import { ToolExecutor } from "../tools/ToolExecutor.js";
import { ParameterParser } from "../tools/ParameterParser.js";
import t from "term-style";
class SimpleAgent extends Agent {
  // 工具注册表，key 是工具类别（如 "search", "calculator"），value 是对应的 ToolRegistry 实例
  toolRegistry: ToolRegistry;
  // 是否启用工具调用（只有在 toolRegistry 有内容时才启用）
  enabledToolCalling: boolean;
  // 工具执行
  toolExecutor: ToolExecutor;

  constructor(
    name: string,
    llm: HelloAgentsLLM = new HelloAgentsLLM(),
    systemPrompt?: string,
    config: Config = new Config(),
    toolRegistry?: ToolRegistry,
    enabledToolCalling: boolean = true,
  ) {
    super(name, llm, systemPrompt, config);
    this.toolRegistry = toolRegistry || new ToolRegistry();
    this.enabledToolCalling =
      enabledToolCalling && Object.keys(this.toolRegistry).length > 0;
    this.toolExecutor = new ToolExecutor(this.toolRegistry);
    t.success("初始化 SimpleAgent 成功");
  }

  // 重写 run 方法，添加工具调用逻辑
  async run(
    inputText: string,
    maxToolIterations: number = 3,
    kwargs?: Record<string, any>,
  ): Promise<string> {
    const messages: Message[] = [];

    // 添加系统提示(可能包含工具使用说明)
    const enhancedSystemPrompt = this.enhanceSystemPrompt();
    messages.push(new Message("system", enhancedSystemPrompt));

    // 添加历史消息
    const history = this.getHistory();
    messages.push(...history);

    // 添加用户输入
    messages.push(new Message("user", inputText));

    // 没有启用工具调用，只是简单的对话
    if (!this.enabledToolCalling) {
      const response = await this.llm.invoke(messages, kwargs);
      // 将用户输入和模型回复添加到历史
      this.addMessage(new Message("user", inputText));
      this.addMessage(new Message("assistant", response));
      return response;
    }

    // 启用工具调用的对话流程，进入工具调用循环
    return this.runWithTools(messages, maxToolIterations, kwargs);
  }

  private enhanceSystemPrompt(): string {
    let prompt = this.systemPrompt || "你是一个有用的AI助手。";

    // 如果没有启用工具调用，直接返回系统提示
    if (!this.enabledToolCalling) {
      return prompt;
    }

    // 添加工具使用说明
    const toolDescriptions: string = this.toolRegistry.getToolDescriptions();

    if (!toolDescriptions || toolDescriptions.trim() === "暂无可用工具") {
      return prompt;
    }

    prompt += `\n\n## 可用工具\n
        你可以使用以下工具来帮助用户：\n
        ${toolDescriptions}\n
        当你需要使用工具时，请按照以下格式输出：'[TOOL_CALL:{tool_name}:{parameters}]'\n
        例如：'[TOOL_CALL:search:{"query": "Hello Agents是什么？"}]'\n
        你可以连续调用工具，但请确保每次调用后都等待工具的结果返回，然后再继续对话。
        `;
    return prompt;
  }

  async runWithTools(
    messages: Message[],
    maxToolIterations: number = 3,
    kwargs?: Record<string, any>,
  ): Promise<string> {
    let currentIteration = 0;
    let lastResponse = "";
    // 工具调用循环，直到达到最大迭代次数或者模型不再调用工具
    while (currentIteration < maxToolIterations) {
      try {
       const response = await this.llm.invoke(messages, kwargs);

      // 解析模型回复，检查是否包含工具调用指令
      const toolParseResults = this.parseToolCall(response);
      let cleanResponse = response;
      if (toolParseResults && toolParseResults.length > 0) {
        t.info(`检测到${toolParseResults.length}个工具调用`);
        // 函数调用结果
        const toolResults = [];
        for (const toolCall of toolParseResults) {
          const { toolName, parameters, origin } = toolCall;

          const spinner = t.spinner.start(`正在调用工具 ${toolName}`);
          const toolResult = await this.executeToolCall(toolName, parameters);
          spinner.succeed(`工具 ${toolName} 调用成功`);

          toolResults.push(toolResult);
          cleanResponse = response.replace(origin, "");
        }
        // 将模型回复添加到消息中
        messages.push(new Message("assistant", cleanResponse));
        // 将工具调用结果添加到消息中，继续对话
        messages.push(new Message("user", `toolResults: ${toolResults}`));
        currentIteration++;
        continue;
      }
      lastResponse = response;
      break;
      } catch (error:any) {
        currentIteration++;
        t.error("Error in toolCaht:" + error.message + " | Raw data: " + error.data);
        return error.message;
      }
      
    }

    // 如果超过最大迭代次数还没有得到模型回复，强制调用一次模型获取回复
    if (currentIteration >= maxToolIterations && lastResponse === "") {
      lastResponse = await this.llm.invoke(messages, kwargs);
      messages.push(new Message("assistant", lastResponse));
    }

    // 保存对话历史（跳过 system 消息，因为每次都会重新构建）
    messages.forEach((msg) => {
      if (msg.role !== "system") {
        this.addMessage(msg);
      }
    });
    return lastResponse;
  }

  parseToolCall(
    response: string,
  ): { toolName: string; parameters: any; origin: string }[] | null {
    const toolCallPattern = /\[TOOL_CALL:(\w+):({.*?})\]/g;
    const toolCalls = [];
    for (const match of response.matchAll(toolCallPattern)) {
      const [, toolName, parameters] = match;
      toolCalls.push({
        toolName: toolName!.trim(),
        parameters: parameters?.trim(),
        origin: `[TOOL_CALL:${toolName}:${parameters}]`,
      });
    }

    return toolCalls;
  }

  executeToolCall(toolName: string, parameters: any): any {
    return this.toolExecutor.executeToolCall(toolName, parameters);
  }

  /**
   * 添加工具到注册表
   * @param tool 要添加的工具实例
   */
  add_tool(tool: Tool): void {
    this.toolRegistry.registerTool(tool);
    // 如果添加了工具且之前没有启用工具调用，则启用它
    if (!this.enabledToolCalling) {
      this.enabledToolCalling = true;
    }
  }

  /**
   * 从注册表移除工具
   * @param name 要移除的工具名称
   */
  remove_tool(name: string): void {
    this.toolRegistry.unregister(name);
    // 如果工具注册表为空，则禁用工具调用
    const descriptions = this.toolRegistry.getToolDescriptions();
    if (descriptions === "暂无可用工具") {
      this.enabledToolCalling = false;
    }
  }

  /**
   * 列出所有可用工具
   * @returns 工具描述列表
   */
  list_tools(): string[] {
    return this.toolRegistry.getList();
  }
}

export default SimpleAgent;
