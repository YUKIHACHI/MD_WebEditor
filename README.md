# Markdown Editor

ブラウザだけで使える、ローカル保存対応の Markdown エディターです。  
`.md` / `.markdown` を読み込んで編集し、GitHub 風プレビューで確認しながら、HTML や PDF 用の印刷画面まで出力できます。

[GitHub Pages で開く](https://yukihachi.github.io/MD_WebEditor/)

## 特徴

Markdown を書く道具はたくさんありますが、このエディターは「書く」「確認する」「配布できる形にする」までをひとつの画面で完結させることを目指しています。

| できること | 内容 |
| --- | --- |
| リアルタイムプレビュー | 編集内容をすぐに GitHub 風の表示へ反映 |
| HTML 出力 | Markdown をそのまま共有しやすい HTML ファイルとして保存 |
| PDF 出力 | プレビュー内容を印刷画面から PDF 化 |
| 複数ファイル編集 | タブで複数の Markdown ファイルを切り替え |
| ローカル自動保存 | ブラウザの `localStorage` に作業状態を保存 |

## 主な機能

- `.md` / `.markdown` ファイルの読み込み
- Markdown の編集とリアルタイムプレビュー
- GitHub 風 Markdown 表示
- テーブル記法のプレビュー
- `.md` として保存
- HTML 出力
- PDF 出力用の印刷画面表示
- 見出し、太字、斜体、コード、リスト、引用、テーブルの挿入
- エディタ / プレビュー / 分割表示の切り替え
- 文字数、単語数、行数の表示
- タブ式の複数ファイル編集
- 検索・置換
- ダークモード

## 使い方

公開版を使う場合は、以下のURLを開くだけです。

[https://yukihachi.github.io/MD_WebEditor/]((https://yukihachi.github.io/MD_WebEditor/))

ローカルで起動する場合は、リポジトリを取得してから以下を実行します。

```bash
npm install
npm run dev
```

起動後、ブラウザで `http://localhost:5173/` を開きます。

## デスクトップアプリとして使う

Windows で `.md` / `.markdown` を開くアプリとして使いたい場合は、Electron 版をビルドできます。

```bash
npm run desktop:build
```

ビルド後、`release` フォルダに `MD WebEditor Setup 1.0.0.exe` が作成されます。  
インストールすると、Markdown ファイルを開くアプリとして `MD WebEditor` を選べるようになります。

## 操作メモ

- 左のファイルメニューを右クリックすると、新しいファイルを作成できます。
- ツールバーの挿入操作は `Ctrl+Z` で戻せます。
- コードブロックに `js` などの言語名を書くと、プレビュー側にも言語ラベルが表示されます。

````markdown
```js
console.log("Markdown Editor");
```
````

## 技術スタック

- React
- Vite
- marked
- DOMPurify
- lucide-react
- GitHub Actions
- GitHub Pages

## データの扱い

このエディターはサーバーに Markdown 本文を送信しません。  
読み込んだファイルや自動保存の内容は、ブラウザ上のローカルな保存領域を使って扱います。

## ライセンス

MIT License
