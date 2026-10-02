import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
log_file = r'C:\Users\Thanapoom\.gemini\antigravity-ide\brain\70ec2e45-c0c1-44b3-9741-1863e174229b\.system_generated\logs\transcript.jsonl'
with open(log_file, 'r', encoding='utf-8') as f:
    for line in f:
        d = json.loads(line)
        idx = d.get('step_index')
        if 2280 <= idx <= 2304:
            print(f"STEP {idx} keys:", d.keys(), d.get('type'))
            if 'tool_calls' in d:
                print("  tool_calls:", d['tool_calls'])
            if 'tool' in d or 'function' in d:
                print("  tool:", d.get('tool'), d.get('function'))
            if 'call' in d:
                print("  call:", d.get('call'))
