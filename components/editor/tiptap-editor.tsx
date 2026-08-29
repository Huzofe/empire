'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { EditorToolbar } from './editor-toolbar'
import { useEffect } from 'react'
import { JSONContent } from '@tiptap/core'

interface TiptapEditorProps {
  content?: JSONContent
  onChange?: (content: JSONContent) => void
  editable?: boolean
  placeholder?: string
  autoFocus?: boolean
}

export function TiptapEditor({
  content,
  onChange,
  editable = true,
  placeholder = 'Начните печатать...',
  autoFocus = false,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
    ],
    content: content || {
      type: 'doc',
      content: [],
    },
    editable,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      onChange?.(json)
    },
  })

  useEffect(() => {
    if (editor && content) {
      const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(content)
      if (!isSame) {
        editor.commands.setContent(content)
      }
    }
  }, [editor, content])

  if (!editor) {
    return null
  }

  return (
    <div className="border rounded-lg">
      {editable && (
        <div className="border-b bg-gray-50 px-2 py-1 flex gap-1 flex-wrap">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            type="button"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            type="button"
          >
            <em>I</em>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('strike') ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            type="button"
          >
            <s>S</s>
          </button>
          
          <div className="w-px bg-gray-300 mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            type="button"
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            type="button"
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            type="button"
          >
            H3
          </button>

          <div className="w-px bg-gray-300 mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            type="button"
          >
            • List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            type="button"
          >
            1. List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('blockquote') ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            type="button"
          >
            " Quote
          </button>

          <div className="w-px bg-gray-300 mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('code') ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            type="button"
          >
            {'</>'}
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`px-2 py-1 rounded text-sm ${
              editor.isActive('codeBlock') ? 'bg-gray-200' : 'hover:bg-gray-100'
            }`}
            type="button"
          >
            {'{ }'}
          </button>

          <div className="w-px bg-gray-300 mx-1" />

          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="px-2 py-1 rounded text-sm hover:bg-gray-100 disabled:opacity-30"
            type="button"
          >
            ↶
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="px-2 py-1 rounded text-sm hover:bg-gray-100 disabled:opacity-30"
            type="button"
          >
            ↷
          </button>
        </div>
      )}
      
      <EditorContent editor={editor} />
      
      {editable && (
        <div className="border-t bg-gray-50 px-3 py-1 text-xs text-gray-500">
          {editor.storage.characterCount?.characters() || 0} символов
        </div>
      )}
    </div>
  )
}
