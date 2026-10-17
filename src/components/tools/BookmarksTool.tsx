import { useState, useEffect } from "react"
import { Globe, ExternalLink, ChevronDown, ChevronRight } from "lucide-react"
import { ToolPage } from "../ToolPage"

interface Bookmark {
  name: string
  url: string
  desc: string
}

interface BookmarkCategory {
  id: string
  name: string
  bookmarks: Bookmark[]
}

const bookmarkCategories: BookmarkCategory[] = [
  {
    id: "dev",
    name: "开发",
    bookmarks: [
      {
        name: "Detail Design",
        url: "https://detail.design/",
        desc: "设计细节参考 / UI 灵感站",
      },
      {
        name: "前端面试大全",
        url: "https://vue3js.cn/interview/",
        desc: "Web 前端面试题合集（面试官系列）",
      },
    ],
  },
  {
    id: "photo",
    name: "摄影",
    bookmarks: [
      {
        name: "摄影资源库",
        url: "https://docs.qq.com/sheet/DQVZTWm1nWXZrVE5S?tab=000001",
        desc: "摄影学习 / 资源整理",
      },
    ],
  },
  {
    id: "life",
    name: "生活",
    bookmarks: [
      {
        name: "Guess The Price",
        url: "https://guesstheprice.net",
        desc: "猜商品价格游戏",
      },
      {
        name: "The Tenth Watch",
        url: "https://thetenthwatch.com",
        desc: "沥青滴落实验直播",
      },
      {
        name: "Cats That Look Like Hitler",
        url: "http://www.catsthatlooklikehitler.com/",
        desc: "猫像某人网站",
      },
      { name: "CornHub", url: "http://cornhub.website", desc: "玉米片网站" },
      { name: "CyberHiking", url: "https://cyberhiking.com", desc: "赛博登山" },
      {
        name: "LightYear.fm",
        url: "https://lightyear.fm",
        desc: "外星人收听地球广播",
      },
      { name: "Loot Drop", url: "https://www.loot-drop.io", desc: "创业墓地" },
      {
        name: "TableFlipper",
        url: "https://www.tableflipper.com",
        desc: "掀桌 GIF 收集",
      },
    ],
  },
  {
    id: "movie",
    name: "影视",
    bookmarks: [
      {
        name: "影视资源",
        url: "https://vidhub4.cc/t",
        desc: "VidHub",
      },
      {
        name: "pan",
        url: "https://pan.baidu.com/s/1ZkQoIi3fcNUGnrsTXXZstA",
        desc: "提取码: 2w19",
      },
      {
        name: "pan",
        url: "https://www.kdocs.cn/l/chNTYrjBNUxM",
        desc: "网盘",
      },
      {
        name: "pan",
        url: "https://www.kdocs.cn/etapps/query/q/uJiITLMH",
        desc: "网盘",
      },
      {
        name: "pan",
        url: "https://docs.qq.com/sheet/DYmRQcGJxeUVEZkVL?tab=000002",
        desc: "网盘",
      },
    ],
  },
]

const STORAGE_KEY = "devtools-bookmarks-collapsed"

export default function BookmarksTool() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    // Load saved state from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error("Failed to load bookmark state:", error)
    }
    // Default: all expanded
    return {}
  })

  // Save state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed))
    } catch (error) {
      console.error("Failed to save bookmark state:", error)
    }
  }, [collapsed])

  const toggleCategory = (categoryId: string) => {
    setCollapsed((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }))
  }

  return (
    <ToolPage
      title="常用网址"
      description="我的收藏网站"
      icon={<Globe className="h-5 w-5" />}
    >
      <div className="space-y-4">
        {bookmarkCategories.map((category) => {
          const isCollapsed = collapsed[category.id] || false
          const isEmpty = category.bookmarks.length === 0

          return (
            <div
              key={category.id}
              className="overflow-hidden rounded-xl border border-border"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex w-full cursor-pointer items-center justify-between bg-muted/40 px-4 py-3 transition-colors hover:bg-muted/60"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-[14px] font-medium">
                    {category.name}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    ({category.bookmarks.length})
                  </span>
                </div>
              </button>

              {/* Category Content */}
              {!isCollapsed && (
                <div className="p-3">
                  {isEmpty ? (
                    <div className="py-8 text-center text-[13px] text-muted-foreground">
                      暂无收藏
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                      {category.bookmarks.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center justify-between rounded-lg border border-border px-3 py-2.5 sm:px-4 sm:py-3 transition-all duration-150 hover:border-primary/20 hover:bg-muted/40 overflow-hidden"
                        >
                          <div className="min-w-0">
                            <p className="text-[14px] transition-colors group-hover:text-primary truncate">
                              {link.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {link.desc}
                            </p>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 ml-2 text-muted-foreground/40 transition-colors group-hover:text-primary/60" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ToolPage>
  )
}
