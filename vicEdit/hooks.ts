import { useState, useCallback, useEffect } from 'react';

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

// Custom hook for state management with undo/redo functionality
export const useHistoryState = <T>(
    initialState: T
): [
    T, 
    (newState: T | ((prevState: T) => T)) => void, 
    () => void, 
    () => void, 
    boolean, 
    boolean
] => {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // Effect to reset history when the initial state fundamentally changes (e.g., new image is selected)
  // This is important for components like OutputDisplay where the initial state changes on new generation.
  useEffect(() => {
    setState({
        past: [],
        present: initialState,
        future: [],
    });
  }, [initialState]);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const set = useCallback((newStateOrFn: T | ((prevState: T) => T)) => {
    setState(currentState => {
      const newState = typeof newStateOrFn === 'function' 
        ? (newStateOrFn as (prevState: T) => T)(currentState.present)
        : newStateOrFn;

      if (newState === currentState.present) {
        return currentState;
      }
      return {
        past: [...currentState.past, currentState.present],
        present: newState,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    if (!canUndo) return;
    setState(currentState => {
      const newPresent = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, currentState.past.length - 1);
      return {
        past: newPast,
        present: newPresent,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    setState(currentState => {
      const newPresent = currentState.future[0];
      const newFuture = currentState.future.slice(1);
      return {
        past: [...currentState.past, currentState.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, [canRedo]);

  return [state.present, set, undo, redo, canUndo, canRedo];
};
