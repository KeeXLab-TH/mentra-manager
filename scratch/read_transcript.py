import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

log_file = r'C:\Users\Thanapoom\.gemini\antigravity-ide\brain\70ec2e45-c0c1-44b3-9741-1863e174229b\.system_generated\logs\transcript.jsonl'
with open(log_file, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        idx = data.get('step_index', 0)
        if idx in [2272, 2278, 2284, 2294, 2300]:
            print(f"=== STEP {idx} ===")
            tc = data.get('tool_calls', [])
            for call in tc:
                args = call.get('arguments', {})
                print("Instruction:", args.get('Instruction'))
                print("Description:", args.get('Description'))
                if 'ReplacementChunks' in args:
                    for c in args['ReplacementChunks']:
                        print("TARGET:\n", c.get('TargetContent'))
                        print("REPL:\n", c.get('ReplacementContent'))
                if 'ReplacementContent' in args:
                    print("TARGET:\n", args.get('TargetContent'))
                    print("REPL:\n", args.get('ReplacementContent'))
