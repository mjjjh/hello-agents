import ReActAgent from "./agents/reactAgent.js";
import HelloAgentsLLM from "./core/llm.js";
import { Tool } from "./tools/registry.js";

/**
 * 示例工具：计算器
 */
class CalculatorTool extends Tool {
  constructor() {
    super("calculator", "执行基本数学计算，支持加减乘除");
  }

  getParameters() {
    return [
      { name: "expression", type: "string", description: "数学表达式，如 '2+3*4'", required: true },
    ];
  }

  run(args: any) {
    try {
      const result = eval(args.expression);
      return { expression: args.expression, result };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}

/**
 * 示例工具：搜索工具（模拟）
 */
class SearchTool extends Tool {
  constructor() {
    super("search", "搜索相关信息并返回结果");
  }

  getParameters() {
    return [
      { name: "query", type: "string", description: "搜索关键词", required: true },
    ];
  }

  run(args: any) {
    // 模拟搜索结果
    const mockResults = {
      default: `关于"${args.query}"的搜索结果：
- 结果1：这是一个模拟的搜索结果
- 结果2：ReAct Agent 使用推理-行动循环来解决问题
- 结果3：更多信息请查看相关文档`,
    };
    return mockResults.default;
  }
}

/**
 * 示例工具：时间工具
 */
class TimeTool extends Tool {
  constructor() {
    super("time", "获取当前日期和时间");
  }

  getParameters() {
    return [];
  }

  run() {
    return new Date().toLocaleString("zh-CN");
  }
}

/**
 * ReAct Agent 使用示例
 */
async function main() {
  console.log("=== ReAct Agent 使用示例 ===\n");

  // 创建 ReAct Agent
  const llm = new HelloAgentsLLM();
  const agent = new ReActAgent(
    "ReAct助手",
    llm,
    "你是一个智能助手，擅长使用工具来解决用户的问题。",
  );

  // 添加工具
  agent.addTool(new CalculatorTool());
  agent.addTool(new SearchTool());
  agent.addTool(new TimeTool());

  console.log("可用工具:", agent.listTools());
  console.log();

  // 示例1：数学计算
  console.log("--- 示例1：数学计算 ---");
  const result1 = await agent.run("请计算 15 * 8 + 32 的结果");
  console.log("结果:", result1);
  console.log();

  // 示例2：获取当前时间
  console.log("--- 示例2：获取当前时间 ---");
  const result2 = await agent.run("现在几点了？");
  console.log("结果:", result2);
  console.log();

  // 示例3：搜索信息
  console.log("--- 示例3：搜索信息 ---");
  const result3 = await agent.run("搜索关于 ReAct Agent 的信息");
  console.log("结果:", result3);
  console.log();

  // 示例4：复杂任务
  console.log("--- 示例4：复杂任务 ---");
  const result4 = await agent.run(
    "先告诉我现在几点，然后计算 123 + 456 的结果",
  );
  console.log("结果:", result4);
}

// 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CalculatorTool, SearchTool, TimeTool };
