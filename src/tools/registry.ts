import t from "term-style";

interface ToolParameters {
    // 工具参数定义
    name: string;
    type: string;
    description?: string;
    required?: boolean;
    default?: any;
}

// 工具抽象类
export abstract class Tool {
    constructor(public name: string, public description: string) {}

    abstract run(args: any | any[]): any;

    abstract getParameters(): ToolParameters[];

}

// 工具注册表
export default class ToolRegistry {
    private tools: Map<string, Tool>;
    private functions: Map<string, { func: Function, description: string }>;

    constructor() {
        this.tools = new Map();
        this.functions = new Map();
    }

    // 对象类型注册
    registerTool(tool: Tool) {
        if (this.tools.has(tool.name)) {
            t.warn(`Tool with name ${tool.name} is already registered. Overwriting.`);
        }
        this.tools.set(tool.name, tool);
        t.success(`Registered tool: ${tool.name}`);
    }

    // 函数类型注册
    registerFunction(name: string, func: Function, description: string = "") {
        if (this.functions.has(name)) {
            t.warn(`Function with name ${name} is already registered. Overwriting.`);
        }
        this.functions.set(name, { func, description });
        t.success(`Registered function: ${name}`);
    }

    // 删除工具
    unregister(name: string){
        this.tools.delete(name);
        t.success(`Unregister tool: ${name}`);
    }

    // 获取所有工具描述
    getToolDescriptions(): string {
       const descriptions: string[] = [];
       this.tools.forEach((tool, name) => {
           descriptions.push(`${name} - ${tool.description}`);
       });
         this.functions.forEach((value, name) => {
             descriptions.push(`${name} - ${value.description}`);
         });
         return descriptions.join("\n") || "暂无可用工具";
    }

    // 获取工具实例
    getTool(name: string): Tool | undefined {
        return this.tools.get(name);
    }

    // 获取所有工具列表
    getList(): string[] {
        return [...this.tools.keys(), ...this.functions.keys()];
    }
}