# 绑定项目到 GitHub

本地 Git 仓库已初始化。按以下步骤将项目推送到 GitHub：

> 项目说明与快速开始请参阅根目录 [README.md](./README.md)。

## 1. 在 GitHub 上创建新仓库

1. 打开 [https://github.com/new](https://github.com/new)
2. 填写仓库名称（如 `gojuon-study` 或 `japanese-kana-learning`）
3. 选择 **Public**
4. **不要**勾选 "Add a README file"、"Add .gitignore"、"Choose a license"（本地已有）
5. 点击 **Create repository**

## 2. 添加远程仓库并推送

创建完成后，GitHub 会显示仓库地址。在项目根目录执行（将 `YOUR_USERNAME` 和 `YOUR_REPO` 替换为你的 GitHub 用户名和仓库名）：

```bash
cd f:\project-bolt-sb1-b8bpnpwz

# 添加远程仓库（HTTPS）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 推送到 GitHub（首次推送）
git branch -M main
git push -u origin main
```

如果使用 SSH：

```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 3. 后续推送

之后只需执行：

```bash
git add .
git commit -m "你的提交说明"
git push
```
