import { Pipe, PipeTransform } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

@Pipe({ name: 'telHighlight', standalone: true })
export class TelHighlightPipe implements PipeTransform {
    constructor(private sanitizer: DomSanitizer) { }

    transform(html: string | null | undefined): SafeHtml {
        if (!html) return '' as any;

        const doc = new DOMParser().parseFromString(`<div id="__root__">${html}</div>`, 'text/html');
        const root = doc.getElementById('__root__') as HTMLElement;

        const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: (node: Node) => {
                const val = node.nodeValue ?? '';
                if (!val.trim()) return NodeFilter.FILTER_REJECT;
                // skip text that lives inside an existing <a>
                let p: Node | null = node.parentNode;
                while (p) {
                    if ((p as HTMLElement).tagName === 'A') return NodeFilter.FILTER_REJECT;
                    p = p.parentNode;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const textNodes: Text[] = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

        for (const t of textNodes) {
            const frag = this.replacePhonesWithLinks(doc, t.nodeValue || '');
            if (frag) t.replaceWith(frag);
        }

        return this.sanitizer.bypassSecurityTrustHtml(root.innerHTML);
    }

    // Finds sequences made of digits, optional leading +, and dashes only.
    // We'll validate lengths and prefixes after matching.
    private static CANDIDATE_RE = /(?:(?:\+)?\d[\d-]*\d)/g;

    private replacePhonesWithLinks(doc: Document, text: string): DocumentFragment | null {
        const re = new RegExp(TelHighlightPipe.CANDIDATE_RE.source, 'g');
        let m: RegExpExecArray | null;
        let last = 0;
        const frag = doc.createDocumentFragment();
        let changed = false;

        while ((m = re.exec(text))) {
            const start = m.index;
            const end = re.lastIndex;

            // Word-ish boundaries so we don't grab parts of larger tokens
            const prev = start > 0 ? text[start - 1] : ' ';
            const next = end < text.length ? text[end] : ' ';
            if (/[0-9+]/.test(prev) || /[0-9]/.test(next)) continue;

            const raw = m[0];

            // Only allow digits, dashes, optional single leading '+'
            if (!/^\+?\d[\d-]*\d$/.test(raw)) continue;

            const e164 = this.toE164IfValidByYourRules(raw);
            if (!e164) continue;

            if (start > last) frag.append(text.slice(last, start));
            const a = doc.createElement('a');
            a.setAttribute('href', `tel:${e164}`);
            a.textContent = raw;
            frag.append(a);
            last = end;
            changed = true;
        }

        if (!changed) return null;
        if (last < text.length) frag.append(text.slice(last));
        return frag;
    }

    /**
     * Accept exactly these (dashes allowed anywhere between digits):
     * 1) +972XXXXXXXXX (12 digits after removing dashes; must start with +972)
     * 2) 0XXXXXXXXX    (10 digits after removing dashes; must start with 05 for mobile)
     * 3) 0XXXXXXXX     ( 9 digits after removing dashes; must start with 0[23489] for landlines)
     * Returns E.164 "+972..." or null if invalid.
     */
    private toE164IfValidByYourRules(input: string): string | null {
        const trimmed = input.trim();

        // Keep a leading + if present; remove all dashes everywhere else
        const hasPlus = trimmed.startsWith('+');
        const digitsOnly = (hasPlus ? '+' : '') + trimmed.replace(/[^\d]/g, '');

        // 1) +972XXXXXXXXX (exactly + and 12 digits, where first three are 972)
        if (/^\+972\d{9}$/.test(digitsOnly)) {
            // normalize: remove dashes already; tel should be "+972XXXXXXXXX"
            return digitsOnly;
        }

        // Remove non-digits for local formats
        const local = digitsOnly.replace(/\D/g, '');

        // 2) 0546510255 -> 10 digits, must be mobile 05XXXXXXXX
        if (/^05\d{8}$/.test(local)) {
            return `+972${local.slice(1)}`; // strip the trunk 0
        }

        // 3) 089740454 -> 9 digits, must be landline 0[23489]XXXXXXX
        if (/^0[23489]\d{7}$/.test(local)) {
            return `+972${local.slice(1)}`; // strip the trunk 0
        }

        return null;
    }
}