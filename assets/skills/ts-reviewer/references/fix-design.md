purpose:
- state how to design a fix before applying it, when the reported fix adds a cost on a hot path
- read it in fix mode before the first cost-bearing finding

scope:
- `references/stack-cost.md` owns the hot marker, the cost kinds, the form of each rung, and the measurement command
- `references/fix-workflow.md` owns the fix loop, the snapshots, the verification, when the measurement runs, and what the report records
- this file names no language, no runtime, and no tool, so a second stack reuses it unchanged

read_first:
- a hot path is code the hot marker covers, or a loop body no marker covers
- a cost is what a fix adds to every call or every iteration, and the current code does not pay
- a cost-bearing finding sits on a hot path and its reported fix adds a cost, and the report marks it
- the reported fix is 1 candidate, written during the scan before anyone checked what it costs
- a rung is a place to pay the cost, and the ladder orders the rungs from never to every iteration
- rungs 2..4 each pay 1 time, ordered by how much they change the code: boundary moves the cost, hoist moves a line, reuse adds module state
- a rung closes a finding when nothing reaches the defect the finding names any longer, and a rescan would not raise it again
- a rung 1..4 closes a finding only when the place it pays the cost lies outside the marker or the loop that makes the path hot
- rungs 5 and 6 pay inside the hot path, in a development build or on the rare path only
- a value from outside the process has no precondition a caller can hold, so rung 5 never closes a finding on it

ladder:

| Rung | Name | When the fix pays the cost |
|---|---|---|
| 1 | remove | never: the types make the case unrepresentable, and the check or the copy has nothing left to do |
| 2 | boundary | 1 time, where the value enters the module, outside the hot path |
| 3 | hoist | 1 time, before the loop, or 1 time at module load |
| 4 | reuse | 1 time, at setup: a buffer or an object the module owns serves every iteration, and only a refill remains |
| 5 | dev-only | in a development build only: an assertion plus a precondition the callers hold, stated at the function |
| 6 | split | on the rare path only: the common case takes a path that skips the cost |
| 7 | in-place | on every iteration: the reported fix as written |

workflow:
1. read the finding, its snippet, and the enclosing function in its current state
2. name the cost kind the reported fix adds, and the marker or the loop that makes the path hot
3. walk the ladder from rung 1, and stop at the first rung that closes the finding
4. state in 1 line per rung why each rung above the chosen one does not close the finding
5. apply a rung 1..6 design in place of the reported fix
6. write the 2 variants of a rung 7 finding: the reported fix with its cost kind, and the current code with the defect it keeps
7. hand a rung 7 finding to the operator with both variants, and leave its code untouched until the operator picks 1

forbidden_behaviors:
- do not apply the reported fix on a hot path before walking the ladder
- do not pick rung 7 while a rung above it closes the finding
- do not count a rung as closing the finding when it leaves the defect reachable
- do not write "no regression" or "no impact" without a measured number beside it
- do not design a fix for a finding that is not cost-bearing: the reported fix applies as written
- do not leave a cost-bearing finding without a design: a rung, a deliberate verdict, or the operator's choice closes every one
- do not close a finding by documenting the flagged pattern as intended without a deliberate verdict: the operator picks that variant at rung 7
