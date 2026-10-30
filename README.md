# pixelcao · 像素白盒展厅

独立的静态作品站。Node.js 只负责本机文件服务；Three.js 实现正交三维展架、像素台脚、阶梯投影和封面抽取／归位。15 个项目，230 份去重素材。

## 运行

需要 Node.js 22 或以上版本。

```sh
cd cv_proj
npm ci
npm run build
npm start
```

打开 http://127.0.0.1:3000 。服务仅监听 127.0.0.1；修改端口用 `PORT=3001 npm start`。端口占用会直接报错。停止服务按 Ctrl+C。修改 `src/` 或 `public/` 后重新构建、刷新页面。

可把整个 `cv_proj/` 复制到任意位置运行，无需上级 Gallery、旧预览服务、FFmpeg、Python或 CDN。`dist/` 和 `node_modules/` 可删除后重建。依赖锁定 Three.js 0.186.1、esbuild 0.28.2。

## 浏览

- 点击年份、箭头或封面切换项目；展架支持左右拖动、滚轮和键盘方向键。
- 点击选中封面或“查看项目”打开详情；实际三维封面抬起、转向、移入详情位置，关闭后返回。
- 单图显示大图；多份素材在两列瀑布流中按原比例展示，懒加载图片。点图放大，可用方向键继续浏览。
- 视频进入详情／滚动进入可见区域后自动静音播放，原生控件可开启声音、拖动进度。移出可见区域、切换、放大其他素材或关闭详情会停止原视频。
- Escape 关闭详情或大图。关闭后恢复焦点；浏览器前进／后退和 `/#project=cloudgame` 等深链接可用。
- 尊重系统减少动态效果设置；`?motion=reduce` 可验证即时切换。`?renderer=flat` 可验证无 WebGL 的封面降级。
- `/resume/` 是本轮复制的 HTML 简历，包含图片和大图依赖。本轮没有重新导出 PDF。

## 目录

- `src/`：页面、样式、状态交互、Three.js 场景和自绘点阵字形。
- `public/data/portfolio.json`：访客内容，只包含站内展示／预览／原件 URL 与稳定素材 ID。
- `public/media/`：原件（按图片／视频／文档）、兼容视频、预览图和封面。
- `public/resume/`：独立 HTML 简历及资源。
- `design/`：A 概念图、来源清单、许可。不会发布到 dist。
- `scripts/`：构建、验证、一次性迁移和可选媒体审计。
- `evidence/`：验收记录与真实浏览器截图，不进入 dist。
- `server.mjs`：仅提供 dist，支持 GET、HEAD、单段 Range，拒绝目录穿越和目录列表。

## 资源与验证

```sh
npm run check
npm run build
npm test
```

`check` 验证项目／素材数量、站内引用和 230 个原件 SHA-256。`test` 验证 HTTP 类型、HEAD、视频 Range、无效范围、404、源码不可访问和路径边界。

`import-assets.py /absolute/source/repo` 是一次性导入工具，不参与日常构建。只有重新导入旧视频时需要 FFmpeg；`inspect-media.py` 是可选媒体解码审计，需要 Pillow 和 ffprobe。已准备的兼容视频使用 H.264/AAC；原本兼容的视频保留，HEVC 转码最大边 1920。全部原件留存在站内目录。

来源／排除记录见 `design/source-ledger.json`：重复素材、ZIP、副本、账号截图、待归属素材、空文件和 JS 黑洞不进入访客资源。云游戏天梯为 2019 年；西电导航为大学毕业项目，未虚构年份。Nex 的 1024 × JEV 补充演示沿用既有档案归属，其具体关联仍待核对。

本项目沿用上级仓库的本地 Git；没有嵌套仓库、在线发布或业务数据库。完整验收见 `evidence/validation.md`。
