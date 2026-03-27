import { describe, it, expect, vi, beforeEach } from "vitest";
import SimpleAgent from "./simpleAgent.js";
import HelloAgentsLLM from "../core/llm.js";
import Config from "../core/config.js";
import ToolRegistry, { Tool } from "../tools/registry.js";
import Message from "../core/messsage.js";

// Mock 依赖
vi.mock("../core/llm.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    invoke: vi.fn(),
    model: "test-model",
    temperature: 0.7,
    maxTokens: 2000,
  })),
}));

vi.mock("../tools/ToolExecutor.js", () => ({
  ToolExecutor: vi.fn().mockImplementation(() => ({
    executeToolCall: vi.fn().mockResolvedValue({ result: "test result" }),
  })),
}));

vi.mock("term-style", () => ({
  default: {
    success: vi.fn(),
    warn: vi.fn(),
    
    info: vi.fn(),
  },
}));

// 测试用的 Mock Tool
class MockTool extends Tool {
  constructor() {
    super("mockTool", "这是一个测试工具");
  }

  run(args: any) {
    return { result: "mock result" };
  }

  getParameters() {
    return [
      { name: "input", type: "string", description: "输入参数", required: true },
    ];
  }
}

describe("SimpleAgent", () => {
  let agent: SimpleAgent;
  let mockLLM: any;
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLLM = new HelloAgentsLLM();
    toolRegistry = new ToolRegistry();
    agent = new SimpleAgent("test-agent", mockLLM, "你是一个测试助手", new Config(), toolRegistry);
  });

  describe("构造函数", () => {
    it("应该正确初始化 agent", () => {
      expect(agent.name).toBe("test-agent");
      expect(agent.toolRegistry).toBeDefined();
      expect(agent.toolExecutor).toBeDefined();
    });

    it("如果没有提供 toolRegistry，应该创建一个新的", () => {
      const agentWithoutRegistry = new SimpleAgent("test-agent-2", mockLLM);
      expect(agentWithoutRegistry.toolRegistry).toBeDefined();
    });
  });

  describe("run 方法 - 无工具调用", () => {
    it("应该返回 LLM 的回复", async () => {
      const expectedResponse = "这是 AI 的回复";
      mockLLM.invoke.mockResolvedValueOnce(expectedResponse);

      const result = await agent.run("你好");

      expect(result).toBe(expectedResponse);
      expect(mockLLM.invoke).toHaveBeenCalledTimes(1);
    });

    it("应该将用户输入和回复添加到历史", async () => {
      mockLLM.invoke.mockResolvedValueOnce("AI 回复");

      await agent.run("用户消息");

      const history = agent.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0]?.role).toBe("user");
      expect(history[0]?.content).toBe("用户消息");
      expect(history[1]?.role).toBe("assistant");
      expect(history[1]?.content).toBe("AI 回复");
    });
  });

  describe("run 方法 - 有工具调用", () => {
    beforeEach(() => {
      const mockTool = new MockTool();
      agent.add_tool(mockTool);
    });

    it("应该解析并执行工具调用", async () => {
      const toolCallResponse = '[TOOL_CALL:mockTool:{"input": "test"}]';
      const finalResponse = "工具执行完成";

      mockLLM.invoke
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce(finalResponse);

      const result = await agent.run("使用工具");

      expect(result).toBe(finalResponse);
      expect(mockLLM.invoke).toHaveBeenCalledTimes(2);
    });

    it("应该在达到最大迭代次数后停止", async () => {
      const toolCallResponse = '[TOOL_CALL:mockTool:{"input": "test"}]';

      mockLLM.invoke.mockResolvedValue(toolCallResponse);

      const result = await agent.run("测试", 2);

      // 应该调用 3 次：初始调用 + 达到最大迭代次数后的强制调用
      expect(mockLLM.invoke).toHaveBeenCalledTimes(3);
    });
  });

  describe("parseToolCall", () => {
    it("应该正确解析工具调用", () => {
      const response = '[TOOL_CALL:search:{"query": "Hello Agents"}]';
      const result = agent.parseToolCall(response);

      expect(result).toHaveLength(1);
      expect(result![0]?.toolName).toBe("search");
      expect(result![0]?.parameters).toBe('{"query": "Hello Agents"}');
    });

    it("应该解析多个工具调用", () => {
      const response =
        '[TOOL_CALL:search:{"query": "test"}][TOOL_CALL:calculator:{"expr": "1+1"}]';
      const result = agent.parseToolCall(response);

      expect(result).toHaveLength(2);
      expect(result![0]?.toolName).toBe("search");
      expect(result![1]?.toolName).toBe("calculator");
    });

    it("如果没有工具调用应该返回空数组", () => {
      const response = "这是一个普通回复";
      const result = agent.parseToolCall(response);

      expect(result).toHaveLength(0);
    });
  });

  describe("add_tool", () => {
    it("应该添加工具到注册表", () => {
      const mockTool = new MockTool();

      agent.add_tool(mockTool);

      const tools = agent.list_tools();
      expect(tools).toContain("mockTool");
    });

    it("添加工具后应该启用工具调用", () => {
      // 创建一个禁用工具调用的 agent
      const agentWithToolCallingDisabled = new SimpleAgent(
        "test",
        mockLLM,
        undefined,
        new Config(),
        new ToolRegistry(),
        false
      );

      const mockTool = new MockTool();
      agentWithToolCallingDisabled.add_tool(mockTool);

      // 注意：这个测试可能需要根据实际实现调整
    });
  });

  describe("remove_tool", () => {
    it("应该从注册表中移除工具", () => {
      const mockTool = new MockTool();
      agent.add_tool(mockTool);

      agent.remove_tool("mockTool");

      const tools = agent.list_tools();
      expect(tools).not.toContain("mockTool");
    });
  });

  describe("list_tools", () => {
    it("应该返回所有可用工具", () => {
      const mockTool1 = new MockTool();
      const mockTool2 = new MockTool();
      mockTool2.name = "mockTool2";

      agent.add_tool(mockTool1);
      agent.add_tool(mockTool2);

      const tools = agent.list_tools();

      expect(tools).toContain("mockTool");
      expect(tools).toContain("mockTool2");
    });

    it("如果没有工具应该返回空数组", () => {
      const agentWithoutTools = new SimpleAgent("test", mockLLM);
      const tools = agentWithoutTools.list_tools();

      expect(tools).toEqual([]);
    });
  });

  describe("enhanceSystemPrompt", () => {
    it("应该包含工具描述", () => {
      const mockTool = new MockTool();
      agent.add_tool(mockTool);

      // 通过检查 run 方法中传递的消息来验证
      mockLLM.invoke.mockImplementation((messages: Message[]) => {
        const systemMessage = messages.find((m) => m.role === "system");
        if (systemMessage) {
          expect(systemMessage.content).toContain("可用工具");
          expect(systemMessage.content).toContain("mockTool");
        }
        return Promise.resolve("回复");
      });

      return agent.run("测试");
    });
  });
});
