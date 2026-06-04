import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-layout">
        <Header />
        <main className="main-content-container">
          {children}
        </main>
      </div>
    </div>
  );
}
