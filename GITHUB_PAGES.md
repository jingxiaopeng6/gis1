# GitHub Pages 自动部署说明

这个仓库已经准备好走 GitHub Actions 自动部署。你不需要把 `dist/` 手动上传到仓库里，正确流程是：

1. 把源码和 `.github/workflows/deploy.yml` 一起推到 GitHub。
2. 在仓库的 `Settings -> Pages` 里把 `Source` 设为 `GitHub Actions`。
3. 每次推送到 `main` 或 `master`，GitHub 会自动执行 `npm ci`、`npm run build`，然后把 `dist/` 发布成站点。

## 需要保留的内容

- `src/`
- `index.html`
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `tailwind.config.js`
- `postcss.config.js`
- `.github/workflows/deploy.yml`

## 不要提交的内容

- `node_modules/`
- `dist/`
- 各类本地缓存、日志、临时文件

## 你现在该怎么做

1. 确认仓库里已经有 `.github/workflows/deploy.yml`
2. 确认 `Settings -> Pages` 选择的是 `GitHub Actions`
3. 推送一次到 `main` 分支
4. 等待 Actions 跑完后，访问 GitHub Pages 地址

## 本地验证

先确认构建没问题：

```bash
npm install
npm run build
```

如果构建成功，GitHub Actions 也应该可以正常部署。
