import { describe, it, expect } from "vitest";
import ReActAgent from "./reactAgent.js";
import HelloAgentsLLM from "../core/llm.js";
import { Tool } from "../tools/registry.js";

/**
 * 测试工具：模拟搜索
 */
class MockSearchTool extends Tool {
  constructor() {
    super("search", "模拟搜索工具");
  }

  getParameters() {
    return [
      { name: "query", type: "string", description: "搜索关键词", required: true },
    ];
  }

  run(args: any) {
    return `搜索结果: ${args.query}`;
  }
}

/**
 * 测试工具：模拟计算器
 */
class MockCalculatorTool extends Tool {
  constructor() {
    super("calculator", "模拟计算器");
  }

  getParameters() {
    return [
      { name: "expression", type: "string", description: "数学表达式", required: true },
    ];
  }

  run(args: any) {
    return eval(args.expression);
  }
}

describe("ReActAgent", () => {
  it("应该成功初始化", () => {
    const llm = new HelloAgentsLLM();
    const agent = new ReActAgent("testAgent", llm);
    expect(agent.name).toBe("testAgent");
  });

  it("应该能够添加和移除工具", () => {
    const llm = new HelloAgentsLLM();
    const agent = new ReActAgent("testAgent", llm);
    const tool = new MockSearchTool();

    agent.addTool(tool);
    expect(agent.listTools()).toContain("search");

    agent.removeTool("search");
    expect(agent.listTools()).not.toContain("search");
  });

  it("应该正确解析 ReAct 响应", () => {
    const llm = new HelloAgentsLLM();
    const agent = new ReActAgent("testAgent", llm);

    // 测试解析 Thought 和 Action
    const response1 = "Thought: 我需要搜索信息\nAction: search {\"query\": \"test\"}";
    const parseMethod = (agent as any).parseReActResponse.bind(agent);
    const result1 = parseMethod(response1);

    expect(result1.thought).toBe("我需要搜索信息");
    expect(result1.action?.toolName).toBe("search");
    expect(result1.action?.parameters).toBe('{"query": "test"}');
  });

  it("应该识别最终答案", () => {
    const llm = new HelloAgentsLLM();
    const agent = new ReActAgent("testAgent", llm);

    const isFinalAnswer = (agent as any).isFinalAnswer.bind(agent);
    expect(isFinalAnswer("Answer: 这是最终答案")).toBe(true);
    expect(isFinalAnswer("answer: 这是最终答案")).toBe(true);
    expect(isFinalAnswer("这只是一些思考")).toBe(false);
  });

  it("应该正确提取最终答案", () => {
    const llm = new HelloAgentsLLM();
    const agent = new ReActAgent("testAgent", llm);

    const extractAnswer = (agent as any).extractAnswer.bind(agent);
    expect(extractAnswer("Answer: 42")).toBe("42");
    expect(extractAnswer("answer: 这是一个很长的答案\n有多行")).toContain("这是一个很长的答案");
  });
});
