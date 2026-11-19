#!/usr/bin/env python3
"""Extract the final, combined proofread Word document into review snapshots.

Never publishes. Keeps source order, list numbering, paragraph bold and table
cells. Rejects tracked changes and unfamiliar document boundaries for review.
"""
import argparse
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W = '{' + NS['w'] + '}'
PARTS = [('stories', 'סיפורים'), ('intro', 'מבוא לאפליקציה'),
         ('chabad', 'דיני טהרה – חב"ד'), ('ovadia', 'דיני טהרה – ספרדי'),
         ('eliyahu', 'הרב מרדכי אליהו')]


def value(element, path, default=None):
    node = element.find(path, NS)
    return node.get(W + 'val', default) if node is not None else default


def text(element):
    return ''.join(node.text or '' if node.tag == W + 't' else ' '
                   for node in element.iter() if node.tag in {W + 't', W + 'tab', W + 'br'})


def enabled(element, path):
    node = element.find(path, NS)
    return node is not None and node.get(W + 'val', '1') not in {'0', 'false', 'off'}


def extract(path):
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
        assert not root.findall('.//w:ins', NS) and not root.findall('.//w:del', NS), 'Resolve tracked changes first'
        numbering = ET.fromstring(archive.read('word/numbering.xml'))
    abstract = {node.get(W + 'abstractNumId'): node for node in numbering.findall('w:abstractNum', NS)}
    lists = {}
    for node in numbering.findall('w:num', NS):
        base = abstract[value(node, 'w:abstractNumId')]
        levels = []
        for level in base.findall('w:lvl', NS):
            i = level.get(W + 'ilvl')
            override = node.find(f'w:lvlOverride[@w:ilvl="{i}"]', NS)
            spec = override.find('w:lvl', NS) if override is not None else None
            spec = spec if spec is not None else level
            fmt = value(spec, 'w:numFmt', value(level, 'w:numFmt'))
            assert fmt in {'decimal', 'bullet'}, fmt
            glyph = value(spec, 'w:lvlText', value(level, 'w:lvlText'))
            start = int(value(override, 'w:startOverride', value(level, 'w:start', '1'))) if override is not None else int(value(level, 'w:start', '1'))
            levels.append({'glyphType': 'DECIMAL' if fmt == 'decimal' else 'BULLET',
                           'glyphFormat': re.sub(r'%(\d+)', lambda m: '%' + str(int(m[1])-1), glyph) if fmt == 'decimal' else ('•' if glyph == '\uf0b7' else glyph),
                           'startNumber': start})
        lists[node.get(W + 'numId')] = {'listProperties': {'nestingLevels': levels}}

    def paragraph(node):
        runs = [run for run in node.findall('.//w:r', NS) if text(run).strip()]
        bold = bool(runs) and all(enabled(run, 'w:rPr/w:bCs') if enabled(run, 'w:rPr/w:rtl') else enabled(run, 'w:rPr/w:b') for run in runs)
        item = {'type': 'paragraph', 'text': text(node), 'bold': bold}
        number = value(node, 'w:pPr/w:numPr/w:numId')
        if number and number != '0':
            item['bullet'] = {'listId': number, 'nestingLevel': int(value(node, 'w:pPr/w:numPr/w:ilvl', '0'))}
        return item

    contents = {name: [] for name, _ in PARTS}
    current = None
    next_part = 0
    for node in root.find('w:body', NS):
        if node.tag == W + 'sectPr':
            continue
        label = re.sub(r'\s+', ' ', text(node)).strip()
        if not label or re.fullmatch(r'(=\s*)+', label) or (current is None and label == 'בס"ד'):
            continue
        if next_part < len(PARTS) and label == PARTS[next_part][1]:
            current = PARTS[next_part][0]
            next_part += 1
        assert current is not None, label
        if node.tag == W + 'p':
            contents[current].append(paragraph(node))
        elif node.tag == W + 'tbl':
            rows = []
            for row in node.findall('w:tr', NS):
                cells = row.findall('w:tc', NS)
                assert len(cells) == 3, 'Merged or non-three-column table needs review'
                assert all(not cell.findall('.//w:tbl', NS) for cell in cells), 'Nested table'
                assert all(value(cell, 'w:tcPr/w:gridSpan', '1') == '1' and cell.find('w:tcPr/w:vMerge', NS) is None for cell in cells), 'Merged cell'
                rows.append([[paragraph(p) for p in cell.findall('w:p', NS)] for cell in cells])
            contents[current].append({'type': 'table', 'rows': rows})
        else:
            raise ValueError('Unsupported body element: ' + node.tag)
    assert next_part == 5, 'Expected all five final sections'
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return {name: {'id': 'gmail:1a1eed0ef940883d:' + name,
                   'title': title, 'url': 'https://mail.google.com/mail/u/?authuser=shai.rubin%40xorcom.com#all/1a1eed0ef940883d',
                   'revision': 'sha256:' + digest,
                   'source': {'filename': path.name, 'received': '2026-11-18', 'sender': 'Batzion Shlomi'},
                   'tabs': [{'id': 'body', 'lists': lists, 'content': contents[name]}]}
            for name, title in PARTS}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('document', type=Path)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    documents = extract(args.document)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, document in documents.items():
        (args.output_dir / (name + '.json')).write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n')
        print(name, len(document['tabs'][0]['content']), 'blocks')


if __name__ == '__main__':
    main()
