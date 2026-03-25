import { Tool } from "../../tools/registry.js";
import t from 'term-style'
interface AddToolParameters {
    a: number;
    b: number;
}

/**
 * 加法工具 - 计算两个数字的和
 */
export class AddTool extends Tool {
    constructor() {
        super("add", "计算两个数字的和, 输入参数为: a, b");
    }

    run(args: AddToolParameters): number {
        t.bgBlue(JSON.stringify(args));
        const { a, b } = args;
        t.bgBrightBlue(a + '   ' + b)

        // if (isNaN(+a) || isNaN(+b)) {
        //     throw new Error("参数 a 和 b 必须是数字");
        // }

        return (+a) + (+b);
    }

    getParameters() {
        return [
            {
                name: "a",
                type: "number",
                description: "第一个加数",
                required: true,
            },
            {
                name: "b",
                type: "number",
                description: "第二个加数",
                required: true,
            },
        ];
    }
}

export default AddTool;
