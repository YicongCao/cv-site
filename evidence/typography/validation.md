# 方舟像素接入验证

2026-10-30：采用 Ark Pixel 12px proportional zh-Hans，版本 2026.10.25。原始 WOFF2 未修改，566,768 字节，本地托管，随字体包含 OFL.txt。发行包 SHA-256 与 GitHub 官方发行摘要一致，来源记录见 ../../design/typography/source.json。

- 字体 cmap 检查：15 个项目完整标题、年份、三主题名、标牌和中文导航文字均无缺字，详见 ../../design/typography/coverage.json。
- 桌面 1440×900 与手机 390×844 检查：展区标题、导航、按钮及详情标题采用方舟像素，正文和贡献列表仍为系统无衬线；手机无横向溢出。
- 字号采用 12/24/36/48/60px，不模拟粗体；pixelcao 自绘字标保持。
- Node 服务返回 font/woff2；字体预加载，font-display:swap，并在字体就绪后重新计算场景标牌位置。
- 构建成功，现有 9 项测试全部通过；浏览器无 warn/error。截图 overview.png、desktop.png、detail.png、mobile.png、mobile-detail.png；字体计算样式见 checks.json。

日常安装、构建和运行无需 FontTools 或网络字体服务。此次 FontTools 仅用于一次性字形覆盖核对。
