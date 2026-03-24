# Agent Browser Skill

## 允许的工具
allowed-tools: Bash[guarded](npx agent-browser:*), Bash[guarded](agent-browser:*)

## 环境配置
- Chrome 路径: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- 使用方式: 所有 agent-browser 命令需添加 `--executable-path` 参数

## 描述
浏览器自动化 CLI，用于与网站交互，包括导航页面、填写表单、点击按钮、截图、提取数据等。

## 核心工作流程

1. **导航**: `npx agent-browser open <url>`
2. **快照**: `npx agent-browser snapshot -i` (获取元素引用如 @e1, @e2)
3. **交互**: 使用引用来点击、填写、选择
4. **重新快照**: 导航或 DOM 变化后获取新的引用

## 常用命令

```bash
# 导航
npx agent-browser open https://example.com

# 获取页面元素引用
npx agent-browser snapshot -i

# 点击元素
npx agent-browser click @e1

# 填写表单
npx agent-browser fill @e2 "文本内容"

# 截图
npx agent-browser screenshot page.png

# 等待页面加载
npx agent-browser wait --load networkidle

# 关闭浏览器
npx agent-browser close
```

## 命令链式调用

```bash
npx agent-browser open https://example.com && npx agent-browser wait --load networkidle && npx agent-browser snapshot -i
```
