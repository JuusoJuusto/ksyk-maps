with open('client/src/components/UltimateKSYKBuilder.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Delete line 2399 (0-indexed: 2398) - the MUCH BIGGER TEXT comment
new_lines = lines[:2398] + lines[2399:]

with open('client/src/components/UltimateKSYKBuilder.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed!")
