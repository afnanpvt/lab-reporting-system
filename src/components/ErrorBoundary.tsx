import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  info: string
}

/**
 * Without this, an uncaught render error takes down the entire React tree and leaves a blank
 * white window with no indication anything went wrong — exactly what happened here. This shows
 * the actual error and component stack instead, so a real bug is diagnosable from the screen
 * itself rather than a guessing game.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: '' }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info: info.componentStack ?? '' })
    console.error('Render error caught by ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'Consolas, monospace', background: '#fceae8', color: '#8a2c25', height: '100vh', overflow: 'auto' }}>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Something broke while rendering this page</h1>
          <p style={{ marginBottom: 16 }}>{this.state.error.message}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{this.state.error.stack}</pre>
          {this.state.info && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 16, opacity: 0.7 }}>{this.state.info}</pre>}
        </div>
      )
    }
    return this.props.children
  }
}
