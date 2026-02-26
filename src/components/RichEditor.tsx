import "./editor/editor.css";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import * as React from "react";
import { createPortal } from "react-dom";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TRANSFORMERS } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import {
  CodeHighlightNode,
  CodeNode,
  registerCodeHighlighting,
  $createCodeNode,
  $isCodeNode,
} from "@lexical/code";
import {
  ListItemNode,
  ListNode,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  $isListNode,
} from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { TOGGLE_LINK_COMMAND, $isLinkNode } from "@lexical/link";
import { $setBlocksType } from "@lexical/selection";
import { $getNearestNodeOfType, mergeRegister, IS_APPLE } from "@lexical/utils";
import {
  $getSelection,
  $getNodeByKey,
  $isRangeSelection,
  $createParagraphNode,
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code2,
  Link,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  PenTool,
  Plus,
  ChevronDown,
  SendHorizonal,
  X,
  Check,
} from "lucide-react";
import { ExcalidrawNode } from "./editor/ExcalidrawNode";
import {
  ExcalidrawPlugin,
  INSERT_EXCALIDRAW_COMMAND,
} from "./editor/ExcalidrawPlugin";
import { serializeEditorState } from "../lib/serialize";
import type { UserContentBlock } from "../types/interview";
import { Button } from "@cloudscape-design/components";

// ---------------------------------------------------------------------------
// Theme + node config
// ---------------------------------------------------------------------------

const EDITOR_THEME = {
  paragraph: "editor-paragraph",
  quote: "editor-quote",
  heading: {
    h1: "editor-h1",
    h2: "editor-h2",
    h3: "editor-h3",
  },
  text: {
    bold: "editor-text-bold",
    italic: "editor-text-italic",
    underline: "editor-text-underline",
    strikethrough: "editor-text-strikethrough",
    underlineStrikethrough: "editor-text-underline-strikethrough",
    code: "editor-text-code",
  },
  code: "editor-code",
  codeHighlight: {
    atrule: "editor-token-attr",
    attr: "editor-token-attr",
    boolean: "editor-token-property",
    builtin: "editor-token-selector",
    cdata: "editor-token-comment",
    char: "editor-token-selector",
    class: "editor-token-function",
    "class-name": "editor-token-function",
    comment: "editor-token-comment",
    constant: "editor-token-property",
    deleted: "editor-token-property",
    doctype: "editor-token-comment",
    entity: "editor-token-operator",
    function: "editor-token-function",
    important: "editor-token-variable",
    inserted: "editor-token-selector",
    keyword: "editor-token-attr",
    namespace: "editor-token-variable",
    number: "editor-token-property",
    operator: "editor-token-operator",
    prolog: "editor-token-comment",
    property: "editor-token-property",
    punctuation: "editor-token-punctuation",
    regex: "editor-token-variable",
    selector: "editor-token-selector",
    string: "editor-token-selector",
    symbol: "editor-token-property",
    tag: "editor-token-property",
    url: "editor-token-operator",
    variable: "editor-token-variable",
  },
  link: "editor-link",
  list: {
    checklist: "editor-checklist",
    listitem: "editor-listitem",
    listitemChecked: "editor-listitem-checked",
    listitemUnchecked: "editor-listitem-unchecked",
    nested: { listitem: "editor-nested-listitem" },
    olDepth: [
      "editor-ol1",
      "editor-ol2",
      "editor-ol3",
      "editor-ol4",
      "editor-ol5",
    ],
    ul: "editor-ul",
  },
};

const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  CodeNode,
  CodeHighlightNode,
  ListNode,
  ListItemNode,
  LinkNode,
  ExcalidrawNode,
];

// ---------------------------------------------------------------------------
// DropDown — portal-positioned, keyboard-dismissible
// ---------------------------------------------------------------------------

const DropDownContext = React.createContext<{ close: () => void } | null>(null);

function DropDownItem({
  icon,
  label,
  shortcut,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const ctx = useContext(DropDownContext);
  return (
    <button
      type="button"
      className={`editor-dropdown-item ${active ? "active" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        if (!disabled) {
          onClick();
          ctx?.close();
        }
      }}
      disabled={disabled}
    >
      <div className="editor-dropdown-item-content">
        {icon}
        <span>{label}</span>
      </div>
      {shortcut && <span className="editor-dropdown-shortcut">{shortcut}</span>}
    </button>
  );
}

function DropDown({
  label,
  icon,
  disabled,
  children,
  "aria-label": ariaLabel,
}: {
  label?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, maxHeight: 320 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      setPos({
        top: rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 224),
        maxHeight: Math.min(320, Math.max(120, spaceBelow)),
      });
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !menuRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="editor-toolbar-item"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleOpen}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        {icon}
        {label && <span style={{ fontSize: 13 }}>{label}</span>}
        <ChevronDown size={12} style={{ color: "#9ca3af" }} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="editor-dropdown-menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              maxHeight: pos.maxHeight,
            }}
          >
            <DropDownContext.Provider value={{ close: () => setOpen(false) }}>
              {children}
            </DropDownContext.Provider>
          </div>,
          document.body,
        )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Block format options
// ---------------------------------------------------------------------------

type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "number"
  | "check"
  | "quote"
  | "code";

const BLOCK_OPTIONS: Array<{
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
}> = [
  {
    type: "paragraph",
    label: "Normal",
    icon: <Type size={15} />,
    shortcut: "",
  },
  {
    type: "h1",
    label: "Heading 1",
    icon: <Heading1 size={15} />,
    shortcut: "# ",
  },
  {
    type: "h2",
    label: "Heading 2",
    icon: <Heading2 size={15} />,
    shortcut: "## ",
  },
  {
    type: "h3",
    label: "Heading 3",
    icon: <Heading3 size={15} />,
    shortcut: "### ",
  },
  {
    type: "number",
    label: "Numbered List",
    icon: <ListOrdered size={15} />,
    shortcut: "1. ",
  },
  {
    type: "bullet",
    label: "Bullet List",
    icon: <List size={15} />,
    shortcut: "- ",
  },
  {
    type: "check",
    label: "Check List",
    icon: <ListChecks size={15} />,
    shortcut: "[ ] ",
  },
  {
    type: "quote",
    label: "Quote",
    icon: <Quote size={15} />,
    shortcut: "> ",
  },
  {
    type: "code",
    label: "Code Block",
    icon: <Code size={15} />,
    shortcut: "```",
  },
];

const CODE_LANGUAGES = [
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["python", "Python"],
  ["java", "Java"],
  ["c", "C"],
  ["cpp", "C++"],
  ["go", "Go"],
  ["rust", "Rust"],
  ["sql", "SQL"],
  ["bash", "Bash"],
  ["html", "HTML"],
  ["css", "CSS"],
  ["json", "JSON"],
];

// ---------------------------------------------------------------------------
// Internal plugins
// ---------------------------------------------------------------------------

function CodeHighlightPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerCodeHighlighting(editor);
  }, [editor]);
  return null;
}

function SubmitPlugin({
  onSubmit,
  disabled,
}: {
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const submitRef = useRef(onSubmit);
  const disabledRef = useRef(disabled);
  // Assign during render so the keydown closure always sees current values
  submitRef.current = onSubmit;
  disabledRef.current = disabled;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "Enter" &&
        !disabledRef.current
      ) {
        e.preventDefault();
        submitRef.current();
      }
    };
    return editor.registerRootListener(
      (root: HTMLElement | null, prev: HTMLElement | null) => {
        prev?.removeEventListener("keydown", handler);
        root?.addEventListener("keydown", handler);
      },
    );
  }, [editor]);

  return null;
}

// ---------------------------------------------------------------------------
// Toolbar plugin — tracks selection state, renders toolbar UI
// ---------------------------------------------------------------------------

function ToolbarPlugin({ disabled }: { disabled?: boolean }) {
  const [editor] = useLexicalComposerContext();

  // Selection state
  const [blockType, setBlockType] = useState<BlockType>("paragraph");
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isInlineCode, setIsInlineCode] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [selectedCodeKey, setSelectedCodeKey] = useState<string | null>(null);

  // Link input state
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    // Text formats
    setIsBold(selection.hasFormat("bold"));
    setIsItalic(selection.hasFormat("italic"));
    setIsUnderline(selection.hasFormat("underline"));
    setIsStrikethrough(selection.hasFormat("strikethrough"));
    setIsInlineCode(selection.hasFormat("code"));

    // Link detection
    const node = selection.anchor.getNode();
    const parent = node.getParent();
    setIsLink($isLinkNode(parent) || $isLinkNode(node));

    // Block type detection
    const topElement = node.getTopLevelElement();
    if (!topElement) return;

    if ($isListNode(topElement)) {
      const parentList = $getNearestNodeOfType<ListNode>(node, ListNode);
      const type = (
        parentList ? parentList.getListType() : topElement.getListType()
      ) as BlockType;
      setBlockType(type);
    } else if ($isHeadingNode(topElement)) {
      setBlockType(topElement.getTag() as BlockType);
    } else if ($isCodeNode(topElement)) {
      setBlockType("code");
      setCodeLanguage(topElement.getLanguage() ?? "javascript");
      setSelectedCodeKey(topElement.getKey());
    } else if ($isQuoteNode(topElement)) {
      setBlockType("quote");
    } else {
      setBlockType("paragraph");
      setSelectedCodeKey(null);
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(updateToolbar);
      }),
    );
  }, [editor, updateToolbar]);

  // Focus link input when shown
  useEffect(() => {
    if (showLinkInput) linkInputRef.current?.focus();
  }, [showLinkInput]);

  // --- Format helpers ---
  const formatBlock = (type: BlockType) => {
    // List commands must be dispatched outside editor.update()
    if (type === "bullet") {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      return;
    }
    if (type === "number") {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      return;
    }
    if (type === "check") {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
      return;
    }
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      switch (type) {
        case "paragraph":
          $setBlocksType(selection, () => $createParagraphNode());
          break;
        case "h1":
        case "h2":
        case "h3":
          $setBlocksType(selection, () =>
            $createHeadingNode(type as HeadingTagType),
          );
          break;
        case "quote":
          $setBlocksType(selection, () => $createQuoteNode());
          break;
        case "code":
          $setBlocksType(selection, () => $createCodeNode());
          break;
      }
    });
  };

  const setCodeLang = (lang: string) => {
    if (!selectedCodeKey) return;
    editor.update(() => {
      const node = $getNodeByKey(selectedCodeKey);
      if ($isCodeNode(node)) {
        node.setLanguage(lang);
        setCodeLanguage(lang);
      }
    });
  };

  const handleLinkClick = () => {
    if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      setLinkUrl("https://");
      setShowLinkInput(true);
    }
  };

  const submitLink = () => {
    const url = linkUrl.trim();
    if (url && url !== "https://") {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    }
    setShowLinkInput(false);
  };

  const currentOption = BLOCK_OPTIONS.find((o) => o.type === blockType);
  const macShortcut = IS_APPLE;

  return (
    <div className="editor-toolbar">
      {/* Block type dropdown */}
      <DropDown
        icon={currentOption?.icon ?? <Type size={15} />}
        label={currentOption?.label ?? "Normal"}
        disabled={disabled}
        aria-label="Block format"
      >
        {BLOCK_OPTIONS.map((opt) => (
          <DropDownItem
            key={opt.type}
            icon={opt.icon}
            label={opt.label}
            shortcut={opt.shortcut}
            active={blockType === opt.type}
            onClick={() => formatBlock(opt.type)}
          />
        ))}
      </DropDown>

      <div className="editor-divider" />

      {/* Text format buttons */}
      <button
        type="button"
        className={`editor-toolbar-item ${isBold ? "active" : ""}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        disabled={disabled}
        title={`Bold (${macShortcut ? "⌘B" : "Ctrl+B"})`}
        aria-label="Format bold"
      >
        <Bold size={15} />
      </button>
      <button
        type="button"
        className={`editor-toolbar-item ${isItalic ? "active" : ""}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        disabled={disabled}
        title={`Italic (${macShortcut ? "⌘I" : "Ctrl+I"})`}
        aria-label="Format italic"
      >
        <Italic size={15} />
      </button>
      <button
        type="button"
        className={`editor-toolbar-item ${isUnderline ? "active" : ""}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        disabled={disabled}
        title={`Underline (${macShortcut ? "⌘U" : "Ctrl+U"})`}
        aria-label="Format underline"
      >
        <Underline size={15} />
      </button>
      <button
        type="button"
        className={`editor-toolbar-item ${isStrikethrough ? "active" : ""}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }
        disabled={disabled}
        title="Strikethrough"
        aria-label="Format strikethrough"
      >
        <Strikethrough size={15} />
      </button>
      <button
        type="button"
        className={`editor-toolbar-item ${isInlineCode ? "active" : ""}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
        disabled={disabled}
        title="Inline code"
        aria-label="Format inline code"
      >
        <Code2 size={15} />
      </button>

      {/* Link button + inline input */}
      {showLinkInput ? (
        <div className="editor-link-input">
          <input
            ref={linkInputRef}
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitLink();
              if (e.key === "Escape") setShowLinkInput(false);
            }}
          />
          <button
            type="button"
            className="editor-link-input-btn"
            onClick={submitLink}
            title="Apply link"
          >
            <Check size={13} />
          </button>
          <button
            type="button"
            className="editor-link-input-btn"
            onClick={() => setShowLinkInput(false)}
            title="Cancel"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`editor-toolbar-item ${isLink ? "active" : ""}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleLinkClick}
          disabled={disabled}
          title="Insert / remove link"
          aria-label="Link"
        >
          <Link size={15} />
        </button>
      )}

      <div className="editor-divider" />

      {/* Code language selector (visible when cursor is in a code block) */}
      {blockType === "code" && (
        <DropDown
          label={
            CODE_LANGUAGES.find(([v]) => v === codeLanguage)?.[1] ??
            codeLanguage
          }
          disabled={disabled}
          aria-label="Code language"
        >
          {CODE_LANGUAGES.map(([value, name]) => (
            <DropDownItem
              key={value}
              icon={<Code size={13} />}
              label={name}
              active={codeLanguage === value}
              onClick={() => setCodeLang(value)}
            />
          ))}
        </DropDown>
      )}

      {/* Insert dropdown */}
      <DropDown
        icon={<Plus size={15} />}
        label="Insert"
        disabled={disabled}
        aria-label="Insert"
      >
        <DropDownItem
          icon={<PenTool size={15} />}
          label="Excalidraw sketch"
          onClick={() =>
            editor.dispatchCommand(INSERT_EXCALIDRAW_COMMAND, undefined)
          }
        />
      </DropDown>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditorContent — inner component with access to LexicalComposerContext
// ---------------------------------------------------------------------------

interface ContentProps {
  onSubmit: (blocks: UserContentBlock[]) => void;
  disabled?: boolean;
  placeholder?: string;
  constraintText?: React.ReactNode;
}

function EditorContent({
  onSubmit,
  disabled,
  placeholder,
  constraintText,
}: ContentProps) {
  const [editor] = useLexicalComposerContext();

  const handleSubmit = useCallback(async () => {
    if (disabled) return;
    const editorState = editor.getEditorState();
    const blocks = await serializeEditorState(editorState);
    if (blocks.length === 0) return;
    onSubmit(blocks);
    editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
  }, [editor, onSubmit, disabled]);

  return (
    <>
      <ToolbarPlugin disabled={disabled} />

      <div className="editor-scroller">
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input" />}
          placeholder={
            <div className="editor-placeholder">
              {placeholder ?? "Type your reply…"}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <CodeHighlightPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <ClickableLinkPlugin />
        <ClearEditorPlugin />
        <ExcalidrawPlugin />
        <SubmitPlugin onSubmit={handleSubmit} disabled={disabled} />
      </div>

      <div className="editor-footer">
        <div className="editor-footer-left">
          {constraintText && (
            <>
              {constraintText}
              <span className="editor-hint">•</span>
            </>
          )}
          <span className="editor-hint">
            {disabled
              ? "Waiting for response…"
              : `${IS_APPLE ? "⌘" : "Ctrl"}+Enter to send`}
          </span>
        </div>
        <Button variant="primary" onClick={handleSubmit} disabled={disabled}>
          <div className="flex items-center gap-2">
            Send
            <SendHorizonal size={14} />
          </div>
        </Button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface Props {
  onSubmit: (blocks: UserContentBlock[]) => void;
  disabled?: boolean;
  placeholder?: string;
  constraintText?: React.ReactNode;
}

export function RichEditor({
  onSubmit,
  disabled,
  placeholder,
  constraintText,
}: Props) {
  const initialConfig = {
    namespace: "MimidEditor",
    theme: EDITOR_THEME,
    nodes: EDITOR_NODES,
    onError: (err: Error) => {
      throw err;
    },
  };

  return (
    <div className="border border-gray-300 rounded-lg shadow-sm overflow-hidden bg-white">
      <LexicalComposer initialConfig={initialConfig}>
        <EditorContent
          onSubmit={onSubmit}
          disabled={disabled}
          placeholder={placeholder}
          constraintText={constraintText}
        />
      </LexicalComposer>
    </div>
  );
}
