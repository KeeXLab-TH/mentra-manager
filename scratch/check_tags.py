from html.parser import HTMLParser

class TagChecker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
        self.void_elements = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

    def handle_starttag(self, tag, attrs):
        if tag.lower() not in self.void_elements:
            self.stack.append((tag.lower(), self.getpos()))

    def handle_endtag(self, tag):
        t = tag.lower()
        if t in self.void_elements:
            return
        if not self.stack:
            self.errors.append(f"Unexpected closing tag </{t}> at line {self.getpos()[0]}")
            return
        last, pos = self.stack[-1]
        if last == t:
            self.stack.pop()
        else:
            # find if it matches an earlier tag
            for i in range(len(self.stack) - 1, -1, -1):
                if self.stack[i][0] == t:
                    # popped everything above it
                    unclosed = self.stack[i+1:]
                    self.errors.append(f"Mismatched closing </{t}> at line {self.getpos()[0]}, unclosed before it: {[x[0] + '@' + str(x[1][0]) for x in unclosed]}")
                    self.stack = self.stack[:i]
                    return
            self.errors.append(f"Unmatched closing </{t}> at line {self.getpos()[0]} (expected </{last}> from line {pos[0]})")

checker = TagChecker()
with open('pages/purchasing/materials_purchasing.html', 'r', encoding='utf-8') as f:
    checker.feed(f.read())

print(f"Total errors: {len(checker.errors)}")
for err in checker.errors[:20]:
    print("  ", err)

if checker.stack:
    print(f"Unclosed tags at EOF: {len(checker.stack)}")
    for tag, pos in checker.stack[-10:]:
        print(f"   <{tag}> at line {pos[0]}")
