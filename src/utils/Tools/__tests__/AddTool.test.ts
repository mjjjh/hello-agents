import { describe, it, expect } from "vitest";
import { AddTool } from "../AddTool.js";

describe("AddTool", () => {
    it("应该正确计算两个数字的和", () => {
        const tool = new AddTool();
        expect(tool.run({ a: 2, b: 3 })).toBe(5);
        expect(tool.run({ a: 10, b: 20 })).toBe(30);
        expect(tool.run({ a: -5, b: 5 })).toBe(0);
        expect(tool.run({ a: 1.5, b: 2.5 })).toBe(4);
    });

    it("应该返回正确的工具名称和描述", () => {
        const tool = new AddTool();
        expect(tool.name).toBe("add");
        expect(tool.description).toBe("计算两个数字的和");
    });

    it("应该返回正确的参数定义", () => {
        const tool = new AddTool();
        const params = tool.getParameters();
        expect(params).toHaveLength(2);
        expect(params[0].name).toBe("a");
        expect(params[1].name).toBe("b");
    });

    it("应该在传入非数字参数时抛出错误", () => {
        const tool = new AddTool();
        expect(() => tool.run({ a: "2" as any, b: 3 })).toThrow("参数 a 和 b 必须是数字");
    });
});