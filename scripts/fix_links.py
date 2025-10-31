#!/usr/bin/env python3
"""
Simple link fixer: replace known Vercel preview/site links with the final GitHub Pages URL.
Run from repository root. It edits files in place and prints changed files.
"""
import os, re
root = '/workspaces/SuslovPA'
final_site = 'https://montagnikrea-source.github.io/SuslovPA'
vercel_patterns = [
    r'https://pavell\.vercel\.app',
    r'https://pavell-[\w\-]+\.vercel\.app',
    r'https://suslvopa-chat-proxy\.vercel\.app',
    r'https://your-project\.vercel\.app',
    r'https://pavell-.*?vercel\.app'
]
# Files to process
exts = ('.html','.htm','.md','.txt','.sh','.js','.json')
changed = []
for dirpath, dirs, files in os.walk(root):
    for fn in files:
        if not fn.endswith(exts):
            continue
        path = os.path.join(dirpath, fn)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                s = f.read()
        except Exception:
            continue
        orig = s
        # Replace common pavell references
        s = re.sub(r'https://pavell\.vercel\.app/noninput\.html', final_site + '/noninput.html', s)
        s = re.sub(r'https://pavell\.vercel\.app/', final_site + '/', s)
        s = re.sub(r'https://pavell\.vercel\.app', final_site, s)
        # Other pavell-* previews
        s = re.sub(r'https://pavell-[\w\-]+\.vercel\.app(/[^\s\)"\']*)?', final_site + r'\1', s)
        # suslvopa-chat-proxy and your-project
        s = re.sub(r'https://suslvopa-chat-proxy\.vercel\.app(/[^\s\)"\']*)?', final_site + r'\1', s)
        s = re.sub(r'https://your-project\.vercel\.app(/[^\s\)"\']*)?', final_site + r'\1', s)
        # Fix common malformed patterns: trailing quotes/apostrophes or ),
        s = re.sub(r"(https://montagnikrea-source.github.io/SuslovPA)[\'\"\),]+", r"\1", s)
        # Also fix bare root occurrences that should point to repo path in docs (but don't change vercel.json or code checks)
        # We'll only replace in docs/ and README-like files
        rel = os.path.relpath(path, root)
        if rel.lower().endswith(('.md','.txt','.html')) and ('docs' in rel or 'README' in fn or rel.startswith('public') or rel.endswith('.md') or rel.endswith('.html')):
            s = re.sub(r'https://montagnikrea-source.github.io(/(?!SuslovPA))', final_site, s)
        if s != orig:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(s)
            changed.append(rel)

print('Changed files:', len(changed))
for c in changed:
    print('-', c)
