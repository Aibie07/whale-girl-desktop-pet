# DSH 桌宠（dsh-pet）

一个 [DeepSeek Harness Desktop (DSH)](https://github.com/deepseek-ai/deepseek-harness) 的桌面宠物插件。桌宠会根据模型状态自动切换动画，支持拖拽、缩放、换肤、右键菜单、随机动作，还能一键查询 DeepSeek API 余额。

## 功能

- **状态同步**：模型思考 / 输出 / 完成 / 待机时，桌宠自动切换对应动画。
- **交互**：
  - 左键拖拽移动、滚轮缩放、双击复位大小；
  - 左键单击随机播放一个动作；
  - 右键弹出菜单：调大小 / 换肤 / 动作 / 轮番播放 / 查余额 / 复位位置 / 隐藏。
- **多套皮肤**：`素材/` 目录下的 GIF 自动识别为皮肤，右键「换肤」切换。
- **查询余额**：点击「查余额」显示 DeepSeek API 余额。
  - 🔒 API 密钥由宿主端运行时读取（`DEEPSEEK_API_KEY`），**不会写入浏览器**。

## 依赖

- 已安装 [DeepSeek Harness Desktop](https://github.com/deepseek-ai/deepseek-harness)。
- 在 DSH 中配置好 DeepSeek API 密钥（`DEEPSEEK_API_KEY`）。
- Node.js 18+（安装脚本用 `fetch` 下载素材包）。

## 安装

```bash
git clone https://github.com/Aibie07/- dsh-pet
cd dsh-pet
node install-pet.cjs
```

然后**重启 DSH 应用**，打开页面（必要时刷新 F5），右下角即可看到桌宠。

> 安装脚本会自动：**下载素材包**（若本地缺失，从 GitHub Release 拉取 `assets.tar.gz` 并解压）→ 把皮肤和表情包写入 DSH 插件目录 → 把表情包拷进插件目录（自包含）→ 把插件登记到 web / desktop 两个 profile。

### 素材包（Release）

皮肤和表情包体积较大（约 488MB），**不放在 git 仓库里**，而是打包成 `assets.tar.gz` 上传到 GitHub Release。安装脚本会在素材目录缺失时自动下载解压。

- 下载地址默认为 `https://github.com/Aibie07/-/releases/download/v1.0.0/assets.tar.gz`；
- 若你 fork 后改了 Release 地址，可用环境变量覆盖：`DSH_PET_ASSETS_URL=<你的下载地址> node install-pet.cjs`；
- 也可以手动下载 `assets.tar.gz`，解压到项目根目录（得到 `素材/` 和 `蓝色大肥鱼表情包/`）后再运行安装脚本。

## 素材目录结构

> 这些目录由安装脚本从 Release 下载解压而来（已被 `.gitignore` 忽略，不在仓库里）。

```
素材/                      # 皮肤：根目录 5 张 =「默认」皮肤
├── 1.gif  ... 5.gif       # 待机A / 思考 / 待机B / 输出 / 完成
└── 大肥鱼/                # 额外的皮肤（子目录名 = 皮肤名）
    ├── 1.gif ... 5.gif

蓝色大肥鱼表情包/           # 动作 / 轮番播放 用到的 GIF（157 张）
└── *.gif
```

- 皮肤命名约定（每个皮肤 5 张）：`1.gif` 待机A、`2.gif` 思考、`3.gif` 待机B、`4.gif` 输出、`5.gif` 完成。
- 想加新皮肤：在 `素材/` 下新建子目录，放入 5 张 GIF，重新跑 `install-pet.cjs`。
- 想换动作包：替换 `蓝色大肥鱼表情包/` 里的 GIF（保持 `.gif` 后缀），重新安装。

## 素材来源与授权

- 表情包素材来自 B 站 UP 主 **「赤风RED」**，已获授权使用。请保留此署名；若用于其它用途，请自行确认授权范围。
- 皮肤 GIF 请按同样方式标注来源。

## 目录说明

```
install-pet.cjs        # 一键安装脚本（跨平台，Node 即可运行）
pet-src/               # 插件源码（宿主端 + 客户端）
  package.json
  lib/index.js         # 宿主端：余额代理 + 表情包文件路由
  lib/client.js        # 客户端：桌宠 UI / 动画 / 菜单 / 交互
# 下面两个素材目录不在仓库里，由安装脚本从 Release 下载：
# 素材/                # 皮肤 GIF
# 蓝色大肥鱼表情包/     # 动作 GIF
```

## 常见问题

- **桌宠不出现**：确认 DSH 已重启、页面已刷新；检查终端安装脚本输出是否有报错。
- **余额查不到**：确认已在 DSH 中配置 `DEEPSEEK_API_KEY`。
- **动作图加载不出来**：确认 `蓝色大肥鱼表情包/` 目录存在且含 `.gif` 文件，并已重新运行安装脚本。
- **端口/路径不同**：脚本用 `$DSH_HOME`（默认 `~/.dsh`）定位 DSH 配置，若你的 DSH 装在别处，可 `DSH_HOME=/path/to/.dsh node install-pet.cjs`。

## License

代码采用 [MIT](./LICENSE)。表情包素材版权归原作者「赤风RED」所有，使用请遵守其授权约定。
