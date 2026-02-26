/**
 * ExcalidrawPlugin — registers INSERT_EXCALIDRAW_COMMAND and EDIT_EXCALIDRAW_COMMAND.
 * The Excalidraw modal is lazy-loaded (client-only) via React.lazy.
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $wrapNodeInElement } from "@lexical/utils";
import {
  $createParagraphNode,
  $getNodeByKey,
  $insertNodes,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  type LexicalCommand,
} from "lexical";
import { mergeRegister } from "@lexical/utils";
import { Suspense, useEffect, useState, lazy } from "react";
import {
  $createExcalidrawNode,
  $isExcalidrawNode,
  EDIT_EXCALIDRAW_COMMAND,
  ExcalidrawNode,
} from "./ExcalidrawNode";
import type { ExcalidrawSavePayload } from "./ExcalidrawModalContent";

export const INSERT_EXCALIDRAW_COMMAND: LexicalCommand<void> = createCommand(
  "INSERT_EXCALIDRAW_COMMAND",
);

type ModalMode =
  | { type: "insert" }
  | { type: "edit"; nodeKey: string; initialData: string };

// Lazy-load the heavy Excalidraw modal (keeps @excalidraw/excalidraw out of SSR)
const ExcalidrawModalContent = lazy(
  () => import("./ExcalidrawModalContent"),
);

export function ExcalidrawPlugin(): React.ReactElement | null {
  const [editor] = useLexicalComposerContext();
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);

  useEffect(() => {
    if (!editor.hasNodes([ExcalidrawNode])) {
      throw new Error("ExcalidrawPlugin: ExcalidrawNode not registered on editor");
    }

    return mergeRegister(
      editor.registerCommand(
        INSERT_EXCALIDRAW_COMMAND,
        () => {
          setModalMode({ type: "insert" });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        EDIT_EXCALIDRAW_COMMAND,
        (nodeKey: string) => {
          let nodeData = "{}";
          editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isExcalidrawNode(node)) {
              nodeData = node.getData();
            }
          });
          setModalMode({ type: "edit", nodeKey, initialData: nodeData });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor]);

  if (!modalMode) return null;

  const handleSave = ({ elements, appState, files }: ExcalidrawSavePayload) => {
    const dataStr = JSON.stringify({ elements, appState, files });

    if (modalMode.type === "insert") {
      editor.update(() => {
        const node = $createExcalidrawNode();
        node.setData(dataStr);
        $insertNodes([node]);
        if ($isRootOrShadowRoot(node.getParentOrThrow())) {
          $wrapNodeInElement(node, $createParagraphNode).selectEnd();
        }
      });
    } else {
      editor.update(() => {
        const node = $getNodeByKey(modalMode.nodeKey);
        if ($isExcalidrawNode(node)) {
          node.setData(dataStr);
        }
      });
    }

    setModalMode(null);
  };

  return (
    <Suspense fallback={null}>
      <ExcalidrawModalContent
        mode={modalMode}
        onSave={handleSave}
        onClose={() => setModalMode(null)}
      />
    </Suspense>
  );
}
