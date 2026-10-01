from html.parser import HTMLParser

class TagChecker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
        self.main_wrapper_closed_at = None

    def handle_starttag(self, tag, attrs):
        if tag in ('br', 'hr', 'img', 'input', 'link', 'meta', 'source', 'area', 'base', 'col', 'embed', 'param', 'wbr', 'track'):
            return
        attrs_dict = dict(attrs)
        line = self.getpos()[0]
        self.stack.append((tag, attrs_dict, line))

    def handle_endtag(self, tag):
        if tag in ('br', 'hr', 'img', 'input', 'link', 'meta', 'source', 'area', 'base', 'col', 'embed', 'param', 'wbr', 'track'):
            return
        line = self.getpos()[0]
        if not self.stack:
            self.errors.append(f"Line {line}: Unexpected closing </{tag}> with empty stack")
            return
        
        # Check if matching top
        top_tag, top_attrs, top_line = self.stack[-1]
        if top_tag == tag:
            popped = self.stack.pop()
            if 'main-wrapper' in popped[1].get('class', ''):
                self.main_wrapper_closed_at = line
                print(f"*** MAIN-WRAPPER CLOSED AT LINE {line} ***")
        else:
            # Mismatched tag
            # search backwards
            found_idx = -1
            for idx in range(len(self.stack) - 1, -1, -1):
                if self.stack[idx][0] == tag:
                    found_idx = idx
                    break
            if found_idx != -1:
                # tags unclosed between found_idx and top
                unclosed = self.stack[found_idx + 1:]
                for u in unclosed:
                    if 'main-wrapper' in u[1].get('class', ''):
                        print(f"*** MAIN-WRAPPER FORCIBLY CLOSED BY </{tag}> AT LINE {line} ***")
                self.errors.append(f"Line {line}: </{tag}> closed tag from Line {self.stack[found_idx][2]}, leaving unclosed {[u[0] for u in unclosed]} from lines {[u[2] for u in unclosed]}")
                self.stack = self.stack[:found_idx]
            else:
                self.errors.append(f"Line {line}: Stray closing </{tag}> (no matching open tag)")

with open('pages/purchasing/materials_purchasing.html', 'r', encoding='utf-8') as f:
    html = f.read()

checker = TagChecker()
checker.feed(html)

print(f"\nTotal errors found: {len(checker.errors)}")
for err in checker.errors[:30]:
    print(err)
