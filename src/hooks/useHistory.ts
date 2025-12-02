
import { useState, useCallback } from 'react';

export interface HistoryItem<T> {
  state: T;
  description: string;
  timestamp: number;
}

// Generic hook for undo/redo history
export function useHistory<T>(initialState: T) {
  // We use a single state object to ensure atomic updates for history and index
  const [historyState, setHistoryState] = useState<{
    history: HistoryItem<T>[];
    index: number;
  }>({
    history: [{ state: initialState, description: 'Initial State', timestamp: Date.now() }],
    index: 0
  });

  const { history, index } = historyState;
  
  // Guard to ensure we always have a valid state.
  const currentItem = history[index] ?? history[history.length - 1];
  const state = currentItem?.state ?? initialState;

  // Push new state to history
  const setState = useCallback((newState: T | ((prev: T) => T), description: string = 'Update') => {
    setHistoryState(prevState => {
      const { history: prevHistory, index: prevIndex } = prevState;
      const currentItem = prevHistory[prevIndex] ?? prevHistory[prevHistory.length - 1];
      const currentState = currentItem.state;
      
      const resolvedState = typeof newState === 'function' ? (newState as Function)(currentState) : newState;
      
      // Create new history path branching from current index
      const nextHistory = prevHistory.slice(0, prevIndex + 1);
      nextHistory.push({
        state: resolvedState,
        description,
        timestamp: Date.now()
      });

      // Enforce limit (e.g., 50 steps)
      if (nextHistory.length > 50) {
        nextHistory.shift();
        return {
          history: nextHistory,
          index: nextHistory.length - 1
        };
      } else {
        return {
          history: nextHistory,
          index: nextHistory.length - 1
        };
      }
    });
  }, []);

  // Overwrite the CURRENT state in history without pushing a new entry
  const overwrite = useCallback((newState: T | ((prev: T) => T)) => {
    setHistoryState(prevState => {
      const { history: prevHistory, index: prevIndex } = prevState;
      const currentItem = prevHistory[prevIndex];
      const currentState = currentItem.state;
      const resolvedState = typeof newState === 'function' ? (newState as Function)(currentState) : newState;
      
      // Update the current item in history array
      const nextHistory = [...prevHistory];
      nextHistory[prevIndex] = {
        ...currentItem,
        state: resolvedState,
        timestamp: Date.now() // Update timestamp on overwrite? Maybe.
      };
      
      return {
        history: nextHistory,
        index: prevIndex
      };
    });
  }, []);

  const resetHistory = useCallback((newState: T) => {
    setHistoryState({
      history: [{ state: newState, description: 'Reset', timestamp: Date.now() }],
      index: 0
    });
  }, []);

  const undo = useCallback(() => {
    setHistoryState(prev => ({
      ...prev,
      index: Math.max(0, prev.index - 1)
    }));
  }, []);

  const redo = useCallback(() => {
    setHistoryState(prev => ({
      ...prev,
      index: Math.min(prev.history.length - 1, prev.index + 1)
    }));
  }, []);

  const jumpTo = useCallback((newIndex: number) => {
    setHistoryState(prev => {
      if (newIndex < 0 || newIndex >= prev.history.length) return prev;
      return {
        ...prev,
        index: newIndex
      };
    });
  }, []);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return {
    state,
    history,
    currentIndex: index,
    setState,
    overwrite,
    undo,
    redo,
    jumpTo,
    canUndo,
    canRedo,
    resetHistory
  };
}
