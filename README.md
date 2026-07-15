# Cup Choice Simulator

一个可直接部署到 GitHub Pages 的纯静态单页 framing 实验。研究资料匿名提交到独立的 Google Apps Script Web App，并保存到 Google Sheet；抽奖联络资料不进入研究资料表。

公开网址：<https://justine-sj.github.io/cup-choice-simulator/>

社群贴文 QR Code：`cup-choice-simulator-qr.png`

## 本地测试

在此目录运行：

```bash
python3 -m http.server 8080
```

然后打开：

```text
http://localhost:8080/?test=1
```

测试模式会模拟提交成功、允许重复测试，并显示“重置本地测试”按钮。

## 连接匿名研究资料表

1. 新建一个只用于研究数据的 Google Sheet。
2. 在该 Sheet 选择「扩充功能 → Apps Script」。
3. 将 `apps-script/Code.gs` 的内容复制到 Apps Script 编辑器。
4. 在 Apps Script 中手动运行一次 `setup()`，并授权访问该研究 Sheet。
5. 选择「部署 → 新部署 → 网页应用程式」。
6. 执行身份选择「我」，访问权限选择「所有人」。
7. 复制以 `/exec` 结尾的 Web App URL。
8. 在 `index.html` 中把：

```js
appsScriptUrl: "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL"
```

替换成实际 URL。

请勿把抽奖姓名、电子邮件、社群帐号、电话或资格代码加入研究 Sheet。

## 抽奖资料分离原则

- 研究 Sheet：只保存匿名实验选择。
- 抽奖联络：使用独立 Google Form、社群留言或私讯收集。
- 完成证明代码只在参与者浏览器中产生，不上传至研究 Sheet。
- 抽奖表单不要询问研究 `session_id`。
- 研究 Sheet 只保存日期，不保存精确提交时间，降低与抽奖表单配对的可能。

## GitHub Pages

项目推送到 GitHub 后，可在仓库「Settings → Pages」中选择从 `main` 分支根目录发布。公开网址通常为：

```text
https://<github-username>.github.io/<repository-name>/
```

确认最终网址后，再生成社群贴文用 QR Code。
