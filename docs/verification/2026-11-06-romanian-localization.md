# Romanian localization and regional numbers — verification

Date: 2026-11-06 (Asia/Shanghai). Initial PR verification: `6c7a480`. Base: `5350bf8bdef62b28c7e4621f5c68240dd3139fce` (`origin/master`).

## Scope and environment

The change adds Romanian messages, regional numbers and RON/MDL/leu/lei recognition, a persisted number-format override, localized output/copying, and a regional demo. Runtime behavior changed, so verification used the actual unpacked Manifest V3 extension and mouse/keyboard selection, rather than isolated parser copies.

- macOS 26.6.2, arm64; Node 26.7.0; Playwright 1.65.0.
- Chrome for Testing 158.0.8127.18, headless, separate temporary profiles.
- Browser/application regions: `en-US`, `ro-RO`, `ro-MD`, `de-DE`.
- On macOS, Playwright's `locale` changes page locale but does not select the application's extension message catalog. A temporary executable wrapper passed `-AppleLanguages "(ro-RO)"` (and the other regions) to Chrome. Playwright's default `about:blank` argument was omitted because Cocoa's language argument is also interpreted as a startup target by headless Chrome. No system language or user profile was changed.
- Test fixtures, tools, browser downloads, profiles and screenshots were confined to a task directory under `$TMPDIR`. Only this report is retained.

## Results

- Four-region end-to-end matrix: **126 checks passed**. Real extension activation/injection on a local HTTP page, selection, bottom-edge SUM, localized single-copy and double-copy including statistics, Escape, live format changes and storage/reload were exercised. Romanian configuration, help and demo loading also passed for `ro-RO` and `ro-MD`.
- Final targeted checks: **7 checks passed**: UTF-8 and Romanian configuration; localized/styled demo; row/column totals and currency tooltip; signed currency prefixes; last-digit highlights with a currency suffix; selection cleanup; regional help text.
- Visual review: Romanian configuration, diacritics/checkmarks, localized demo badges and regional table inspected. An existing duplicate English footer and missing UTF-8 declaration were corrected. Existing English-formatted demo datasets now explicitly declare their data language.
- Static: all locale JSON parses; Romanian matches all **178** English keys and placeholder metadata; all `data-i18n` page references resolve; JavaScript syntax and `git diff --check` pass. Romanian extension description is 114 characters; store description is below 4,000 characters.

### Numeric matrix inputs

Each case used a standard HTML table with a nonnumeric first column and these values in its second column. Only the second column was drag-selected, exercising format inheritance for a selection that starts after the first column. Expected text below is the bottom SUM.

| Table language | Input values (separate rows) | Expected SUM |
| --- | --- | --- |
| ro | `1.234,56 RON`; `200,44 RON`; `-35,00 RON` | `1.400 RON` |
| ro | `1 234,56 lei`; `200,44 lei`; `-35,00 lei` | `1.400 lei` |
| ro | `RON 1.234,56`; `RON 200,44` | `RON 1.435` |
| ro-MD | `MDL 1.234,56`; `MDL 200,44` | `MDL 1.435` |
| ro | `1 234,56 lei` (U+00A0); `100,44 lei` | `1.335 lei` |
| ro | `1 234,56 lei` (U+202F); `100,44 lei` | `1.335 lei` |
| ro | `1.234,56`; `100,44` | `1335` |
| ro | `1,25 lei`; `2,10 lei` | `3,35 lei` |
| ro | `12,5 %`; `7,5%` | `0,2` |
| ro | `1,234`; `2,345` | `3,579` |
| ro | `1.234`; `2.345` | `3579` |
| en-US | `$1,234.56`; `$100.44` | `$1335` |
| en-US | `HK$1,234.56`; `HK$100.44` | `HK$1335` |
| hi-IN | `₹1,23,456`; `₹23,456` | `₹146912` |
| en-US | `１２３．５`; `１００．５` | `224` |
| en-US | `1.2K`; `2.3K` | `3.5K` |
| zh-CN | `1.2万`; `2.3万` | `3.5万` |
| ro | `-1.234,56 lei`; `234,56 lei` | `-1.000 lei` |
| ro | `1 leu`; `2 leu` | `3 leu` (literal source unit retained) |
| ro | `bad 20 lei`; `12,34,56 lei`; `2 lei` | `2` (invalid values skipped; no majority currency format) |
| en-US | `1.234,56 lei`; `100,44 lei` | `1.335 lei` |
| de-DE | `1.234,56 €`; `100,44 €` | `1335 €` |
| en_US (invalid HTML language tag) | `12,50 lei`; `7,50 lei` | `20 lei` |

Additional inputs: a 2×2 Romanian table containing `10,25 lei`, `20,10 lei` / `1,25 lei`, `2,10 lei` produced row sums `30,35 lei`, `3,35 lei` and column sums `11,5 lei`, `22,2 lei`. Thirty unique values generated as `${100 + i},10 lei`, `i = 0…29`, each received the expected last-digit marker. `-$1,234.56` + `$100.44` and `$-1,234.56` + `$100.44` both produced `$-1134.12`; `-RON 1.234,56` + `RON 100,44` produced `RON -1.134,12`.

### Reproduction

Static commands, from the repository:

```sh
node --check scripts/active.js
node --check scripts/config.js
node --check scripts/page-i18n.js
git diff --check
```

For the end-to-end paths:

1. Load this repository as an unpacked extension in a clean browser profile. Set its application language and page locale to one of the four regions above. Leave **Number format → Automatic**.
2. Open the built-in demo and help from the extension menu. Romanian regions should use the same `ro` message catalog. Select each numeric column of the regional demo separately: SUM is `1.400 RON`, `1.400 lei`, or `MDL 1.400`. Change the bottom algorithm to CNT: it must show `3`, without a currency unit.
3. To reproduce any matrix case, create its HTML in a temporary directory and serve it locally. Example:

   ```sh
   fixture_dir=$(mktemp -d "${TMPDIR%/}/hitable-check.XXXXXX")
   cat > "$fixture_dir/index.html" <<'HTML'
   <!doctype html><html lang="en"><meta charset="utf-8">
   <style>td{border:1px solid;padding:16px;min-width:160px}</style>
   <table lang="ro">
     <tr><td>A</td><td>1.234,56 RON</td></tr>
     <tr><td>B</td><td>200,44 RON</td></tr>
     <tr><td>C</td><td>-35,00 RON</td></tr>
   </table>
   HTML
   python3 -m http.server 8765 --bind 127.0.0.1 --directory "$fixture_dir"
   ```

   Visit `http://127.0.0.1:8765`, activate the extension, and drag-select the three amount cells. Replace the table language and values using the matrix to repeat other cases. Stop the server and remove this temporary fixture directory afterwards.
4. For `1,25 lei` / `2,10 lei`, single-copy produces `1,25\n2,1\n` (actual newline characters). Double-copy includes the original table text and `3,35 lei`. Escape removes the overlay.
5. Select `1,234` / `2,345` in a Romanian table. Automatic gives `3,579`; changing the setting to **Decimal point** updates the existing selection to `3579`; **Decimal comma** restores `3,579`. Reload the configuration page to verify persistence. For the signed-prefix, row-total and last-digit checks, use the additional input generation rules above.

## Existing self-test failures

`pages/test.html` reports **24 passed / 2 failed (26 total)** on both the unchanged base and this branch, with the same failures:

- `DataIntegrity: duplicate test flagged — Data with many duplicates should flag`
- `DataIntegrity: full analyze on anomalous data — Duplicate test should be flagged`

Baseline procedure: export `git archive 5350bf8bdef62b28c7e4621f5c68240dd3139fce` into a temporary directory, load that extension in a separate clean profile, open its `pages/test.html`, and compare with this branch. These failures are unchanged and outside this localization/number-format task. The existing self-test parser is a copy, so the real extension paths above provide the feature evidence.

## Initial verification boundaries (`6c7a480`)

No AI functionality, extra permissions or network service was added. RON and MDL remain different currencies; bare leu/lei is retained as written, without inferring a currency or converting it. Similar numeric notation in other countries benefits from the parser, but this does not add those countries' UI translations. No native Romanian speaker has reviewed the copy; no production website, stable-channel browser matrix, store publication or release was validated. Existing user configuration without `numberFormat` retains Automatic behavior.


## Final 0.2.1 release review

The final 0.2.1 package supersedes the initial PR's runtime verification above. The three reported P2 issues were reproduced in actual Chrome before the implementation changed, fixed, and verified through the real extension:

| Issue | Before | Final result |
| --- | --- | --- |
| Non-ASCII native decimal separator | Latin `1.234` / `2.345` in `ar-EG` or `fa-IR` yielded SUM `0` | SUM `3.579`; dot convention retained for these Latin-digit inputs |
| Small-value copying | `0.000000000000000000001` and `0.0000000000000000001%` copied as `0` | Each copies to a representation whose numeric value is exactly `1e-21`; normal comma-formatted copying remains correct |
| Live format classifications | Switching a Romanian selection to decimal-point mode excluded its first number without updating the overlay strikethrough | Rebuilt overlay reflects exclusion immediately; switching back removes strikethrough; anomaly styling also refreshes |

`manifest.json`, `package.json` and both version fields in `package-lock.json` are `0.2.1`. The runtime payload is unchanged by this report; the archive contents were compared byte-for-byte with the source files.

### Final package and environment

- Package: `dist/hitable-0.2.1-store.zip` (Git-ignored release artifact), **121,099 bytes / 28 files**.
- SHA-256: `8850c646b66883663a932596583a8cd3de76500c40844035975e8433ba909ca2`.
- Actual installed Google Chrome **157.0.8103.38**, macOS 26.6.2 arm64, Playwright 1.65.0, fresh profiles in `$TMPDIR`.
- Tested the **extracted ZIP**, not a parser copy or a separately constructed extension. Chrome's `Extensions.loadUnpacked` and `Extensions.triggerAction` exercised installation and toolbar activation. Per-process application language was selected as described above; no existing user profile or system language setting changed.
- Regions: `ro-RO`, `ro-MD`, `zh-CN`, `en-US`, `de-DE`, `ar-EG`, `fa-IR`.

### Final results: 249 end-to-end checks passed

Every region covered archive version `0.2.1`, configuration → help/demo navigation, help version, regional column sums and currency-free CNT, 25 numeric scenarios, normal/tiny/percentage clipboard values, double-copy including statistics, persisted format choices, invalid/valid overlay transitions, anomaly toggles, Escape and absence of uncaught page errors. Romanian UI was verified for both Romanian regions. Arabic/Persian unsupported interfaces correctly fell back to English.

The 25 numeric scenarios cover RON/lei/MDL, currency prefix/suffix/sign placement, regular/NBSP/narrow-NBSP grouping, decimal precision, percentages, ambiguous separators, US/Hong Kong/Indian formats, full-width digits, K/万 magnitudes, malformed values, German euros, Arabic/Persian Latin-digit inputs, and tiny numbers/percentages. Use the matrix above for shared cases. Added release-review inputs:

- `ar-EG` and `fa-IR` tables: `1.234`, `2.345` → `3.579`.
- English table: two `0.000000000000000000001` values → `0.000000000000000000002`; single-copy round-trips each to `1e-21`.
- English table: two `0.0000000000000000001%` values → the same numeric result and copy values.
- Romanian table: `1.234,56`, `10` → `1244,56`; decimal-point override → `10` with exactly one struck-through data cell; comma override restores both the sum and valid classification.
- Romanian anomaly fixture: `1.234,56` plus six `10,00` values → `1294,56`; one overlay anomaly, none when formatting is disabled, one again after re-enabling. Uniform two-decimal input isolates styling from the extension's existing mixed-precision rounding policy.

The fixture server, script, screenshots, extracted package, npm cache and profiles were task-only temporary files, excluded from Git. The reproduction process is the earlier manual procedure, now loading the ZIP's extracted directory in Chrome 157 and repeating the seven regions and added input cases above. Single-copy checks are separated by more than the configured 500 ms double-copy interval, and both drag endpoints are centered inside the viewport.

Static verification passes: all JSON, 178 Romanian keys and placeholder parity, three changed JavaScript files' syntax, all four version fields, English fallback, unchanged permissions, ZIP integrity/source parity, and whitespace checks. Final developer self-test results remain **24 passed / 2 failed**, with the same baseline duplicate-detection failures listed above.

### Reproducible release packaging

Run from the repository. Only tracked runtime paths enter the archive; docs, reports and task files are excluded. Fixed timestamps and permissions make the archive deterministic.

```sh
mkdir -p dist
python3 - <<'PYCODE'
import pathlib, subprocess, zipfile
root = pathlib.Path.cwd()
files = [name for name in subprocess.check_output(['git', 'ls-files'], text=True).splitlines()
         if name == 'manifest.json' or name.startswith(('assets/', '_locales/', 'pages/', 'scripts/'))]
with zipfile.ZipFile(root / 'dist/hitable-0.2.1-store.zip', 'w') as archive:
    for name in sorted(files):
        info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        info.external_attr = 0o100644 << 16
        archive.writestr(info, (root / name).read_bytes(),
                         compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
PYCODE
shasum -a 256 dist/hitable-0.2.1-store.zip
```

Release scope remains Romanian localization and associated numeric support; no AI, new permission, network processing or exchange-rate conversion. Native-speaker wording review and non-macOS/production-website coverage remain unperformed. Store review/public availability must be reported separately from source merge and GitHub release.
