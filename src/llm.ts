import axios from "axios";
import dotenv from "dotenv";
import t from "term-style";
// Load environment variables
dotenv.config();

// Check if API key exists
if (!process.env.APIKEY) {
  throw new Error(
    "APIKEY environment variable is not set. Please check your .env file.",
  );
}

if (!process.env.API_BASE_URL) {
  throw new Error(
    "API_BASE_URL environment variable is not set. Please check your .env file.",
  );
}

t.info("API Client initialized with base URL:" + process.env.API_BASE_URL);
t.info("API Key loaded successfully" + process.env.APIKEY ? "Yes" : "No");

class HelloAgentsLLM {
  #llm: any;
  constructor() {
    // Initialize the LLM client with the base URL and headers
    this.#llm = axios.create({
      baseURL: `${process.env.API_BASE_URL}/chat/completions`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.APIKEY}`,
      },
    });
  }

  async chat(messages: string) {
    try {
      const spinner = t.spinner.start("Sending message");
      const response = await this.#llm.post(
        "",
        {
          model: process.env.MODEL || "Pro/deepseek-ai/DeepSeek-V3.2",
          messages: [{ role: "user", content: messages }],
          stream: true,
        },
        { responseType: "stream" }
      );

      // 流式传输处理
      let result = "";
      spinner.succeed("Receiving response");

      return new Promise((resolve, reject) => {
        const stream = response.data;
        let buffer = "";

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
                process.stdout.write(content);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        });

        stream.on("end", () => {
          console.log(); // 换行
          resolve(result);
        });

        stream.on("error", (err: Error) => {
          spinner.fail("Stream error: " + err.message);
          reject(err);
        });
      });
    } catch (error: any) {
      t.error("Error in chat method:" + error.message);
      throw error;
    }
  }
}

export default HelloAgentsLLM;
