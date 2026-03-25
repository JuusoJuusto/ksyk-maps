#!/usr/bin/env python3
"""Fix UltimateKSYKBuilder.tsx by removing duplicate text elements"""

def fix_builder():
    file_path = 'client/src/components/UltimateKSYKBuilder.tsx'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find and remove lines 2399-2403 (0-indexed: 2398-2402)
    # These are the duplicate large text elements
    output_lines = []
    skip_lines = set(range(2398, 2403))  # Lines 2399-2403 in 1-indexed
    
    for i, line in enumerate(lines):
        if i not in skip_lines:
            output_lines.append(line)
        else:
            print(f"Removing line {i+1}: {line.rstrip()}")
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(output_lines)
    
    print(f"\nFixed! Removed {len(skip_lines)} duplicate lines.")
    print(f"Total lines: {len(lines)} -> {len(output_lines)}")

if __name__ == '__main__':
    fix_builder()
