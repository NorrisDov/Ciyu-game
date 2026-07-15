# Validate choices completeness in data.py - CORRECTED LOGIC
# The engine:
# - Checks current_built.startswith(correct_seq) for victory
# - Checks current_built IN wrong_path dict for sigh triggers
# - wrong_path keys are DIVERGENCE POINTS, not necessarily leaf paths
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

exec(open("data.py", encoding="utf-8").read())

def enumerate_step_paths(choices_dict, starter):
    """
    Enumerate ALL partial paths that the player could construct step-by-step
    through the choices tree. This includes intermediate paths, not just leaves.
    Returns set of all possible partial paths.
    """
    all_paths = set()

    def walk(node, prefix):
        """
        node: current choices node (dict of {char: {weight: n, next: {...}}} )
        prefix: current built string so far (including starter)
        """
        all_paths.add(prefix)
        if not node or not isinstance(node, dict):
            return
        for char, child in node.items():
            full = prefix + char
            all_paths.add(full)
            if isinstance(child, dict) and 'next' in child and child.get('next'):
                walk(child['next'], full)
            # if child has no 'next' or has empty 'next', it's a leaf
            # already added above

    walk(choices_dict, starter)
    return all_paths

def check_conversation(convo):
    cid = convo['id']
    choices = convo['choices']
    starter = convo.get('starter', '')
    correct_seq = convo.get('correct_seq', [])
    correct_str = ''.join(correct_seq)
    wrong_paths = set(convo.get('wrong_path', {}).keys())
    sighs = set(convo.get('sighs', {}).keys())

    all_paths = enumerate_step_paths(choices, starter)

    issues = []

    # 1. Every wrong_path key should be reachable step-by-step
    for wp in sorted(wrong_paths):
        if wp not in all_paths:
            issues.append(f'UNREACHABLE wrong_path: "{wp}"')

    # 2. Every wrong_path key should have a sigh
    for wp in sorted(wrong_paths):
        if wp not in sighs:
            issues.append(f'MISSING sighs for: "{wp}"')

    # 3. Every sigh key should correspond to a wrong_path
    for s in sorted(sighs):
        if s not in wrong_paths:
            issues.append(f'ORPHAN sighs (no wrong_path): "{s}"')

    # 4. correct_seq should be reachable step-by-step (prefix match)
    # The prefix match means current_built.startswith(correct_str)
    # So correct_str itself must be reachable, or a longer path that starts with it
    if correct_str not in all_paths:
        # Check if any path starts with correct_str
        matches = [p for p in all_paths if p.startswith(correct_str)]
        if not matches:
            issues.append(f'correct_seq "{correct_str}" NOT REACHABLE (no prefix match)')
            issues.append(f'  All paths: {sorted(all_paths)}')
        elif all(len(m) > len(correct_str) for m in matches):
            # All matches are longer - correct_str itself is not a step,
            # but the terminal char makes it reachable at next step
            # This is fine if the engine continues after getting terminal options
            pass

    # 5. Verify branches are complete:
    # For each divergence from correct, there must be a wrong_path that triggers
    # before or at the divergence point.
    for p in sorted(all_paths):
        if p == correct_str or p.startswith(correct_str) or correct_str.startswith(p):
            continue  # on correct path (intermediate or terminal)
        # This path diverges from correct. Is it covered by a wrong_path?
        covered = False
        for wp in wrong_paths:
            if p.startswith(wp):
                covered = True
                break
        if not covered:
            # Maybe it's an intermediate step toward a wrong_path
            # Check if any wrong_path starts with p (meaning p is a prefix of wrong_path)
            for wp in wrong_paths:
                if wp.startswith(p):
                    covered = True
                    break
        if not covered:
            issues.append(f'DIVERGENT path not covered: "{p}"')

    return issues, all_paths, correct_str, wrong_paths

print("="*60)
print("=== CONVERSATION AUDIT (Corrected Logic) ===")
print("="*60)

all_convos = ACT1_CONSULT + ACT2_CONSULT

total_issues = 0
for convo in all_convos:
    cid = convo['id']
    issues, all_paths, correct_str, wrong_paths = check_conversation(convo)

    print(f"\n--- {cid} (starter='{convo.get('starter','')}', correct='{correct_str}') ---")
    print(f"  Total step-paths: {len(all_paths)}")
    print(f"  Wrong paths: {len(wrong_paths)}")

    if issues:
        total_issues += len(issues)
        for i in issues:
            print(f"  [ISSUE] {i}")
    else:
        # Check if correct_str is itself reachable or has longer matches
        longer_ok = any(p.startswith(correct_str) for p in all_paths)
        print(f"  [OK] All paths covered. correct_seq reachable: {correct_str in all_paths or longer_ok}")

print(f"\n{'='*60}")
print(f"TOTAL ISSUES: {total_issues}")
print(f"{'='*60}")