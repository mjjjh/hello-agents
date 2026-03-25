import { ParameterParser, type ParamDefinition } from './ParameterParser.js';
import ToolRegistry from './registry.js';
import t from 'term-style';

export class ToolExecutor {
    private toolRegistry: ToolRegistry | null = null;

    constructor(toolRegistry?: ToolRegistry) {
        if (toolRegistry) {
            this.toolRegistry = toolRegistry;
        }
    }

    setToolRegistry(registry: ToolRegistry): void {
        this.toolRegistry = registry;
    }

    /**
     * 执行工具调用
     */
    executeToolCall(toolName: string, parameters: string): any {
        if (!this.toolRegistry) {
            console.error("工具注册表未初始化，无法执行工具调用");
            return null;
        }

        // 获取工具
        const tool = this.toolRegistry.getTool(toolName);
        if (!tool) {
            console.error(`工具 "${toolName}" 未找到`);
            return null;
        }

        // 获取参数定义
        const paramDefs: ParamDefinition[] = tool.getParameters() ?? [];

        // 解析参数为函数参数对象形式
        const params = ParameterParser.parseToObject(parameters, paramDefs);
        t.info("工具参数: " + JSON.stringify(params));
        // 执行工具
        try {
            return tool.run(params);
        } catch (error) {
            console.error(`执行工具 "${toolName}" 时出错:`, error);
            return null;
        }
    }

    /**
     * 批量执行工具调用
     */
    executeBatch(toolCalls: Array<{ toolName: string; parameters: string }>): any[] {
        return toolCalls.map(call =>
            this.executeToolCall(call.toolName, call.parameters)
        );
    }
}
