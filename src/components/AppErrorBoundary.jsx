import React from 'react'

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error, errorInfo) {
    // Keep the app from going fully blank when a runtime error happens.
    console.error('App error boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
          <div className="max-w-2xl rounded-3xl border border-rose-400/20 bg-slate-900/95 p-6 shadow-2xl shadow-black/40">
            <div className="text-sm font-semibold text-rose-300">页面加载失败</div>
            <h1 className="mt-2 text-2xl font-bold text-slate-50">应用运行时出错了</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              这通常不是 GitHub Pages 本身的问题，而是前端脚本在初始化时抛出了异常。
              现在页面不会再白屏，你可以把下面的错误信息发给我继续定位。
            </p>
            <pre className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-rose-200">
              {this.state.error?.stack || this.state.error?.message || 'Unknown error'}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
