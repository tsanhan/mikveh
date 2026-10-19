#!/usr/bin/env python3
"""Import/check topic content against snapshots read from the review Google Docs.

Snapshot fields: document id/url/revision, tabs[].content (paragraph text, bold,
style, bullet, or table rows/cells), and tabs[].lists from documents.get.
Only whitespace is normalized; wording, punctuation and table markers are kept.
Refresh the five snapshots from Google Docs before importing a new review.
"""

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOPICS = ROOT / 'src/assets/data/topics.json'
SOURCE_DIR = ROOT / 'content/google-docs'
APPROACHES = {'chabad': 'chabad', 'ovadia': 'sfarad_ovadia', 'eliyahu': 'sfarad_mordechai_eliyahu'}
SECTIONS = [
    ('ktamim', None),
    ('harchakot', 'דיני הרחקות:'),
    ('shiva-nekyim', 'הפסק טהרה ושבעה נקיים:'),
    ('dinei-hafifa', '(הלכות טבילה:)'),
    ('dinei-chatsitsa', 'דיני חציצה:'),
    ('hilchot-tvila', 'זמן הטבילה'),
    ('prisha-samuch-leveset', 'חישובי ווסתות:'),
    ('dinei-meuberet-veyoledet', 'דיני מעוברת ויולדת'),
]


def whitespace(text):
    return re.sub(r'\s+', ' ', text).strip()


def convert_document(source):
    """Keep every nonempty paragraph and every table cell, in source order."""
    blocks = []
    for tab in source['tabs']:
        counters = {}
        for item in tab['content']:
            if item['type'] == 'table':
                rows = []
                for row in item['rows']:
                    cells = []
                    for cell in row:
                        assert all(p['type'] == 'paragraph' for p in cell), 'Nested tables need explicit support'
                        cells.append(whitespace(' '.join(p['text'] for p in cell)))
                    rows.append(cells)
                assert rows and all(len(row) == 3 for row in rows), 'Expected three-column review tables'
                blocks.append({'type': 'table', 'data': rows})
                continue
            assert item['type'] == 'paragraph', item['type']
            text = whitespace(item['text'])
            if not text:
                continue
            bullet = item.get('bullet')
            if bullet:
                level = bullet.get('nestingLevel', 0)
                definition = tab['lists'][bullet['listId']]['listProperties']['nestingLevels'][level]
                assert level == 0 and definition['glyphType'] == 'DECIMAL', 'Unsupported native list style'
                counter = counters.get(bullet['listId'], definition.get('startNumber', 1))
                counters[bullet['listId']] = counter + 1
                text = definition['glyphFormat'].replace('%0', str(counter)) + ' ' + text
            named_style = item.get('style', {}).get('namedStyleType', '')
            kind = ('headline' if named_style.startswith('HEADING_')
                    else 'bold' if item.get('bold')
                    else 'text')
            blocks.append({'type': kind, 'data': text})
    return blocks


def split_sections(blocks, name):
    def heading_text(text):
        return whitespace(text).strip('():').strip()

    positions = [0]
    for _, heading in SECTIONS[1:]:
        matches = [i for i in range(positions[-1] + 1, len(blocks))
                   if blocks[i]['type'] != 'table'
                   and heading_text(blocks[i]['data']) == heading_text(heading)]
        assert matches, (name, heading, 'Section heading not found')
        # Reviewers may remove heading punctuation. Some chapters repeat their
        # title below the opening heading; the first occurrence starts the topic.
        positions.append(matches[0])
    positions.append(len(blocks))
    return {topic: blocks[start:end]
            for (topic, _), start, end in zip(SECTIONS, positions, positions[1:])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=SOURCE_DIR)
    parser.add_argument('--write', action='store_true', help='Apply the source documents to topics.json')
    args = parser.parse_args()
    topics = json.loads(TOPICS.read_text())
    by_id = {topic['id']: topic for topic in topics}
    expected = {}
    summaries = {}
    for name in [*APPROACHES, 'intro', 'stories']:
        source = json.loads((args.source_dir / (name + '.json')).read_text())
        blocks = convert_document(source)
        summaries[name] = {
            'document_id': source['id'], 'url': source['url'], 'revision': source['revision'],
            'paragraphs': sum(b['type'] != 'table' for b in blocks),
            'table_rows': [len(b['data']) for b in blocks if b['type'] == 'table'],
        }
        if name in APPROACHES:
            key = APPROACHES[name]
            for topic, content in split_sections(blocks, name).items():
                expected[(topic, key)] = content
        else:
            topic = 'odot' if name == 'intro' else 'sipurim'
            for key in APPROACHES.values():
                expected[(topic, key)] = blocks
    mismatches = [(topic, key) for (topic, key), blocks in expected.items()
                  if by_id[topic]['content'][key] != blocks]
    if args.write:
        for (topic, key), blocks in expected.items():
            by_id[topic]['content'][key] = blocks
        TOPICS.write_text(json.dumps(topics, ensure_ascii=False, indent=2) + '\n')
    elif mismatches:
        raise SystemExit('Content differs from review sources: ' + repr(mismatches))
    for name, summary in summaries.items():
        print(f"{name}: {summary['paragraphs']} paragraphs; table rows {summary['table_rows']}; exact content match")
    print(f'{len(expected)} topic/approach sections verified (whitespace normalization only).')


if __name__ == '__main__':
    main()
