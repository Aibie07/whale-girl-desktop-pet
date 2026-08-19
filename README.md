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
  -  API 密钥由宿主端运行时读取（`DEEPSEEK_API_KEY`），**不会写入浏览器**。

## 依赖

- 已安装 [DeepSeek Harness Desktop](https://github.com/deepseek-ai/deepseek-harness)。
- 在 DSH 中配置好 DeepSeek API 密钥（`DEEPSEEK_API_KEY`）。自行在deepseek开放平台获取密钥（https://platform.deepseek.com/usage）
- 已配置Node.js 18+（安装脚本用 `fetch` 下载素材包）。
- 已安装Git
## 两个安装方式选一个即可，国外或有梯子推荐安装方式1，中国国内用户推荐安装方式2
## 安装1（国外用户或者有梯子）
tip:本插件目前只通过 git clone 安装

```bash
git clone https://github.com/Aibie07/whale-girl-desktop-pet dsh-pet
cd dsh-pet
node install-pet.cjs
```

然后**重启 DSH 应用**，打开页面（必要时刷新 F5），右下角即可看到桌宠。

> 安装脚本会自动：**下载素材包**（若本地缺失，从 GitHub Release 拉取 `assets.tar.gz` 并解压）→ 把皮肤和表情包写入 DSH 插件目录 → 把表情包拷进插件目录（自包含）→ 把插件登记到 web / desktop 两个 profile。
## 安装2（国内用户没有梯子的情况）
1. 先在终端执行这两步：
    git clone https://github.com/Aibie07/whale-girl-desktop-pet dsh-pet
    cd dsh-pet
    再从网盘下载 鲸鱼娘gif素材：
   <网盘链接：https://pan.quark.cn/s/4281a37690c6，提取码 UXSv>

2. 解压到项目根目录（即和 `install-pet.cjs` 同级），
   解压后应该得到两个文件夹：
   - 素材/
   - 蓝色大肥鱼表情包/

3. 再运行安装脚本（脚本检测到素材已存在，会跳过下载）：
   node install-pet.cjs
### 素材包（Release）

皮肤和表情包体积较大（约 488MB），**不放在 git 仓库里**，而是打包成 `assets.tar.gz` 上传到 GitHub Release。安装脚本会在素材目录缺失时自动下载解压。

- 下载地址默认为 `https://github.com/Aibie07/whale-girl-desktop-pet/releases/download/v1.0.0/assets.tar.gz`；
- 若你 fork 后改了 Release 地址，可用环境变量覆盖：`DSH_PET_ASSETS_URL=<你的下载地址> node install-pet.cjs`；
- 也可以手动下载 `assets.tar.gz`，解压到项目根目录（得到 `素材/` 和 `蓝色大肥鱼表情包/`）后再运行安装脚本。
- 国内用户推荐网盘下载，网盘链接：https://pan.quark.cn/s/4281a37690c6，提取码 UXSv（提供方：B 站 UP 主 **「赤风RED」**）
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
- 想加新皮肤：在 `素材/` 下新建子目录，放入 5 张 GIF，重新跑 `install-pet.cjs`。（tip:另一个皮肤是绝区零角色雷米埃尔）
- 想换动作包：替换 `蓝色大肥鱼表情包/` 里的 GIF（保持 `.gif` 后缀），重新安装。

## 素材来源与授权

- 表情包素材来自 B 站 UP 主 **「赤风RED」**，已获授权使用。若用于其它用途，请自行获取up主本人授权。


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

代码采用 [MIT](./LICENSE)。鲸鱼娘gif素材版权归原作者B站up「赤风RED」所有。

---

# DSH Desktop Pet (dsh-pet)

A desktop pet plugin for [DeepSeek Harness Desktop (DSH)](https://github.com/deepseek-ai/deepseek-harness). The pet switches animations based on the model's state, and supports dragging, resizing, skins, a right-click menu, random actions, and one-click DeepSeek API balance lookup.

## Features

- **State sync**: the pet automatically switches animations when the model is thinking / outputting / done / idle.
- **Interactions**:
  - Left-drag to move, scroll wheel to resize, double-click to reset size;
  - Left-click to play a random action;
  - Right-click menu: resize / switch skin / actions / play through all / check balance / reset position / hide.
- **Multiple skins**: GIFs in the `素材/` folder are auto-detected as skins, switchable via right-click → 换肤 (Switch skin).
- **Balance lookup**: click 查余额 (Check balance) to show your DeepSeek API balance.
  - The API key is read at runtime by the host process (`DEEPSEEK_API_KEY`) and is **never exposed to the browser**.

## Requirements

- [DeepSeek Harness Desktop](https://github.com/deepseek-ai/deepseek-harness) installed.
- A DeepSeek API key (`DEEPSEEK_API_KEY`) configured in DSH. Get one at https://platform.deepseek.com/usage
- Node.js 18+ (the install script uses `fetch` to download the asset pack).
- Git installed.

## Installation

Choose **one** of the two methods below. Method 1 is recommended for international users or those with a VPN/proxy; Method 2 is recommended for users in mainland China.

### Method 1 (international users / with VPN)

> Note: this plugin is currently installed via `git clone` only.

```bash
git clone https://github.com/Aibie07/whale-girl-desktop-pet dsh-pet
cd dsh-pet
node install-pet.cjs
```

Then **restart the DSH app**, open the page (refresh with F5 if needed), and the pet appears in the bottom-right corner.

> The install script will: **download the asset pack** (if missing locally, it pulls `assets.tar.gz` from the GitHub Release and extracts it) → write the skins and reactions into the DSH plugin folder → copy the reactions into the plugin folder (self-contained) → register the plugin into both the web and desktop profiles.

### Method 2 (mainland China users without a VPN)

1. First run these two steps in a terminal:
   ```bash
   git clone https://github.com/Aibie07/whale-girl-desktop-pet dsh-pet
   cd dsh-pet
   ```
   Then download the whale-girl GIF assets from the cloud drive:
   <Cloud drive link: https://pan.quark.cn/s/4281a37690c6, access code: UXSv>

2. Extract the archive into the project root (the same folder as `install-pet.cjs`).
   After extraction you should have two folders:
   - `素材/`
   - `蓝色大肥鱼表情包/`

3. Then run the install script (it detects the assets already exist and skips the download):
   ```bash
   node install-pet.cjs
   ```

### Asset pack (Release)

The skins and reactions are large (~488 MB), so they are **not stored in the git repo** — they are packed into `assets.tar.gz` and uploaded to a GitHub Release. The install script downloads and extracts it automatically when the asset folders are missing.

- Default download URL: `https://github.com/Aibie07/whale-girl-desktop-pet/releases/download/v1.0.0/assets.tar.gz`
- If you fork and change the Release URL, override it with an env var: `DSH_PET_ASSETS_URL=<your-url> node install-pet.cjs`
- You can also download `assets.tar.gz` manually, extract it to the project root (to get `素材/` and `蓝色大肥鱼表情包/`), then run the install script.
- Users in mainland China are recommended to use the cloud-drive link: https://pan.quark.cn/s/4281a37690c6, access code UXSv (provided by Bilibili UP 主 **「赤风RED」**).

## Asset folder structure

> These folders are downloaded and extracted by the install script from the Release (they are ignored by `.gitignore` and are not in the repo).

```
素材/                      # Skins: 5 GIFs in the root = the "默认" (default) skin
├── 1.gif  ... 5.gif       # idleA / thinking / idleB / output / done
└── 大肥鱼/                # Extra skins (subfolder name = skin name)
    ├── 1.gif ... 5.gif

蓝色大肥鱼表情包/           # Reaction GIFs used by actions / play-through (157 GIFs)
└── *.gif
```

- Skin naming convention (5 GIFs per skin): `1.gif` idleA, `2.gif` thinking, `3.gif` idleB, `4.gif` output, `5.gif` done.
- To add a new skin: create a subfolder under `素材/`, put 5 GIFs in it, and re-run `install-pet.cjs`. (tip: another skin is the Zenless Zone Zero character Remiel)
- To change the action pack: replace the GIFs in `蓝色大肥鱼表情包/` (keep the `.gif` extension) and reinstall.

## Asset source & license

- The emoji/sticker assets come from Bilibili UP 主 **「赤风RED」**, used with permission. For any other use, please obtain the author's own permission.

## Directory layout

```
install-pet.cjs        # One-click install script (cross-platform, only Node required)
pet-src/               # Plugin source (host + client)
  package.json
  lib/index.js         # Host: balance proxy + reaction file route
  lib/client.js        # Client: pet UI / animations / menu / interactions
# The two asset folders below are NOT in the repo; they are downloaded by the install script:
# 素材/                # Skin GIFs
# 蓝色大肥鱼表情包/     # Action GIFs
```

## FAQ

- **Pet doesn't appear**: make sure DSH was restarted and the page was refreshed; check the install script output for errors.
- **Balance lookup fails**: make sure `DEEPSEEK_API_KEY` is configured in DSH.
- **Action GIFs don't load**: make sure the `蓝色大肥鱼表情包/` folder exists and contains `.gif` files, and re-run the install script.
- **Different port/path**: the script uses `$DSH_HOME` (default `~/.dsh`) to locate the DSH config. If your DSH is installed elsewhere, run `DSH_HOME=/path/to/.dsh node install-pet.cjs`.

## License

The code is licensed under [MIT](./LICENSE). The whale-girl GIF assets belong to their original author, Bilibili UP 主「赤风RED」.
