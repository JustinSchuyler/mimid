import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { $getRoot, $isElementNode } from "lexical";
import type { EditorState, LexicalNode } from "lexical";
import { ExcalidrawNode } from "../components/editor/ExcalidrawNode";
import type { UserContentBlock } from "../types/interview";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip "data:image/jpeg;base64," prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function serializeEditorState(
  editorState: EditorState,
): Promise<UserContentBlock[]> {
  const blocks: UserContentBlock[] = [];
  const excalidrawDatas: string[] = [];
  let markdownText = "";

  editorState.read(() => {
    // Walk the full tree to collect ExcalidrawNodes at any depth.
    // After insertion, ExcalidrawNode is wrapped inside a ParagraphNode
    // (via $wrapNodeInElement), so it is NOT a direct child of root.
    const stack: LexicalNode[] = [...$getRoot().getChildren()];
    while (stack.length) {
      const node = stack.pop()!;
      if (node instanceof ExcalidrawNode) {
        excalidrawDatas.push(node.getData());
      } else if ($isElementNode(node)) {
        stack.push(...node.getChildren());
      }
    }
    // Convert text/code/list content to markdown.
    // ExcalidrawNodes have no TRANSFORMER so they produce no output.
    markdownText = $convertToMarkdownString(TRANSFORMERS);
  });

  if (markdownText.trim()) {
    blocks.push({ type: "text", text: markdownText });
  }

  // Async: export each sketch as JPEG (~20–80 KB) for the API payload
  if (excalidrawDatas.length > 0) {
    const { exportToBlob } = await import("@excalidraw/excalidraw");

    for (const data of excalidrawDatas) {
      try {
        const parsed = JSON.parse(data);
        if (!parsed.elements?.length) continue;

        const blob = await exportToBlob({
          elements: parsed.elements,
          appState: { ...parsed.appState, exportBackground: true },
          files: parsed.files ?? {},
          mimeType: "image/jpeg",
          quality: 0.7,
        });

        const base64 = await blobToBase64(blob);
        blocks.push({
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: base64 },
        });
      } catch {
        // skip malformed or empty sketches
      }
    }
  }

  return blocks;
}
