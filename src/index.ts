import SimpleAgent from "./agents/simpleAgent.js";
import AddTool from "./utils/Tools/AddTool.js";
import t from "term-style";
import { ToolExecutor } from "./tools/ToolExecutor.js";
import ReActAgent from "./agents/reactAgent.js";

  const agent = new ReActAgent("ReAct助手");
  agent.addTool(new AddTool());

  const result = await agent.run("你好");  


// const agent = new SimpleAgent("TestAgent");
// agent.add_tool(new AddTool());
// t.table.render(
//   agent.list_tools().map((item) => ({ toolName: item })),
//   { headers: ["ToolsName"] },
// );

// async function main() {
//   await agent.run("Hello, Agent!");
//   await agent.run("What is the sum of 10 and 987?");
// }

// main();

// const toolExecutor = new ToolExecutor(agent.toolRegistry);

// const result = toolExecutor.executeToolCall("add", '{"a": 1, "b": 2}');
// t.bgRed.log(result);
