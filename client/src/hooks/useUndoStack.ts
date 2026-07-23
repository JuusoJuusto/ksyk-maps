/**
 * useUndoStack — small in-memory history for the builder.
 *
 * The builder mutations (create/delete/patch a building, room, or
 * hallway) each know how to REVERSE themselves. We wrap the reverse
 * as an inverse action and push it onto the undo stack when the
 * forward action runs. Undoing pops the top inverse and runs it,
 * pushing the inverse's inverse onto the redo stack so the operation
 * can be redone.
 *
 * Kept intentionally minimal — the plumbing is a stack of anonymous
 * async functions, not a full event-sourced CRDT. It's good enough
 * for a single user's local editing session, which is what the
 * builder is today.
 */
import { useCallback, useEffect, useRef, useState } from "react";

/** One reversible action. The `label` shows in the toast when the
 *  user undoes/redoes so they know what they just reverted. */
export interface UndoAction {
  label: string;
  /** Run this action forward (or the inverse when it's on the undo
   *  stack — semantics are symmetric). Return an inverse action so
   *  the runner can push it onto the opposite stack. */
  run: () => Promise<UndoAction> | UndoAction;
}

const MAX_HISTORY = 50;

export interface UndoStackApi {
  /** Register a forward action AND its inverse — the runner already
   *  ran the forward, we just record the inverse for undo. Use for
   *  operations whose forward has already happened (e.g. a successful
   *  mutation on the server). */
  record: (inverse: UndoAction) => void;
  /** Whether undo can be run. */
  canUndo: boolean;
  /** Whether redo can be run. */
  canRedo: boolean;
  /** Pop + run the top undo action. Returns the label of what was
   *  undone (or null when nothing was undone). */
  undo: () => Promise<string | null>;
  /** Pop + run the top redo action. Returns the label of what was
   *  redone (or null). */
  redo: () => Promise<string | null>;
  /** Wipe everything (e.g. on data reset / import). */
  clear: () => void;
}

export function useUndoStack(): UndoStackApi {
  const undoStackRef = useRef<UndoAction[]>([]);
  const redoStackRef = useRef<UndoAction[]>([]);
  // Version bumps so React re-renders callers when the stacks change.
  const [, bump] = useState(0);
  const rerender = useCallback(() => bump((v) => v + 1), []);

  const record = useCallback((inverse: UndoAction) => {
    undoStackRef.current.push(inverse);
    if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift();
    // Recording a new action invalidates the redo stack.
    redoStackRef.current = [];
    rerender();
  }, [rerender]);

  const undo = useCallback(async (): Promise<string | null> => {
    const action = undoStackRef.current.pop();
    if (!action) { rerender(); return null; }
    const inverse = await action.run();
    redoStackRef.current.push(inverse);
    if (redoStackRef.current.length > MAX_HISTORY) redoStackRef.current.shift();
    rerender();
    return action.label;
  }, [rerender]);

  const redo = useCallback(async (): Promise<string | null> => {
    const action = redoStackRef.current.pop();
    if (!action) { rerender(); return null; }
    const inverse = await action.run();
    undoStackRef.current.push(inverse);
    if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift();
    rerender();
    return action.label;
  }, [rerender]);

  const clear = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    rerender();
  }, [rerender]);

  // ⌘Z / Ctrl+Z, ⌘⇧Z / Ctrl+⇧Z, plus a `ksyk:cmd:undo/redo` bridge
  // for the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        if (e.shiftKey) void redo();
        else void undo();
      } else if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        void redo();
      }
    };
    const onCmdUndo = () => { void undo(); };
    const onCmdRedo = () => { void redo(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("ksyk:cmd:undo", onCmdUndo);
    window.addEventListener("ksyk:cmd:redo", onCmdRedo);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ksyk:cmd:undo", onCmdUndo);
      window.removeEventListener("ksyk:cmd:redo", onCmdRedo);
    };
  }, [undo, redo]);

  return {
    record,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
    undo,
    redo,
    clear,
  };
}
