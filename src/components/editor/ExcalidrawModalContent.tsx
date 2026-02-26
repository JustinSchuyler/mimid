/**
 * Eagerly imports @excalidraw/excalidraw — this file is only loaded lazily
 * (via React.lazy) to keep SSR safe.
 */

import "@excalidraw/excalidraw/index.css";

import { Excalidraw } from "@excalidraw/excalidraw";
import { createPortal } from "react-dom";
import { useRef, useState } from "react";

// Use 'any' for Excalidraw API types to avoid import path issues across versions
type ExcalidrawAPI = {
  getAppState: () => Record<string, unknown>;
};

type ModalMode =
  | { type: "insert" }
  | { type: "edit"; nodeKey: string; initialData: string };

export type ExcalidrawSavePayload = {
  elements: readonly unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

interface Props {
  mode: ModalMode;
  onSave: (payload: ExcalidrawSavePayload) => void;
  onClose: () => void;
}

export default function ExcalidrawModalContent({
  mode,
  onSave,
  onClose,
}: Props) {
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const [elements, setElements] = useState<readonly unknown[]>([]);
  const [files, setFiles] = useState<Record<string, unknown>>({});

  const initialData = mode.type === "edit" ? JSON.parse(mode.initialData) : {};

  const handleSave = () => {
    const appState = apiRef.current?.getAppState() ?? {};
    const partial = {
      exportBackground: (appState as Record<string, unknown>).exportBackground,
      viewBackgroundColor: (appState as Record<string, unknown>)
        .viewBackgroundColor,
      theme: (appState as Record<string, unknown>).theme,
    };
    onSave({ elements, appState: partial, files });
  };

  return createPortal(
    <div
      className="excalidraw-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="excalidraw-modal-container">
        <div className="excalidraw-modal-body">
          <Excalidraw
            excalidrawAPI={(api) => {
              apiRef.current = api as unknown as ExcalidrawAPI;
            }}
            initialData={{
              elements: initialData.elements ?? [],
              appState: initialData.appState ?? { isLoading: false },
              files: initialData.files ?? {},
            }}
            onChange={(els, _appState, fls) => {
              setElements(els as unknown as readonly unknown[]);
              setFiles(fls as unknown as Record<string, unknown>);
            }}
          />
        </div>
        <div className="excalidraw-modal-footer">
          <button className="excalidraw-modal-btn" onClick={onClose}>
            Discard
          </button>
          <button className="excalidraw-modal-btn primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
