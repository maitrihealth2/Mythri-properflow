import os
import re

ignore_dirs = {'.git', 'venv', '.venv', 'node_modules', '__pycache__', 'dist', 'build', '.idea', '.vscode'}

file_patterns = [
    r'^test_.*\.py$',
    r'^.*_test\.py$',
    r'^.*_tests\.py$',
    r'^validate_.*\.py$',
    r'^verify_.*\.py$',
    r'^benchmark_.*\.py$',
    r'^profile_.*\.py$',
    r'^audit_.*\.py$',
    r'^forensic_.*\.py$',
    r'^trace_.*\.py$',
    r'^load_test\.py$',
    r'^stress_test\.py$',
    r'^run_audit\.py$',
    r'^.*scratch.*\.py$',
    r'^.*temp.*\.py$',
    r'^.*debug.*\.py$',
    r'^.*experimental.*\.py$'
]

dir_patterns = [
    r'^tests$',
    r'^testing$',
    r'^scratch$',
    r'^temp$',
    r'^debug$',
    r'^profiling$',
    r'^benchmarks$',
    r'^verification$'
]

file_regexes = [re.compile(p, re.IGNORECASE) for p in file_patterns]
dir_regexes = [re.compile(p, re.IGNORECASE) for p in dir_patterns]

matched_files = []
matched_dirs = []

base_dir = r"d:\Copy\v3\Maitri New"

for root, dirs, files in os.walk(base_dir):
    # modify dirs in-place to prune ignored directories
    dirs[:] = [d for d in dirs if d not in ignore_dirs]
    
    # check directories
    for d in dirs:
        for r in dir_regexes:
            if r.match(d):
                matched_dirs.append(os.path.relpath(os.path.join(root, d), base_dir))
                break
                
    # check files
    for f in files:
        for r in file_regexes:
            if r.match(f):
                matched_files.append(os.path.relpath(os.path.join(root, f), base_dir))
                break

print("=== MATCHED DIRS ===")
for d in matched_dirs:
    print(d)

print("\n=== MATCHED FILES ===")
for f in matched_files:
    print(f)
