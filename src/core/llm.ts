import axios from "axios";
import dotenv from "dotenv";
import t from "term-style";
import Message from "./messsage.js";
// Load environment variables
dotenv.config();

class HelloAgentsLLM {
  llm: any;
  model: string;
  apiKey: string;
  baseURL: string;
  temperature: number;
  maxTokens: number;
  constructor(
    model?: string,
    apiKey?: string,
    baseURL?: string,
    temperature?: number,
    maxTokens?: number,
  ) {
    // 优先使用传入的参数，其次使用环境变量，最后使用默认值
    this.model = model || process.env.MODEL || "Pro/deepseek-ai/DeepSeek-V3.2";
    this.apiKey = apiKey || process.env.APIKEY || "";
    this.baseURL = baseURL || process.env.API_BASE_URL || "";
    this.temperature =
      temperature || parseFloat(process.env.TEMPERATURE || "0.7");
    this.maxTokens = maxTokens || parseInt(process.env.MAX_TOKENS || "4096");
    // Check if API key exists
    if (!this.apiKey) {
      throw new Error(
        "APIKEY environment variable is not set. Please check your .env file.",
      );
    }

    if (!this.baseURL) {
      throw new Error(
        "API_BASE_URL environment variable is not set. Please check your .env file.",
      );
    }

    // Initialize the LLM client with the base URL and headers
    this.llm = axios.create({
      baseURL: `${this.baseURL}`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }

  async invoke(messages: Message[] | string, kwargs?: Record<string, any>): Promise<string> {
    let spinner: any = null;
    try {
      const role = messages instanceof Array ? messages.at(-1)?.role || "user" : "user";

      let infoRole;
      if (role === "user") {
        infoRole = t.bgGreen("user: ");
      } else if (role === "assistant") {
        infoRole = t.bgBlue("assistant: ");
      } else if(role === 'system') {
        infoRole = t.bgYellow("system: ");
      }

      const input = t.bgBlue(
        messages instanceof Array ? messages.at(-1)?.content || "" : messages,
      );
      console.log(infoRole, input);



      spinner = t.spinner.start("Sending message");
      const response = await this.llm.post(
        "",
        {
          model: this.model,
          messages: messages,
          stream: true,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          ...kwargs, // 允许覆盖默认参数
        },
        { responseType: "stream" },
      );

      // 流式传输处理
      let result = "";
      spinner.succeed("Receiving response");

      return new Promise((resolve, reject) => {
        const stream = response.data;
        let buffer = "";
        // ai输出信息
        const roleInfo = t.bgCyan("assistant: ");
        process.stdout.write(roleInfo);
        stream.on("data", (chunk: Buffer) => {
          buffer += chunk.toString("utf-8");
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // 保留未完成的行

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6); // 去掉 "data: " 前缀
            if (data === "[DONE]") continue;

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                result += content;
                const resInfo = t.bgCyan(content);
                process.stdout.write(resInfo);
              }
            } catch (e: any) {
              // 忽略解析错误
              t.error(
                "Failed to parse stream data: " +
                  e.message +
                  " | Raw data: " +
                  e.data,
              );
            }
          }
        });

        stream.on("end", () => {
          console.log(); // 换行
          resolve(result);
        });

        stream.on("error", (err: Error) => {
          spinner.fail("Stream error");
          reject(err.message);
        });
      });
    } catch (error: any) {
      spinner?.fail("Stream error");
      t.error("Error in chat:" + error.message + " | Raw data: " + error.data);
      throw error;
    }
  }
}

export default HelloAgentsLLM;
