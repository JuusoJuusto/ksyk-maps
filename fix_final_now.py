#!/usr/bin/env python3
file_path = 'client/src/components/UltimateKSYKBuilder.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The issue is the polygon tag is not closed before the comment
# We need to find and remove lines 2400-2403 (the duplicate text elements)

lines = content.split('\n')

# Find the line with "MUCH BIGGER TEXT" comment
for i, line in enumerate(lines):
    if 'MUCH BIGGER TEXT' in line and i > 2390:
        print(f"Found at line {i+1}: {line.strip()}")
        # Remove this line and the next 3 lines (the 3 text elements)
        del lines[i:i+4]
        print(f"Removed lines {i+1} to {i+4}")
        break

content = '\n'.join(lines)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
