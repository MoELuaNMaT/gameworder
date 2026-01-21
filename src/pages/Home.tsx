import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
          GameWorder
        </h1>
        <p className="text-xl text-slate-300 mb-8">
          AI 驱动的游戏设计文档助手
        </p>
        <Link
          to="/workspace"
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          开始创作
        </Link>
      </div>
    </div>
  )
}
