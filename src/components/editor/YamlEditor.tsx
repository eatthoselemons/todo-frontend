import React, { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { yaml } from '@codemirror/lang-yaml';
import { vim, Vim } from '@replit/codemirror-vim';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { useVimSettings } from '../../context/VimSettingsContext';

// Monokai syntax highlighting theme
const monokaiHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#f92672' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#a6e22e' },
  { tag: [t.function(t.variableName), t.labelName], color: '#a6e22e' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#ae81ff' },
  { tag: [t.definition(t.name), t.separator], color: '#f8f8f2' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#ae81ff' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#f92672' },
  { tag: [t.meta, t.comment], color: '#75715e' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: '#66d9ef', textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: '#a6e22e' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#ae81ff' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#e6db74' },
  { tag: t.invalid, color: '#f92672' },
]);

interface YamlEditorProps {
  initialValue: string;
  className?: string;
  style?: React.CSSProperties;
}

export interface YamlEditorRef {
  getValue: () => string;
}

export const YamlEditor = React.forwardRef<YamlEditorRef, YamlEditorProps>(({
  initialValue,
  className,
  style,
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { settings } = useVimSettings();

  // Expose getValue method via ref
  React.useImperativeHandle(ref, () => ({
    getValue: () => {
      return viewRef.current?.state.doc.toString() || '';
    },
  }));

  // Apply custom vim commands - memoized to avoid re-parsing on every render
  const applyVimCommands = React.useCallback(() => {
    if (settings.enabled && settings.customCommands) {
      const lines = settings.customCommands.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('"')) continue;

        try {
          // Execute vim command - CodeMirror Vim uses mapCommand for mappings
          if (trimmed.startsWith(':imap ')) {
            const parts = trimmed.substring(6).trim().split(/\s+/);
            if (parts.length >= 2) {
              Vim.map(parts[0], parts[1], 'insert');
            }
          } else if (trimmed.startsWith(':nmap ')) {
            const parts = trimmed.substring(6).trim().split(/\s+/);
            if (parts.length >= 2) {
              Vim.map(parts[0], parts[1], 'normal');
            }
          } else if (trimmed.startsWith(':vmap ')) {
            const parts = trimmed.substring(6).trim().split(/\s+/);
            if (parts.length >= 2) {
              Vim.map(parts[0], parts[1], 'visual');
            }
          } else if (trimmed.startsWith(':map ')) {
            const parts = trimmed.substring(5).trim().split(/\s+/);
            if (parts.length >= 2) {
              Vim.map(parts[0], parts[1], 'normal');
            }
          }
        } catch (error) {
          console.warn('Failed to execute vim command:', trimmed, error);
        }
      }
    }
  }, [settings.enabled, settings.customCommands]);

  useEffect(() => {
    applyVimCommands();
  }, [applyVimCommands]);

  // Initialize editor only once
  useEffect(() => {
    if (!editorRef.current) return;

    // Create editor extensions
    const extensions = [
      basicSetup,
      yaml(),
      syntaxHighlighting(monokaiHighlight),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '14px',
          backgroundColor: '#272822',
        },
        '.cm-scroller': {
          fontFamily: 'monospace',
          overflow: 'auto',
        },
        '.cm-content': {
          minHeight: '300px',
          color: '#f8f8f2',
        },
        '.cm-gutters': {
          backgroundColor: '#272822',
          color: '#75715e',
          border: 'none',
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#3e3d32',
        },
        '.cm-activeLine': {
          backgroundColor: '#3e3d32',
        },
        '.cm-cursor': {
          borderLeftColor: '#f8f8f0',
        },
        '.cm-selectionBackground, ::selection': {
          backgroundColor: '#49483e !important',
        },
        '&.cm-focused .cm-selectionBackground, &.cm-focused ::selection': {
          backgroundColor: '#49483e !important',
        },
      }, { dark: true }),
    ];

    // Add vim mode if enabled
    if (settings.enabled) {
      extensions.push(vim());
    }

    // Create the editor state
    const state = EditorState.create({
      doc: initialValue,
      extensions,
    });

    // Create the editor view
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Cleanup
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [settings.enabled]); // Only recreate when vim mode is toggled

  // Update content when initialValue changes (without recreating the editor)
  useEffect(() => {
    if (viewRef.current && initialValue !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: initialValue,
        },
      });
    }
  }, [initialValue]);

  return (
    <div
      ref={editorRef}
      className={className}
      style={{
        border: '1px solid #444',
        borderRadius: '4px',
        overflow: 'hidden',
        ...style,
      }}
    />
  );
});
