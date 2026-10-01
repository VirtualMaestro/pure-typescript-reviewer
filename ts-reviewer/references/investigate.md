purpose:
- state how to decide why flagged code is the way it is, before a fix changes it
- read it in investigate mode, and in auto mode between the scan and the fix

scope:
- `references/stack-cost.md` owns the form of each evidence source in this stack
- `references/fix-workflow.md` owns what fix mode does with each verdict, and what the report records
- this file names no language, no runtime, and no tool, so a second stack reuses it unchanged

read_first:
- a finding names a pattern and a defect, and a verdict says whether that defect is real at this site
- a source is a place that can say why the code is this way: the site, a test, the history, a decision record, the callers
- a source is decisive when it names the flagged behaviour, and silent when it does not mention it
- intent evidence names the flagged behaviour as wanted, and defect evidence shows the failure or names the opposite as wanted
- a record is a statement a reader of the code finds without the history: a comment, a doc, a decision record
- a test that asserts the flagged behaviour is intent evidence, and a test that asserts the opposite is defect evidence
- a history message is decisive only when it names the flagged behaviour, so "wip" or "fix" is silent
- the callers are defect evidence when 1 of them passes a value that reaches the failure the finding names
- the callers are decisive for `unreachable` only when every caller is known and none reaches the failure
- every caller is known only when nothing outside the repository can call the function
- a missing source is silent: a shallow history or a project with no tests yields no verdict
- `unknown` is a verdict, and it is not `defect`

verdicts:

| Verdict | Decided by | Next action |
|---|---|---|
| `defect` | defect evidence in the first decisive source, a caller reaching the failure included | the fix applies as the report states it |
| `deliberate-recorded` | intent evidence in a record | no change, and the finding closes citing the record |
| `deliberate-unrecorded` | intent evidence in a test or the history | a comment at the site citing the evidence, and no code change |
| `unreachable` | the callers: every one known, none reaching the failure | the fix applies when it adds no cost; a costly one keeps the code |
| `unknown` | no source decisive | the fix applies as for `defect`, and the report names the verdict |

workflow:
1. read the finding, its snippet, and the enclosing function in its current state
2. read the comment and the doc at the site and on the enclosing function
3. read the tests that call the function, and their assertions on the flagged behaviour
4. read the history of the exact lines: the change that introduced them, and its message
5. read the decision records for the flagged behaviour
6. trace the callers
7. stop at the first decisive source, and take its verdict from `verdicts`
8. write the verdict in 1 line with a pointer to the source that decided it, or `none` for `unknown`

forbidden_behaviors:
- do not read a source past the first decisive one: the order is the precedence
- do not decide `defect` because no source names the behaviour as wanted: that is `unknown`
- do not decide a deliberate verdict from the name of the function, the shape of the code, or what such code usually does
- do not change code while deciding a verdict: fix mode acts on it
- do not decide `unreachable` while a caller outside the repository can reach the function
