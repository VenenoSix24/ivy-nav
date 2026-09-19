export interface EmojiEntry {
  char: string;
  group: string;
  keywords: string[];
}

/**
 * 精选常用图标，不是全量 emoji 表：首页要轻，选择器能搜到就够。
 * 关键词同时给中英文，方便直接搜「部署」或 deploy。
 */
export const emojiCatalog: EmojiEntry[] = [
  { char: "🚀", group: "开发", keywords: ["rocket", "launch", "deploy", "发布", "部署", "上线"] },
  { char: "⚡", group: "开发", keywords: ["zap", "fast", "speed", "性能", "快"] },
  { char: "🔥", group: "开发", keywords: ["fire", "hot", "trending", "热门"] },
  { char: "🛠️", group: "开发", keywords: ["tools", "build", "工具", "构建"] },
  { char: "🔧", group: "开发", keywords: ["wrench", "fix", "config", "配置", "修复"] },
  { char: "⚙️", group: "开发", keywords: ["gear", "settings", "设置", "齿轮"] },
  { char: "🧩", group: "开发", keywords: ["puzzle", "plugin", "插件", "扩展"] },
  { char: "📦", group: "开发", keywords: ["package", "box", "包", "依赖"] },
  { char: "🐳", group: "开发", keywords: ["docker", "container", "容器"] },
  { char: "🐙", group: "开发", keywords: ["github", "octopus", "git", "章鱼"] },
  { char: "🌿", group: "开发", keywords: ["branch", "git", "分支"] },
  { char: "🧪", group: "开发", keywords: ["test", "lab", "测试", "实验"] },
  { char: "🐛", group: "开发", keywords: ["bug", "debug", "缺陷", "调试"] },
  { char: "📝", group: "开发", keywords: ["note", "docs", "文档", "笔记"] },
  { char: "📚", group: "开发", keywords: ["books", "docs", "手册", "文档"] },
  { char: "💻", group: "开发", keywords: ["laptop", "code", "电脑", "编程"] },
  { char: "⌨️", group: "开发", keywords: ["keyboard", "type", "键盘", "输入"] },
  { char: "🖥️", group: "开发", keywords: ["desktop", "server", "台式机", "服务器"] },
  { char: "🗄️", group: "开发", keywords: ["database", "sql", "数据库"] },
  { char: "🔐", group: "开发", keywords: ["lock", "secure", "安全", "加密"] },
  { char: "🔑", group: "开发", keywords: ["key", "token", "密钥", "令牌"] },
  { char: "🛡️", group: "开发", keywords: ["shield", "security", "防护"] },
  { char: "🌐", group: "开发", keywords: ["globe", "web", "网络", "全球"] },
  { char: "☁️", group: "开发", keywords: ["cloud", "云"] },
  { char: "📡", group: "开发", keywords: ["api", "signal", "接口", "信号"] },
  { char: "🔌", group: "开发", keywords: ["plug", "api", "集成", "插头"] },
  { char: "🧠", group: "开发", keywords: ["ai", "brain", "智能", "模型"] },
  { char: "🤖", group: "开发", keywords: ["bot", "ai", "机器人"] },
  { char: "📊", group: "开发", keywords: ["chart", "stats", "图表", "统计"] },
  { char: "📈", group: "开发", keywords: ["growth", "trend", "增长", "趋势"] },
  { char: "🗂️", group: "开发", keywords: ["folder", "files", "文件夹", "整理"] },
  { char: "🧾", group: "开发", keywords: ["log", "receipt", "日志", "票据"] },
  { char: "⏱️", group: "开发", keywords: ["timer", "cron", "定时", "计时"] },
  { char: "🔄", group: "开发", keywords: ["sync", "refresh", "同步", "刷新"] },
  { char: "🧱", group: "开发", keywords: ["block", "infra", "模块", "基建"] },

  { char: "🎨", group: "设计", keywords: ["art", "design", "设计", "调色"] },
  { char: "🖌️", group: "设计", keywords: ["brush", "paint", "画笔", "绘画"] },
  { char: "✏️", group: "设计", keywords: ["pencil", "edit", "铅笔", "编辑"] },
  { char: "📐", group: "设计", keywords: ["ruler", "layout", "尺子", "布局"] },
  { char: "🖼️", group: "设计", keywords: ["image", "photo", "图片", "照片"] },
  { char: "📷", group: "设计", keywords: ["camera", "photo", "相机", "摄影"] },
  { char: "🎬", group: "设计", keywords: ["video", "edit", "剪辑", "视频"] },
  { char: "🎞️", group: "设计", keywords: ["film", "frames", "胶片", "帧"] },
  { char: "🔤", group: "设计", keywords: ["font", "type", "字体", "排版"] },
  { char: "🌈", group: "设计", keywords: ["palette", "color", "配色", "色彩"] },
  { char: "🔷", group: "设计", keywords: ["shape", "vector", "形状", "矢量"] },
  { char: "✨", group: "设计", keywords: ["sparkle", "magic", "灵感", "闪烁"] },

  { char: "🎧", group: "影音", keywords: ["headphones", "music", "耳机", "音乐"] },
  { char: "🎵", group: "影音", keywords: ["music", "note", "音乐", "音符"] },
  { char: "▶️", group: "影音", keywords: ["play", "video", "播放", "视频"] },
  { char: "📺", group: "影音", keywords: ["tv", "stream", "电视", "直播"] },
  { char: "🎮", group: "影音", keywords: ["game", "play", "游戏"] },
  { char: "🎲", group: "影音", keywords: ["dice", "random", "随机", "骰子"] },
  { char: "🍿", group: "影音", keywords: ["movie", "popcorn", "电影", "爆米花"] },
  { char: "🎤", group: "影音", keywords: ["mic", "podcast", "麦克风", "播客"] },
  { char: "📻", group: "影音", keywords: ["radio", "fm", "电台", "广播"] },

  { char: "⭐", group: "常用", keywords: ["star", "favorite", "收藏", "星标"] },
  { char: "❤️", group: "常用", keywords: ["heart", "love", "喜欢", "心"] },
  { char: "🔖", group: "常用", keywords: ["bookmark", "save", "书签", "收藏"] },
  { char: "📌", group: "常用", keywords: ["pin", "pinned", "置顶", "固定"] },
  { char: "🔍", group: "常用", keywords: ["search", "find", "搜索", "查找"] },
  { char: "🏠", group: "常用", keywords: ["home", "首页", "家"] },
  { char: "📮", group: "常用", keywords: ["mail", "inbox", "邮件", "收件箱"] },
  { char: "📥", group: "常用", keywords: ["inbox", "download", "收集", "下载"] },
  { char: "🗓️", group: "常用", keywords: ["calendar", "plan", "日历", "计划"] },
  { char: "✅", group: "常用", keywords: ["done", "check", "完成", "勾选"] },
  { char: "🏷️", group: "常用", keywords: ["tag", "label", "标签"] },
  { char: "🔗", group: "常用", keywords: ["link", "chain", "链接"] },
  { char: "🌍", group: "常用", keywords: ["world", "travel", "世界", "旅行"] },
  { char: "📍", group: "常用", keywords: ["location", "map", "位置", "地图"] },
  { char: "🕒", group: "常用", keywords: ["time", "clock", "时间", "时钟"] },
  { char: "💰", group: "常用", keywords: ["money", "finance", "钱", "财务"] },
  { char: "🛒", group: "常用", keywords: ["cart", "shop", "购物", "商店"] },
  { char: "🎁", group: "常用", keywords: ["gift", "礼物"] },
  { char: "🏆", group: "常用", keywords: ["trophy", "award", "奖杯", "成就"] },
  { char: "🎯", group: "常用", keywords: ["target", "goal", "目标"] },

  { char: "📖", group: "阅读", keywords: ["read", "book", "阅读", "书"] },
  { char: "📰", group: "阅读", keywords: ["news", "feed", "新闻", "资讯"] },
  { char: "📋", group: "阅读", keywords: ["list", "clipboard", "清单", "剪贴板"] },
  { char: "🗒️", group: "阅读", keywords: ["notepad", "memo", "便签", "备忘"] },
  { char: "💡", group: "阅读", keywords: ["idea", "tip", "灵感", "提示"] },
  { char: "🔭", group: "阅读", keywords: ["explore", "research", "探索", "研究"] },
  { char: "🧭", group: "阅读", keywords: ["compass", "guide", "指南", "导航"] },
  { char: "🗺️", group: "阅读", keywords: ["map", "roadmap", "地图", "路线"] },

  { char: "☕", group: "生活", keywords: ["coffee", "cafe", "咖啡"] },
  { char: "🍵", group: "生活", keywords: ["tea", "茶"] },
  { char: "🍜", group: "生活", keywords: ["food", "noodles", "食物", "面"] },
  { char: "🍰", group: "生活", keywords: ["cake", "dessert", "甜点", "蛋糕"] },
  { char: "🌙", group: "生活", keywords: ["night", "moon", "夜晚", "月亮"] },
  { char: "☀️", group: "生活", keywords: ["sun", "day", "太阳", "白天"] },
  { char: "🌱", group: "生活", keywords: ["plant", "grow", "植物", "成长"] },
  { char: "🐱", group: "生活", keywords: ["cat", "pet", "猫"] },
  { char: "🐶", group: "生活", keywords: ["dog", "pet", "狗"] },
  { char: "🏃", group: "生活", keywords: ["run", "sport", "跑步", "运动"] },
  { char: "🧘", group: "生活", keywords: ["meditate", "calm", "冥想", "静心"] },
  { char: "🛏️", group: "生活", keywords: ["sleep", "bed", "睡眠", "床"] },
  { char: "🎒", group: "生活", keywords: ["bag", "backpack", "背包"] },
  { char: "👕", group: "生活", keywords: ["clothes", "衣服"] },
  { char: "💊", group: "生活", keywords: ["health", "pill", "健康", "药"] },
  { char: "🏥", group: "生活", keywords: ["hospital", "clinic", "医院"] },

  { char: "🔒", group: "符号", keywords: ["private", "lock", "私密", "锁"] },
  { char: "🔓", group: "符号", keywords: ["public", "unlock", "公开", "解锁"] },
  { char: "❓", group: "符号", keywords: ["question", "help", "疑问", "帮助"] },
  { char: "❗", group: "符号", keywords: ["important", "alert", "重要", "注意"] },
  { char: "➕", group: "符号", keywords: ["add", "plus", "添加", "加"] },
  { char: "➖", group: "符号", keywords: ["remove", "minus", "移除", "减"] },
  { char: "⭕", group: "符号", keywords: ["circle", "round", "圆"] },
  { char: "💠", group: "符号", keywords: ["diamond", "shape", "菱形"] },
  { char: "🟢", group: "符号", keywords: ["green", "online", "绿", "在线"] },
  { char: "🔵", group: "符号", keywords: ["blue", "蓝"] },
  { char: "🟣", group: "符号", keywords: ["purple", "紫"] },
  { char: "🟠", group: "符号", keywords: ["orange", "橙"] },
  { char: "⚫", group: "符号", keywords: ["black", "dark", "黑", "暗"] },
  { char: "⚪", group: "符号", keywords: ["white", "light", "白", "亮"] },
];

/** 搜字符本身或关键词，空格分词后逐个命中（AND 收窄）。 */
export function searchEmoji(query: string): EmojiEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return emojiCatalog;

  return emojiCatalog.filter((entry) =>
    terms.every(
      (term) =>
        entry.char.includes(term) ||
        entry.group.toLowerCase().includes(term) ||
        entry.keywords.some((keyword) => keyword.toLowerCase().includes(term)),
    ),
  );
}

export function emojiGroups(): string[] {
  const groups: string[] = [];
  for (const entry of emojiCatalog) {
    if (!groups.includes(entry.group)) groups.push(entry.group);
  }
  return groups;
}
