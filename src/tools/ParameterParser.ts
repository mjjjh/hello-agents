/**
 * 参数解析器 - 支持多种参数格式的解析
 * 统一返回函数参数对象形式: { paramName: value }
 */

export interface ParamDefinition {
    name: string;
    type?: string;
    description?: string;
    required?: boolean;
    default?: any;
}

export class ParameterParser {
    /**
     * 解析参数字符串为函数参数对象
     * 支持格式:
     *   - 命名参数: a=1 b=2 或 a=1, b=2
     *   - 位置参数: 1 2 或 1, 2
     *   - JSON对象: {"a": 1, "b": 2}
     *
     * @param parameters 参数字符串
     * @param paramDefs 参数定义列表（用于位置参数映射）
     * @returns 统一的对象格式 { paramName: value }
     */
    static parseToObject(
        parameters: string,
        paramDefs: ParamDefinition[] = []
    ): Record<string, any> {
        parameters = parameters.trim();

        if (!parameters) {
            return {};
        }

        // 尝试解析为JSON对象
        if (parameters.startsWith('{') && parameters.endsWith('}')) {
            try {
                return JSON.parse(parameters);
            } catch {
                // 继续尝试其他格式
            }
        }

        // 检测是否为命名参数格式（包含 = 号）
        const hasNamedParams = this.detectNamedParams(parameters);

        if (hasNamedParams) {
            // 命名参数: a=1 b=2
            return this.parseNamedParams(parameters);
        } else {
            // 位置参数: 1 2
            return this.parsePositionalToObject(parameters, paramDefs);
        }
    }

    /**
     * 检测是否包含命名参数（=号且在引号外）
     */
    private static detectNamedParams(parameters: string): boolean {
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < parameters.length; i++) {
            const char = parameters[i];

            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
                inQuotes = false;
            } else if (char === '=' && !inQuotes) {
                return true;
            }
        }

        return false;
    }

    /**
     * 解析命名参数为对象
     */
    private static parseNamedParams(parameters: string): Record<string, any> {
        const result: Record<string, any> = {};
        const tokens = this.tokenize(parameters);

        for (const token of tokens) {
            const parsed = this.parseKeyValue(token);
            if (parsed) {
                result[parsed.key] = parsed.value;
            }
        }

        return result;
    }

    /**
     * 解析位置参数为对象（根据参数定义映射）
     */
    private static parsePositionalToObject(
        parameters: string,
        paramDefs: ParamDefinition[]
    ): Record<string, any> {
        const result: Record<string, any> = {};
        const values = this.parsePositionalValues(parameters);

        for (let i = 0; i < values.length && i < paramDefs.length; i++) {
            const def = paramDefs[i];
            if (def) {
                result[def.name] = values[i];
            }
        }

        // 填充默认值
        for (const def of paramDefs) {
            if (!(def.name in result) && def.default !== undefined) {
                result[def.name] = def.default;
            }
        }

        return result;
    }

    /**
     * 解析位置参数值为数组
     */
    private static parsePositionalValues(parameters: string): any[] {
        parameters = parameters.trim();
        if (!parameters) {
            return [];
        }

        const result: any[] = [];
        const tokens = this.tokenize(parameters);

        for (const token of tokens) {
            result.push(this.parseValue(token.trim()));
        }

        return result;
    }

    /**
     * 将参数字符串分割为独立的token
     * 处理逗号和空格分隔，但忽略引号内的分隔符
     */
    private static tokenize(parameters: string): string[] {
        const tokens: string[] = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        let bracketDepth = 0;
        let braceDepth = 0;

        for (let i = 0; i < parameters.length; i++) {
            const char = parameters[i];

            // 处理引号
            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
                current += char;
            } else if (char === quoteChar && inQuotes) {
                if (parameters[i - 1] !== '\\') {
                    inQuotes = false;
                }
                current += char;
            }
            // 处理括号深度（数组）
            else if (char === '[' && !inQuotes) {
                bracketDepth++;
                current += char;
            } else if (char === ']' && !inQuotes) {
                bracketDepth--;
                current += char;
            }
            // 处理花括号深度（对象）
            else if (char === '{' && !inQuotes) {
                braceDepth++;
                current += char;
            } else if (char === '}' && !inQuotes) {
                braceDepth--;
                current += char;
            }
            // 处理逗号或空格分隔
            else if ((char === ',' || /\s/.test(char || '')) && !inQuotes && bracketDepth === 0 && braceDepth === 0) {
                if (current.trim()) {
                    tokens.push(current.trim());
                }
                current = '';
            }
            else {
                current += char;
            }
        }

        // 添加最后一个token
        if (current.trim()) {
            tokens.push(current.trim());
        }

        return tokens;
    }

    /**
     * 解析单个键值对
     */
    private static parseKeyValue(token: string): { key: string; value: any } | null {
        const equalIndex = token.indexOf('=');

        if (equalIndex === -1) {
            // 没有等号，作为flag处理（值为true）
            return { key: token.trim(), value: true };
        }

        const key = token.substring(0, equalIndex).trim();
        let valueStr = token.substring(equalIndex + 1).trim();

        return { key, value: this.parseValue(valueStr) };
    }

    /**
     * 解析值部分，支持多种类型
     */
    private static parseValue(valueStr: string): any {
        if (!valueStr) {
            return '';
        }

        // 带引号的字符串
        if ((valueStr.startsWith('"') && valueStr.endsWith('"')) ||
            (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
            return this.unescapeString(valueStr.slice(1, -1));
        }

        // 数组 [1, 2, 3]
        if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
            return this.parseArray(valueStr);
        }

        // 对象 {"a": 1}
        if (valueStr.startsWith('{') && valueStr.endsWith('}')) {
            try {
                return JSON.parse(valueStr);
            } catch {
                // 解析失败，作为字符串返回
                return valueStr;
            }
        }

        // 数字
        if (/^-?\d+$/.test(valueStr)) {
            return parseInt(valueStr, 10);
        }
        if (/^-?\d+\.\d+$/.test(valueStr)) {
            return parseFloat(valueStr);
        }

        // 布尔值
        if (valueStr === 'true') return true;
        if (valueStr === 'false') return false;
        if (valueStr === 'null') return null;
        if (valueStr === 'undefined') return undefined;

        // 未引号的字符串
        return this.unescapeString(valueStr);
    }

    /**
     * 解析数组
     */
    private static parseArray(arrayStr: string): any[] {
        const content = arrayStr.slice(1, -1).trim();
        if (!content) {
            return [];
        }

        const items: any[] = [];
        const tokens = this.tokenize(content);

        for (const token of tokens) {
            items.push(this.parseValue(token.trim()));
        }

        return items;
    }

    /**
     * 处理字符串转义序列
     */
    private static unescapeString(str: string): string {
        return str
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\\\/g, '\\');
    }
}

// 使用示例:
// ParameterParser.parseToObject('a=1 b=2', [{name: 'a'}, {name: 'b'}])
// => { a: 1, b: 2 }
//
// ParameterParser.parseToObject('1 2', [{name: 'a'}, {name: 'b'}])
// => { a: 1, b: 2 }
//
// ParameterParser.parseToObject('{"a": 1, "b": 2}')
// => { a: 1, b: 2 }
