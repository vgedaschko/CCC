"""Word counter and checker for docs/02_speaking_texts.md.
Usage: python3 -I docs/tools/count_words.py docs/02_speaking_texts.md deck/slides/big-d.html [--write]
Counts spoken words on the default path per slide and role (section 4 only),
checks rates, sentence lengths, click counts and on-screen quotes, and with
--write fills the generated tables and the word figures in each header line."""
import re, sys, html as H

doc_path, deck_path = sys.argv[1], sys.argv[2]
WRITE = '--write' in sys.argv
doc = open(doc_path, encoding='utf-8').read()
deck = open(deck_path, encoding='utf-8').read()

# ---------- deck: clicks and text per slide ----------
sec_re = re.compile(r'<section class="slide[^"]*" id="([^"]+)"(.*?)(?=<section class="slide|</main>|\Z)', re.S)
deck_clicks, deck_text = {}, {}
for m in sec_re.finditer(deck):
    sid, body = m.group(1), m.group(2)
    steps = [int(x) for x in re.findall(r'data-step="(\d+)"', body)]
    deck_clicks[sid] = max(steps) if steps else 0
    t = re.sub(r'<(style|script)\b.*?</\1>', ' ', body, flags=re.S)
    t = re.sub(r'<[^>]+>', '', t)
    t = H.unescape(t)
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r'\s+([”’?!.,])', r'\1', t)
    deck_text[sid] = t

# ---------- doc: section 4 slides ----------
s4 = re.search(r'^## 4\..*?(?=^## 5\.)', doc, flags=re.S | re.M).group(0)
slides = re.split(r'^### ', s4, flags=re.M)[1:]

def tsec(s):
    m, s2 = s.split(':')
    return int(m) * 60 + int(s2)

def fmt(sec):
    sec = int(round(sec))
    return f'{sec // 60}:{sec % 60:02d}'

def slot_words(content):
    c = content.strip()
    m = re.search(r'≤\s*(\d+)\s*words?', c)
    if m: return int(m.group(1))
    if re.search(r'MEMBER \d: name\b', c): return 2
    if 'm:ss' in c: return 3
    if 'one sentence' in c: return 10
    if re.match(r'^[A-Z][A-Z0-9 ]+:', c): c = c.split(':', 1)[1]
    c = c.split(' / ')[0]
    return len([w for w in re.split(r'[\s—–]+', c) if re.search(r'[A-Za-z0-9]', w)])

def strip_marks(s):
    s = re.sub(r'(?<!\*)\*\[[^\]]*\]\*(?!\*)', ' ', s)          # *[stage]*
    s = re.sub(r'\*\((?:[^()]|\([^()]*\))*\)\*', ' ', s)        # *(screen)*
    s = re.sub(r'^\*\*(A|B)( \([^)]*\))?:\*\*', ' ', s.strip())  # role label
    return s

def words_of(s):
    out = 0
    def repl(m):
        nonlocal out
        out += slot_words(m.group(1)); return ' '
    s = re.sub(r'\[([^\]]*)\]', repl, s)
    s = s.replace('**', ' ').replace('✂', ' ')
    toks = [w for w in re.split(r'[\s—–…]+', s) if re.search(r'[A-Za-z0-9]', w)]
    return out + len(toks)

def sentences(s):
    s = s.replace('**', '')
    out = []
    for chunk in re.split(r'(\[[^\]]*≤[^\]]*\])', s.strip()):
        if chunk.startswith('[') and '≤' in chunk:
            out.append(chunk); continue
        out += [p for p in re.split(r'(?<=[.!?…])[”’"]?\s+(?=[A-Z“‘✂\[])', chunk.strip()) if p.strip()]
    return out

rows, problems = [], []
for sec in slides:
    lines = [l for l in sec.split('\n') if l.strip()]  # blank lines between paragraphs carry no meaning
    title = lines[0].strip()
    sid = title.split(' ')[0].lower()
    head = lines[1]
    m = re.search(r'block (\d+:\d+).*?= talk (\d+:\d+) \+ room (\d+:\d+)', head)
    block, talk, room = (tsec(m.group(1)), tsec(m.group(2)), tsec(m.group(3))) if m else (0, 0, 0)
    if m and block != talk + room and 'slack' not in head:
        problems.append(f'{sid}: block != talk + room')
    rm = re.match(r'(Role (A|B)|Member (\d))', head)
    default = rm.group(2) if rm and rm.group(2) else (f'M{rm.group(3)}' if rm and rm.group(3) else None)
    budget = re.search(r'budget (\d+) words', head)
    clicks_doc = len([l for l in lines if re.match(r'^\*\*Click \d+\*\*', l)])
    if sid in deck_clicks and sid not in ('s16', 's17', 's17b') and clicks_doc != deck_clicks[sid]:
        problems.append(f'{sid}: doc clicks {clicks_doc} vs deck {deck_clicks[sid]}')
    per, cut, mode, role = {}, 0, None, default
    spoken_txt = []
    for l in lines[2:]:
        st = l.strip()
        if re.match(r'^\*\*(On entry|Click \d+|Before the jump)\*\*', st):
            mode = 'sp'; role = role or default
            st = re.sub(r'^\*\*(On entry|Click \d+|Before the jump)\*\*\s*—?\s*', '', st)
        elif st.startswith('**Hand-over'):
            mode = None
            q = re.search(r'\*\*"([^"]+)"\*\*', st)
            hm = re.search(r'2p: (A|B|Member \d)', st)
            if q:
                who = hm.group(1) if hm else role
                who = who if who in ('A', 'B') else 'M' + who[-1]
                n = words_of(q.group(1))
                per[who] = per.get(who, 0) + n
                spoken_txt.append(q.group(1))
            continue
        elif re.match(r'^\*\*(Branch|If you blank|Memory key)', st) or st.startswith('---'):
            mode = None; continue
        if mode != 'sp' or not st:
            continue
        lm = re.match(r'^\*\*(A|B)( \([^)]*\))?:\*\*', st)
        if lm: role = lm.group(1)
        body = strip_marks(st)
        n = words_of(body)
        per[role] = per.get(role, 0) + n
        spoken_txt.append(body)
        for snt in sentences(body):
            k = words_of(snt)
            if snt.strip().startswith('✂'): cut += k
            if k > 20: problems.append(f'{sid}: sentence {k} words: {snt[:70]}')
            elif k > 14: problems.append(f'{sid}: (long {k}) {snt[:70]}')
    total = sum(per.values())
    if budget:
        total = int(budget.group(1)); per = {default: total}
    rate = total / talk if talk else 0
    if rate > 2.0001: problems.append(f'{sid}: RATE {rate:.2f}')
    # quotes check
    if sid in deck_text:
        nq = len(re.findall(r'“[^”]*”', ' '.join(spoken_txt)))
        print(f'   quotes checked {sid}: {nq}')
        for q in re.findall(r'“[^”]*”', ' '.join(spoken_txt)):
            inner = q
            if inner not in deck_text[sid] and inner[1:-1] not in deck_text[sid]:
                problems.append(f'{sid}: QUOTE not on slide: {q}')
    rows.append(dict(sid=sid, title=title, head=head, block=block, talk=talk, room=room,
                     per=per, total=total, rate=rate, cut=cut, budget=bool(budget), default=default))

for p in problems: print('!!', p)
print()
tot = {}
for r in rows:
    if r['total'] == 0: continue
    if r['sid'] in ('s02m', 's14m', 's17b'):
        print(f"{r['sid']:5s} (variant, not in totals) words {r['total']} rate {r['rate']:.2f}"); continue
    for k, v in r['per'].items():
        tot.setdefault(k, [0, 0.0])
        tot[k][0] += v
        tot[k][1] += r['talk'] * v / r['total'] if r['total'] else 0
    print(f"{r['sid']:5s} blk {fmt(r['block'])} talk {fmt(r['talk'])} room {fmt(r['room'])} words {r['total']:4d} {r['per']} rate {r['rate']:.2f} cut {r['cut']}")
print()
for k, (w, t) in sorted(tot.items()):
    print(f'{k}: words {w}  speaking at 2.0 w/s {fmt(w / 2)}  talk budget {fmt(t)}')

# ---------- write back ----------
if WRITE:
    new = doc
    # header word figures
    for r in rows:
        if r['budget'] or r['total'] == 0: continue
        per = r['per']
        if len([k for k in per if per[k]]) > 1:
            fig = f"{r['total']} words (" + ' · '.join(f'{k} {per[k]}' for k in ('A', 'B') if per.get(k)) + ')'
        else:
            fig = f"{r['total']} words"
        newhead = re.sub(r'\d+ words( \((?:A|B) \d+ · (?:A|B) \d+\))?', fig, r['head'], count=1)
        new = new.replace('\n' + r['head'] + '\n', '\n' + newhead + '\n', 1)
    # table 2 (roles per slide) and table 7
    def role_cell(r):
        c = r['head'].split(' · ')[0].replace('Role: ', '').replace('Role ', '')
        return c + (' · variant, not in totals' if r['sid'] in ('s02m', 's14m') else '')
    t2 = ['| Slide | Speaker, 2 presenters (3p in brackets) | Block | Talk | Room | Words | w/s |', '|---|---|---|---|---|---|---|']
    for r in rows:
        if r['sid'] in ('s17b',): continue
        w = f"{r['total']}" + (' (budget)' if r['budget'] else '')
        if len([k for k in r['per'] if r['per'][k]]) > 1 and not r['budget']:
            w += ' (' + ' · '.join(f'{k} {r["per"][k]}' for k in ('A', 'B') if r['per'].get(k)) + ')'
        rate = f"{r['rate']:.2f}" if r['talk'] else '—'
        t2.append(f"| {r['title'].split(' · ')[0]} | {role_cell(r)} | {fmt(r['block'])} | {fmt(r['talk'])} | {fmt(r['room'])} | {w} | {rate} |")
    new = re.sub(r'(<!-- BEGIN:table2 -->\n).*?(\n<!-- END:table2 -->)', lambda m: m.group(1) + '\n'.join(t2) + m.group(2), new, flags=re.S)
    t7 = ['| Slide | A words | B words | Member words | Total | Talk | w/s | ✂ words (≈ s saved) |', '|---|---|---|---|---|---|---|---|']
    for r in rows:
        if r['sid'] in ('s17b',): continue
        a, b = r['per'].get('A', 0), r['per'].get('B', 0)
        mw = sum(v for k, v in r['per'].items() if k and k.startswith('M'))
        rate = f"{r['rate']:.2f}" if r['talk'] else '—'
        cut = f"{r['cut']} (≈ {r['cut'] / 2:.0f} s)" if r['cut'] else '—'
        t7.append(f"| {r['title'].split(' · ')[0]} | {a or '—'} | {b or '—'} | {mw or '—'} | {r['total']} | {fmt(r['talk'])} | {rate} | {cut} |")
    PART2 = ('s15', 's16', 's17', 's18', 's19', 's20')
    agg = {'A': [0, 0, 0.0], 'B': [0, 0, 0.0]}   # part1 words, part2 words, talk budget s
    cuts = 0; mtot = 0
    for r in rows:
        if r['sid'] in ('s02m', 's14m', 's17b') or not r['total']: continue
        cuts += r['cut']
        for k in ('A', 'B'):
            v = r['per'].get(k, 0)
            if not v: continue
            agg[k][1 if r['sid'] in PART2 else 0] += v
            agg[k][2] += r['talk'] * v / r['total']
    ta = sum(r['per'].get('A', 0) for r in rows if r['sid'] not in ('s02m', 's14m', 's17b'))
    tb = sum(r['per'].get('B', 0) for r in rows if r['sid'] not in ('s02m', 's14m', 's17b'))
    t7.append(f"| **Total (default path; variants and S17b left out)** | **{ta}** | **{tb}** | **540** | **{ta + tb + 540}** | | | **{cuts} (≈ {fmt(cuts / 2)})** |")
    script = {'A': 14 * 60 + 57, 'B': 15 * 60 + 23}
    bal = ['| Role | Part I words | Part II shared words | Own P slide (budget) | Total words | Speaking time at 120 wpm | Talk-time budget (block − room) | Script §1.3 net | Speaking time vs §1.3 |', '|---|---|---|---|---|---|---|---|---|']
    for k in ('A', 'B'):
        p1, p2, tb_ = agg[k]
        tw = p1 + p2 + 270
        sp = tw / 2; bud = tb_ + 135
        bal.append(f"| {k} | {p1} | {p2} | 270 | {tw} | {fmt(sp)} | {fmt(bud)} | {fmt(script[k])} | {100 * sp / script[k]:.0f} % |")
    new = re.sub(r'(<!-- BEGIN:balance -->\n).*?(\n<!-- END:balance -->)', lambda m: m.group(1) + '\n'.join(bal) + m.group(2), new, flags=re.S)
    new = re.sub(r'(<!-- BEGIN:table7 -->\n).*?(\n<!-- END:table7 -->)', lambda m: m.group(1) + '\n'.join(t7) + m.group(2), new, flags=re.S)
    open(doc_path, 'w', encoding='utf-8').write(new)
    print('written')
