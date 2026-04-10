# AGENTS.md

本项目是一个基于 WebGL、WebGPU 和 Three.js 等技术栈的实验场，包含了关于程序化地形、地图生成、着色器特效及 3D 可视化的多种演示（Demo）。

## 项目概览

- **核心技术栈：**
  - [Three.js](https://threejs.org/): 主要的 3D 引擎。
  - [Vite](https://vitejs.dev/): 构建工具及开发服务器。
  - [TypeScript](https://www.typescriptlang.org/): 所有逻辑的编程语言。
  - [GLSL](<https://www.khronos.org/opengl/wiki/Core_Language_(GLSL)>): 自定义着色器（通过 `vite-plugin-glsl` 支持）。
  - [Tweakpane](https://cocopon.github.io/tweakpane/): 用于实时参数调节的 GUI 库。
  - 其他库: `d3-delaunay`, `gsap`, `tween.js`, `ogl`, `simplex-noise`。

## 项目结构

- `pages/`: 包含所有的演示子项目。
  - 每个演示通常拥有自己的 `index.html` 和 `main.ts`。
  - 部分演示包含 `shaders/` 目录用于存放自定义 GLSL 文件。
  - `pages/page-info.ts` 负责管理这些页面的元数据展示组件。
- `lib/`: 共享工具库，包括噪声函数 (`webgl-noise`)。
- `public/`: 静态资源（3D 模型、贴图、封面图）。
- `plugin/`: 用于页面发现或转换的自定义 Vite 插件。

## 关键开发指南

1. **添加新演示 (Demo):**
   - 在 `pages/` 下创建一个新目录（例如 `pages/my-new-demo/`）。
   - 包含一个导入了 `./main.ts` 的 `index.html`。
   - 项目模版基于 `pages/starter` 中的代码结构。
   - 使用 Three.js 或 OGL 在 `main.ts` 中实现演示逻辑。
   - **必须更新** 根目录下的 `main.ts` 中的 `pages` 数组，添加新演示的元数据（名称、描述、URL、标签等），以便在主页显示。
   - 如果需要，在 `public/cover/` 添加封面图。

2. **着色器处理:**
   - 着色器由 `vite-plugin-glsl` 插件处理。
   - 在 TypeScript 中直接导入 `.glsl`, `.vert` 或 `.frag` 文件：`import vertexShader from './shaders/vertex.glsl';`。

3. **共享资源:**
   - 在实现自己的噪声函数或几何工具前，请先检查 `lib/` 目录下是否有可复用的资源。

4. **测试与验证:**
   - 运行 `npm run dev` 启动开发服务器。
   - 通过路径访问特定演示（例如 `http://localhost:5173/pages/12-shader-earth/index.html`）。

## AI 代理操作建议

- **探索阶段:** 当被要求修复或增强特定演示时，请首先进入 `pages/` 下对应的文件夹进行调研。
- **一致性:** 遵循项目中已建立的模式，使用 Tweakpane 提供交互式控制。
- **性能:** 对于程序化生成（如地图生成），确保逻辑经过优化。
- **文档维护:** 添加新演示后，务必同步更新根目录 `main.ts` 以确保主页索引正确。
- **尊重用户修改:** 在 AI 代理修改完代码后，用户可能会再做一些修改。在下一轮对话中，务必读取最新的文件内容，基于用户的最新代码继续工作，严禁重置或覆盖用户的手动修改。
