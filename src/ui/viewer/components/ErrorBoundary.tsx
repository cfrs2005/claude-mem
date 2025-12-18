import React, { Component, ReactNode, ErrorInfo } from 'react';
import enMessages from '../locales/en.json';
import zhMessages from '../locales/zh.json';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private getCurrentLanguage = (): 'en' | 'zh' => {
    const saved = localStorage.getItem('claude-mem-language');
    if (saved === 'zh') return 'zh';
    return 'en';
  };

  private getTranslation = (key: string): string => {
    const lang = this.getCurrentLanguage();
    const messages = lang === 'zh' ? zhMessages : enMessages;
    const parts = key.split('.');
    let value: any = messages;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#ff6b6b', backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>{this.getTranslation('errorBoundary.error')}</h1>
          <p style={{ marginBottom: '10px', color: '#8b949e' }}>
            {this.getTranslation('errorBoundary.errorMessage')}
          </p>
          {this.state.error && (
            <details style={{ marginTop: '20px', color: '#8b949e' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>{this.getTranslation('errorBoundary.errorDetails')}</summary>
              <pre style={{
                backgroundColor: '#0d1117',
                padding: '10px',
                borderRadius: '6px',
                overflow: 'auto'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo && '\n\n' + this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
