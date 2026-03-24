import t from "term-style";
import HelloAgentsLLM from "./llm.js";

const llm = new HelloAgentsLLM();

async function main() {
  const response = await llm.chat("你好");
//   console.log("Final response:", response);
}

main(); 