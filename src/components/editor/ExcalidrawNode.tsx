/**
 * ExcalidrawNode — a Lexical DecoratorNode that embeds an Excalidraw sketch.
 * Uses dynamic import for @excalidraw/excalidraw to keep SSR safe.
 */

import type {
  EditorConfig,
  LexicalEditor,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { createCommand, DecoratorNode, type LexicalCommand } from "lexical";
import { useEffect, useRef, useState } from "react";
import * as React from "react";

// Command dispatched by the Edit button inside the node preview
export const EDIT_EXCALIDRAW_COMMAND: LexicalCommand<string> =
  createCommand("EDIT_EXCALIDRAW_COMMAND");

export type SerializedExcalidrawNode = Spread<
  { data: string; type: "excalidraw"; version: 1 },
  SerializedLexicalNode
>;

// ---------------------------------------------------------------------------
// Preview component rendered inside the editor (via decorate())
// ---------------------------------------------------------------------------

function ExcalidrawPreview({
  data,
  onEdit,
}: {
  data: string;
  onEdit: () => void;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setImgSrc(null);
    if (!data || data === "{}") return;

    try {
      const parsed = JSON.parse(data);
      if (!parsed.elements?.length) return;

      import("@excalidraw/excalidraw")
        .then(({ exportToBlob }) =>
          exportToBlob({
            elements: parsed.elements,
            appState: { ...parsed.appState, exportBackground: true },
            files: parsed.files ?? {},
            mimeType: "image/png",
          }),
        )
        .then((blob) => {
          if (cancelled) return;
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          setImgSrc(url);
        })
        .catch(() => {});
    } catch {
      // malformed data — ignore
    }

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [data]);

  return (
    <div className="excalidraw-node" contentEditable={false}>
      {imgSrc ? (
        <img src={imgSrc} className="excalidraw-preview" alt="Sketch" />
      ) : (
        <div className="excalidraw-empty">
          {data && data !== "{}" ? "Loading sketch…" : "Empty sketch"}
        </div>
      )}
      <div className="excalidraw-actions">
        <button className="excalidraw-action-btn" onClick={onEdit}>
          Edit sketch
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DecoratorNode
// ---------------------------------------------------------------------------

export class ExcalidrawNode extends DecoratorNode<React.ReactElement> {
  __data: string;

  static getType(): string {
    return "excalidraw";
  }

  static clone(node: ExcalidrawNode): ExcalidrawNode {
    return new ExcalidrawNode(node.__data, node.__key);
  }

  constructor(data = "{}", key?: NodeKey) {
    super(key);
    this.__data = data;
  }

  getData(): string {
    return this.__data;
  }

  setData(data: string): this {
    const writable = this.getWritable();
    writable.__data = data;
    return writable;
  }

  createDOM(): HTMLElement {
    return document.createElement("div");
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(serialized: SerializedExcalidrawNode): ExcalidrawNode {
    return new ExcalidrawNode(serialized.data);
  }

  exportJSON(): SerializedExcalidrawNode {
    return {
      ...super.exportJSON(),
      type: "excalidraw",
      version: 1,
      data: this.__data,
    };
  }

  decorate(editor: LexicalEditor, _config: EditorConfig): React.ReactElement {
    const key = this.getKey();
    const data = this.__data;
    return (
      <ExcalidrawPreview
        data={data}
        onEdit={() => editor.dispatchCommand(EDIT_EXCALIDRAW_COMMAND, key)}
      />
    );
  }
}

export function $createExcalidrawNode(): ExcalidrawNode {
  return new ExcalidrawNode();
}

export function $isExcalidrawNode(
  node: unknown,
): node is ExcalidrawNode {
  return node instanceof ExcalidrawNode;
}
