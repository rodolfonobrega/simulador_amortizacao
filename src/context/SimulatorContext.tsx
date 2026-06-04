/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react';
import { useSimulatorState } from '../hooks/useSimulatorState';

const SimulatorContext = createContext<ReturnType<typeof useSimulatorState> | null>(null);

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const state = useSimulatorState();
  return (
    <SimulatorContext.Provider value={state}>
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error('useSimulator must be used within a SimulatorProvider');
  }
  return context;
}
