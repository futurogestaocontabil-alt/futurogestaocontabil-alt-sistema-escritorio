import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { failed: boolean }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha ao renderizar a Plataforma Futuro.', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="loading-screen" role="alert"><img src="/brand/Logo.png" alt="Futuro Contabilidade Digital"/><p>Não foi possível abrir esta tela.</p><button className="button button-primary" onClick={() => window.location.reload()}>Recarregar a plataforma</button></main>;
  }
}
