# dsh-window-chrome

DSH web 插件：为 Wails 桌面壳补上窗口交互——无边框窗口的拖拽热区、任意 `--wails-draggable: drag` 区域的双击最大化/还原、侧栏底部的 DevTools 快捷入口。

> 面向 dsh 桌面壳（Wails）。纯浏览器里 `window._wails` 不存在，所有窗口行为自动休眠，无副作用，装了也不影响浏览器使用。

## 安装

```powershell
dsh plugin --profile web add dsh-window-chrome
```

重启 dsh web（桌面壳 = 关掉窗口重开）后生效。**注意**：DevTools 双击最大化需要桌面壳 Go 侧有对应的 `titlebar-dblclick` / `open-devtools` 事件处理（dsh 桌面壳已内置；自制壳请参考 wails `AllowSimpleEventEmit`）。

## 行为

| 行为 | 触发 |
|---|---|
| 拖拽热区 | 会话头部切换的过渡帧里，在中央栏顶部挂一个透明热区（`aria-hidden`，CSS `body:has()` 零延迟显隐），保证无边框窗口此时仍可拖动；老 WebView2 无 `:has()` 时有 interval 兜底 |
| 双击最大化 | 双击任何 `--wails-draggable: drag` 区域，经 `wails:event:emit:titlebar-dblclick` 通道通知 Go 侧窗口进程切换最大化 |
| DevTools 入口 | 侧栏底部按钮（宽栏 = 图标+文字，窄栏 = 仅图标），点击经 `wails:event:emit:open-devtools` 由 Go 侧 `OpenDevTools()` 响应 |

样式全部取自主题 token（`--dsw-alias-*`），跟随当前皮肤与深浅色。

## 卸载

```powershell
dsh plugin --profile web remove dsh-window-chrome
```

## 开发

| 文件 | 作用 |
|---|---|
| `lib/client.js` | 客户端半：拖拽热区、双击最大化、DevTools 底栏按钮（这些行为此前由桌面壳 main.go 经 ExecJS 注入） |
| `cordis.patch.yml` | bundle patch：官方层之后插入本插件 row |

无宿主半逻辑（`lib/index.js` 为空壳导出）。本地开发：`dsh plugin --profile web add C:/path/to/dsh-window-chrome`；改 `lib/client.js` 有约 500ms 热替换。
