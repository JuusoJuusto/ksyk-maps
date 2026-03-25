#!/usr/bin/env python3
file_path = 'client/src/components/UltimateKSYKBuilder.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the exact lines to remove (lines 2400-2404, 0-indexed: 2399-2403)
output = []
skip_next = 0

for i, line in enumerate(lines):
    line_num = i + 1
    
    # Check if this is line 2400 (the comment line)
    if line_num == 2400 and 'MUCH BIGGER TEXT' in line:
        # Skip this line and the next 3 text lines
        skip_next = 4
        print(f"Skipping line {line_num}: {line.strip()}")
        continue
    
    if skip_next > 0:
        print(f"Skipping line {line_num}: {line.strip()}")
        skip_next -= 1
        continue
    
    output.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(output)

print(f"\nDone! Removed 4 lines. Total: {len(lines)} -> {len(output)}")
