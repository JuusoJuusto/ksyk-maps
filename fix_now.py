#!/usr/bin/env python3
import re

file_path = 'client/src/components/UltimateKSYKBuilder.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the duplicate large text section
pattern = r'\{/\* Building name with shadow - MUCH BIGGER TEXT \*/\}\s*<text[^>]*fontSize="80"[^>]*>.*?</text>\s*<text[^>]*fontSize="80"[^>]*>.*?</text>\s*<text[^>]*fontSize="32"[^>]*>.*?</text>\s*'

content = re.sub(pattern, '', content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed! Removed duplicate large text elements.")
