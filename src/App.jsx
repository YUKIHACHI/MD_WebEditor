import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import {
  Bold,
  Code2,
  Download,
  FileDown,
  FilePlus2,
  FileText,
  Heading1,
  Italic,
  List,
  Moon,
  PanelLeftClose,
  PanelRightClose,
  Quote,
  Replace,
  Save,
  Search,
  SplitSquareHorizontal,
  Sun,
  Table2,
  Upload,
  X
} from 'lucide-react';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const renderer = new marked.Renderer();

renderer.code = function codeRenderer(code, infostring, escaped) {
  const token = typeof code === 'object' && code !== null ? code : null;
  const text = token ? token.text ?? '' : code;
  const lang = (token ? token.lang : infostring)?.trim().split(/\s+/)[0] ?? '';
  const languageAttr = lang ? ` data-language="${escapeHtml(lang)}"` : '';
  const classAttr = lang ? ` class="language-${escapeHtml(lang)}"` : '';
  const content = token?.escaped || escaped ? text : escapeHtml(text);

  return `<pre${languageAttr}><code${classAttr}>${content}</code></pre>`;
};

marked.use({
  gfm: true,
  breaks: false,
  renderer
});

const STORAGE_KEY = 'markdown-editor-workspace-v1';

const starterMarkdown = `# Markdown Editor

GitHub風Markdownのプレビューを見ながら、すぐに編集できます。

> 左でファイルを切り替え、中央で書き、右で仕上がりを確認します。

## できること

- **太字** と *斜体*
- \`inline code\` とコードブロック
- リスト、引用、テーブル

| 項目 | 状態 | メモ |
| --- | --- | --- |
| リアルタイムプレビュー | 完了 | 編集と同時に更新 |
| 自動保存 | 有効 | ブラウザに保存 |
| HTML/PDF出力 | 対応 | ツールバーから実行 |

\`\`\`js
const message = 'Markdownを気持ちよく書く';
console.log(message);
\`\`\`
`;

function createDoc(name = 'untitled.md', content = starterMarkdown) {
  return {
    id: crypto.randomUUID(),
    name,
    content,
    savedContent: content,
    fileHandle: null,
    filePath: null,
    updatedAt: Date.now()
  };
}

function createDesktopDoc(file) {
  return {
    ...createDoc(file.name, file.content),
    filePath: file.path
  };
}

function readWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.docs) || parsed.docs.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function countWords(text) {
  const englishWords = text.match(/[A-Za-z0-9_]+(?:[-'][A-Za-z0-9_]+)*/g) ?? [];
  const japaneseUnits = text.match(/[\u3040-\u30ff\u3400-\u9fff]+/g) ?? [];
  return englishWords.length + japaneseUnits.join('').length;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ToolbarButton({ label, active, children, onClick }) {
  return (
    <button className={`icon-button ${active ? 'is-active' : ''}`} title={label} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

function App() {
  const initial = readWorkspace();
  const [docs, setDocs] = useState(() => initial?.docs ?? [createDoc()]);
  const [activeId, setActiveId] = useState(() => initial?.activeId ?? null);
  const [theme, setTheme] = useState(() => initial?.theme ?? 'light');
  const [viewMode, setViewMode] = useState(() => initial?.viewMode ?? 'split');
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(Date.now());
  const [contextMenu, setContextMenu] = useState(null);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const toolbarUndoStackRef = useRef([]);
  const startupFilesLoadedRef = useRef(false);
  const desktopApi = window.markdownEditorDesktop;

  const activeDoc = useMemo(() => {
    return docs.find((doc) => doc.id === (activeId ?? docs[0]?.id)) ?? docs[0];
  }, [activeId, docs]);

  const markdownHtml = useMemo(() => {
    return DOMPurify.sanitize(marked.parse(activeDoc?.content ?? ''));
  }, [activeDoc?.content]);

  const stats = useMemo(() => {
    const text = activeDoc?.content ?? '';
    return {
      chars: [...text].length,
      words: countWords(text),
      lines: text.split('\n').length
    };
  }, [activeDoc?.content]);

  const matches = useMemo(() => {
    if (!query || !activeDoc) return 0;
    return activeDoc.content.toLowerCase().split(query.toLowerCase()).length - 1;
  }, [activeDoc, query]);

  useEffect(() => {
    if (!activeId && docs[0]) setActiveId(docs[0].id);
  }, [activeId, docs]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const snapshot = {
      docs: docs.map(({ fileHandle, ...doc }) => doc),
      activeId: activeDoc?.id ?? docs[0]?.id,
      theme,
      viewMode
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    setLastSavedAt(Date.now());
  }, [docs, activeDoc?.id, theme, viewMode]);

  useEffect(() => {
    if (!desktopApi || startupFilesLoadedRef.current) return;
    startupFilesLoadedRef.current = true;

    desktopApi.getStartupFiles().then((files) => {
      if (!Array.isArray(files) || files.length === 0) return;
      const loaded = files.map(createDesktopDoc);
      setDocs((current) => [...current, ...loaded]);
      setActiveId(loaded[0].id);
    });
  }, [desktopApi]);

  useEffect(() => {
    if (!contextMenu) return undefined;

    function closeMenu() {
      setContextMenu(null);
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') closeMenu();
    }

    window.addEventListener('click', closeMenu);
    window.addEventListener('contextmenu', closeMenu);
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('contextmenu', closeMenu);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [contextMenu]);

  function updateActiveContent(content) {
    setDocs((current) =>
      current.map((doc) =>
        doc.id === activeDoc.id
          ? {
              ...doc,
              content,
              updatedAt: Date.now()
            }
          : doc
      )
    );
  }

  function updateActiveDoc(patch) {
    setDocs((current) => current.map((doc) => (doc.id === activeDoc.id ? { ...doc, ...patch } : doc)));
  }

  function applyTextareaInsertion(start, end, text, selectionStart, selectionEnd) {
    const textarea = editorRef.current;
    if (!textarea || !activeDoc) return;
    const beforeContent = activeDoc.content;
    const afterContent = `${beforeContent.slice(0, start)}${text}${beforeContent.slice(end)}`;

    toolbarUndoStackRef.current.push({
      docId: activeDoc.id,
      beforeContent,
      afterContent,
      selectionStart: start,
      selectionEnd: end
    });

    textarea.focus();
    textarea.setSelectionRange(start, end);
    const insertedWithUndo = document.execCommand?.('insertText', false, text);

    if (!insertedWithUndo) {
      textarea.setRangeText(text, start, end, 'end');
      textarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = selectionStart;
      textarea.selectionEnd = selectionEnd;
    });
  }

  function handleEditorKeyDown(event) {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || event.shiftKey || !activeDoc) return;

    const lastToolbarEdit = toolbarUndoStackRef.current.at(-1);
    if (!lastToolbarEdit || lastToolbarEdit.docId !== activeDoc.id || lastToolbarEdit.afterContent !== activeDoc.content) return;

    event.preventDefault();
    toolbarUndoStackRef.current.pop();
    updateActiveContent(lastToolbarEdit.beforeContent);

    requestAnimationFrame(() => {
      const textarea = editorRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.selectionStart = lastToolbarEdit.selectionStart;
      textarea.selectionEnd = lastToolbarEdit.selectionEnd;
    });
  }

  function insertMarkdown(before, after = '', placeholder = '') {
    const textarea = editorRef.current;
    if (!textarea || !activeDoc) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = activeDoc.content.slice(start, end) || placeholder;
    const inserted = `${before}${selected}${after}`;

    applyTextareaInsertion(start, end, inserted, start + before.length, start + before.length + selected.length);
  }

  function insertLine(prefix, placeholder) {
    const textarea = editorRef.current;
    if (!textarea || !activeDoc) return;
    const start = textarea.selectionStart;
    const lineStart = activeDoc.content.lastIndexOf('\n', start - 1) + 1;
    const isEmpty = activeDoc.content.length === 0;
    const inserted = isEmpty ? `${prefix}${placeholder}` : prefix;

    applyTextareaInsertion(lineStart, lineStart, inserted, lineStart + inserted.length, lineStart + inserted.length);
  }

  function newDocument() {
    const doc = createDoc(`memo-${docs.length + 1}.md`, '# 新しいMarkdown\n\nここから書き始めます。\n');
    setDocs((current) => [...current, doc]);
    setActiveId(doc.id);
    setContextMenu(null);
  }

  function openSidebarContextMenu(event) {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 190;
    const menuHeight = 44;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 8);

    setContextMenu({
      x: Math.max(8, x),
      y: Math.max(8, y)
    });
  }

  function closeDocument(id) {
    if (docs.length === 1) return;
    const nextDocs = docs.filter((doc) => doc.id !== id);
    setDocs(nextDocs);
    if (activeDoc.id === id) setActiveId(nextDocs[0].id);
  }

  async function openFiles(event) {
    const files = Array.from(event.target.files ?? []).filter((file) => /\.(md|markdown)$/i.test(file.name));
    const loaded = await Promise.all(
      files.map(async (file) => createDoc(file.name, await file.text()))
    );
    if (loaded.length) {
      setDocs((current) => [...current, ...loaded]);
      setActiveId(loaded[0].id);
    }
    event.target.value = '';
  }

  async function openMarkdownFiles() {
    if (desktopApi) {
      const files = await desktopApi.openMarkdownFiles();
      if (!Array.isArray(files) || files.length === 0) return;
      const loaded = files.map(createDesktopDoc);
      setDocs((current) => [...current, ...loaded]);
      setActiveId(loaded[0].id);
      return;
    }

    fileInputRef.current?.click();
  }

  async function saveMarkdown() {
    if (!activeDoc) return;

    if (desktopApi) {
      const savedFile = await desktopApi.saveMarkdownFile({
        filePath: activeDoc.filePath,
        suggestedName: activeDoc.name.match(/\.(md|markdown)$/i) ? activeDoc.name : `${activeDoc.name}.md`,
        content: activeDoc.content
      });

      if (!savedFile) return;
      updateActiveDoc({ name: savedFile.name, filePath: savedFile.path, savedContent: activeDoc.content });
      return;
    }

    const blob = new Blob([activeDoc.content], { type: 'text/markdown;charset=utf-8' });
    const name = activeDoc.name.match(/\.(md|markdown)$/i) ? activeDoc.name : `${activeDoc.name}.md`;
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: name,
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        updateActiveDoc({ name: handle.name, savedContent: activeDoc.content, fileHandle: handle });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    downloadBlob(blob, name);
    updateActiveDoc({ savedContent: activeDoc.content });
  }

  function exportHtml() {
    const body = DOMPurify.sanitize(marked.parse(activeDoc.content));
    const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${activeDoc.name}</title><style>body{max-width:860px;margin:48px auto;font:16px/1.7 system-ui,sans-serif;color:#24292f;padding:0 24px}pre{background:#f6f8fa;padding:16px;border-radius:8px;overflow:auto}code{background:#f6f8fa;padding:.15em .35em;border-radius:4px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d0d7de;padding:8px 10px}blockquote{border-left:4px solid #d0d7de;color:#57606a;margin-left:0;padding-left:16px}</style></head><body>${body}</body></html>`;
    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), activeDoc.name.replace(/\.(md|markdown)$/i, '.html'));
  }

  function exportPdf() {
    const preview = document.querySelector('.preview-body')?.innerHTML ?? '';
    const win = window.open('', '_blank', 'width=920,height=720');
    if (!win) return;
    win.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${activeDoc.name}</title><style>body{max-width:860px;margin:40px auto;font:16px/1.7 system-ui,sans-serif;color:#24292f;padding:0 24px}pre{background:#f6f8fa;padding:16px;border-radius:8px;overflow:auto}code{background:#f6f8fa;padding:.15em .35em;border-radius:4px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d0d7de;padding:8px 10px}blockquote{border-left:4px solid #d0d7de;color:#57606a;margin-left:0;padding-left:16px}@media print{body{margin:0 auto}}</style></head><body>${preview}<script>window.onload=()=>{window.print()}</script></body></html>`);
    win.document.close();
  }

  function replaceOne() {
    if (!query || !activeDoc) return;
    updateActiveContent(activeDoc.content.replace(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), replacement));
  }

  function replaceAll() {
    if (!query || !activeDoc) return;
    updateActiveContent(activeDoc.content.replaceAll(query, replacement));
  }

  const dirty = activeDoc && activeDoc.content !== activeDoc.savedContent;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <FileText size={22} />
          <div>
            <strong>Markdown Editor</strong>
            <span>ローカル自動保存・GitHub風プレビュー</span>
          </div>
        </div>

        <div className="command-group">
          <ToolbarButton label="新規ファイル" onClick={newDocument}><FilePlus2 size={18} /></ToolbarButton>
          <ToolbarButton label=".md / .markdown を開く" onClick={openMarkdownFiles}><Upload size={18} /></ToolbarButton>
          <ToolbarButton label=".mdとして保存" onClick={saveMarkdown}><Save size={18} /></ToolbarButton>
          <span className="divider" />
          <ToolbarButton label="見出し" onClick={() => insertLine('# ', '見出し')}><Heading1 size={18} /></ToolbarButton>
          <ToolbarButton label="太字" onClick={() => insertMarkdown('**', '**', '太字')}><Bold size={18} /></ToolbarButton>
          <ToolbarButton label="斜体" onClick={() => insertMarkdown('*', '*', '斜体')}><Italic size={18} /></ToolbarButton>
          <ToolbarButton label="コード" onClick={() => insertMarkdown('`', '`', 'code')}><Code2 size={18} /></ToolbarButton>
          <ToolbarButton label="リスト" onClick={() => insertLine('- ', 'リスト')}><List size={18} /></ToolbarButton>
          <ToolbarButton label="引用" onClick={() => insertLine('> ', '引用')}><Quote size={18} /></ToolbarButton>
          <ToolbarButton label="テーブル" onClick={() => insertMarkdown('\n| 列1 | 列2 |\n| --- | --- |\n| 値 | 値 |\n', '', '')}><Table2 size={18} /></ToolbarButton>
        </div>

        <div className="command-group right">
          <ToolbarButton label="エディタのみ" active={viewMode === 'editor'} onClick={() => setViewMode('editor')}><PanelRightClose size={18} /></ToolbarButton>
          <ToolbarButton label="分割表示" active={viewMode === 'split'} onClick={() => setViewMode('split')}><SplitSquareHorizontal size={18} /></ToolbarButton>
          <ToolbarButton label="プレビューのみ" active={viewMode === 'preview'} onClick={() => setViewMode('preview')}><PanelLeftClose size={18} /></ToolbarButton>
          <ToolbarButton label="HTML出力" onClick={exportHtml}><Download size={18} /></ToolbarButton>
          <ToolbarButton label="PDF出力" onClick={exportPdf}><FileDown size={18} /></ToolbarButton>
          <ToolbarButton label={theme === 'dark' ? 'ライトモード' : 'ダークモード'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </ToolbarButton>
        </div>
      </header>

      <input ref={fileInputRef} className="hidden-input" type="file" accept=".md,.markdown,text/markdown" multiple onChange={openFiles} />

      <section className="searchbar">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="検索" />
        <Replace size={17} />
        <input value={replacement} onChange={(event) => setReplacement(event.target.value)} placeholder="置換後の文字列" />
        <button onClick={replaceOne}>1件置換</button>
        <button onClick={replaceAll}>すべて置換</button>
        <span>{matches} 件</span>
      </section>

      <main className="workspace">
        <aside className="sidebar" onContextMenu={openSidebarContextMenu}>
          <div className="sidebar-title">ファイル</div>
          <div className="tab-list">
            {docs.map((doc) => (
              <button key={doc.id} className={`file-tab ${doc.id === activeDoc?.id ? 'is-active' : ''}`} onClick={() => setActiveId(doc.id)}>
                <span>{doc.name}</span>
                {doc.content !== doc.savedContent && <i />}
                {docs.length > 1 && (
                  <X
                    size={14}
                    onClick={(event) => {
                      event.stopPropagation();
                      closeDocument(doc.id);
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </aside>

        <section className={`editor-grid view-${viewMode}`}>
          {viewMode !== 'preview' && (
            <div className="pane editor-pane">
              <div className="pane-header">
                <strong>編集</strong>
                <span>{dirty ? '未保存' : '保存済み'}</span>
              </div>
              <textarea
                ref={editorRef}
                value={activeDoc?.content ?? ''}
                onChange={(event) => updateActiveContent(event.target.value)}
                onKeyDown={handleEditorKeyDown}
                spellCheck="false"
                aria-label="Markdown編集欄"
              />
            </div>
          )}

          {viewMode !== 'editor' && (
            <div className="pane preview-pane">
              <div className="pane-header">
                <strong>プレビュー</strong>
                <span>GitHub風Markdown</span>
              </div>
              <article className="preview-body" dangerouslySetInnerHTML={{ __html: markdownHtml }} />
            </div>
          )}
        </section>
      </main>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button type="button" role="menuitem" onClick={newDocument}>
            <FilePlus2 size={16} />
            <span>新しいファイルを作成</span>
          </button>
        </div>
      )}

      <footer className="statusbar">
        <span>{activeDoc?.name}</span>
        <span>{stats.chars.toLocaleString()} 文字</span>
        <span>{stats.words.toLocaleString()} 語</span>
        <span>{stats.lines.toLocaleString()} 行</span>
        <span>自動保存 {new Date(lastSavedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </footer>
    </div>
  );
}

export default App;
