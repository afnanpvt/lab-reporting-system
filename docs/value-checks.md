# Result Entry value checks

What the yellow, red and blue notes on Result Entry mean, and where every limit and formula comes
from. The rules live in [`src/pages/site/valueChecks.ts`](../src/pages/site/valueChecks.ts).

## How they behave

- **Yellow (check):** likely typo, unit slip, impossible value, or two fields that contradict
  each other. Often has a one-click fix ("Use 14.2").
- **Red (critical):** a real but dangerous result — inform the referring doctor.
- **Blue (suggest):** a value that can be calculated from other fields.
- Notes never block saving, never change a value unless clicked, and never print on the report.
- "Value is correct" / "Hide" silences a note for that exact reading for the current session;
  editing the value brings it back.
- The section list shows a count per section, and **Review report** lists anything outstanding
  first (with **Review report anyway**). Suggestions don't count.
- Serology, culture, blood group, urine/motion descriptions, smear results and "Others" rows are
  text and aren't checked.

Limits are deliberately set beyond what real patients show, so a genuinely extreme result
(glucose 2,375 mg/dl has been survived) isn't treated as a typo. **These limits should be
reviewed by the lab's doctor**; the ones marked *sanity limit* are our own judgement, not a
published standard.

## Unit and decimal slips

| Field | Trigger | Fix |
|---|---|---|
| Haemoglobin | 60–250 | ÷10 (g/L → gm/dl) |
| RBC count | ≥ 10,000 | ÷1,000,000 (per cumm → millions) |
| Total WBC | < 100 with a decimal | ×1000 (×10³/µL → cells/cumm) |
| Platelets | 21–4,999 / ≥ 5,000 | ÷100 / ÷100,000 (→ lakhs) |
| S. Creatinine | ≥ 40 | ÷88.4 (µmol/L → mg/dl) |
| Total bilirubin | ≥ 60 | ÷17.1 (µmol/L → mg/dl) |
| Total protein / Albumin | ≥ 20 / ≥ 10 | ÷10 (g/L → gm/dl) |
| Calcium | 1.5–3.5 | ×4.008 (mmol/L → mg/dl) |
| HbA1c | 20–200 | mmol/mol ÷ 10.929 + 2.15 (IFCC → %) |
| Potassium | 20–100 | ÷10 |
| Urine specific gravity | 1000–1060 | ÷1000 |
| ABG pH | 60–80 | ÷10 |
| FiO2 | 0.21–1.0 | ×100 |

## Realistic limits and sources

| Field | Limit | Source |
|---|---|---|
| Hb | 2–25 gm/dl | Mindray BC-20s HGB range 0–280 g/L ([brochure](https://www.mindray.com/content/dam/xpace/en_in/resources/brochures/bc-20s-product-brochure-en_in.pdf)) |
| RBC | 0.5–8.6 m/cumm | Sysmex XN linearity 0–8.60 ×10⁶/µL ([spec sheet](https://www.sysmex.com/-/media/project/sysmex/sysmex/documents/brochures/xn-430-specsheet.pdf?sc_lang=en-us)) |
| WBC | 200–440,000 /cumm | Sysmex XN linearity 0–440 ×10³/µL |
| Platelets | 0.05–20 lakhs | Sysmex XN linearity 0–5,000 ×10³/µL |
| ESR | 0–200 mm | Westergren tube is 200 mm ([StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK557485/)) |
| PCV, MCV, MCH, MCHC, retic, BT, CT | see code | Sanity limits |
| Glucose | 10–600 mg/dl | GOD-POD kits linear to ~500 ([evaluation](https://pubmed.ncbi.nlm.nih.gov/28775446/)); survived extreme 2,375 ([case](https://pmc.ncbi.nlm.nih.gov/articles/PMC13043460/)) |
| Urea | 2–400 mg/dl | Erba urea kit linear to 300 ([reagent list](https://www.aiimsbilaspur.edu.in/common/images/tender/in0z3z62Biochemisrty%20Analyzer%20Consumables.pdf)) |
| Creatinine / Uric acid | 0.1–25 / 0.5–25 mg/dl | Erba kits linear to 25 |
| Triglycerides | 10–10,000 mg/dl | Chylomicronemia runs into the thousands ([NLA review](https://www.lipidjournal.com/article/S1933-2874(25)00066-2/fulltext)) |
| HbA1c | 3–20 % | Bio-Rad D-10 reportable 3.8–18.5 % ([Bio-Rad](https://www.bio-rad.com/webroot/web/pdf/cdg/literature/A-212_D-10_HbA1c_Program.pdf)) |
| Vitamin D | 3–150 ng/mL | Elecsys Vitamin D total II 5–100 ng/mL ([FDA](https://www.accessdata.fda.gov/cdrh_docs/reviews/K210901.pdf)) |
| Cholesterol, HDL, enzymes, protein, albumin, minerals, amylase, GGT | see code | Sanity limits |
| Sodium / Potassium / Chloride | 100–190 / 1–10 / 50–150 | ISE analyzer ranges 113–190 / 1.4–8.6 / 50–148 ([FDA](https://www.accessdata.fda.gov/cdrh_docs/reviews/K070531.pdf)) |
| Urine pH / SG | 4.5–8.5 / 1.000–1.050 | Normal 4.5–8 and 1.001–1.035 ([Medscape](https://emedicine.medscape.com/article/2074001-overview)) |
| ABG pH | 6.8–7.8 | Range usually quoted as survivable ([Acute Care Testing](https://acutecaretesting.org/en/journal-scans/record-breaking-blood-ph-survival-following-extreme-acidosis)) |
| pO2 | 5–600 mmHg | ~500–556 mmHg on 100% oxygen ([StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK482268/), [study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9090223/)) |
| pCO2, HCO3, base excess, FiO2, SpO2 | see code | Sanity limits (SpO2 > 100 is impossible) |
| PT / INR | 8–150 s / 0.5–15 | i-STAT verified to INR 6.0 ([Abbott](https://www.globalpointofcare.abbott/content/dam/ardx/globalpointofcare/apoc/support/i-stat-1/cti-ifu/english-us/cti/715236-00S.pdf)); warfarin overdose goes higher |

## Critical values

Hb ≤7 or ≥21 · WBC <2,000 or >40,000 · Platelets <0.5 or >10 lakhs · Glucose <40 or >450 ·
Potassium <3 or >6 · Sodium <120 or >160 · Calcium ≤7 or ≥12 · Creatinine ≥7.5 · ABG pH <7.2
or >7.6 · pO2 ≤45. From published hospital critical-value lists
([UIowa](https://www.healthcare.uiowa.edu/path_handbook/appendix/common/un_crit_lab_val.html),
[Intermountain](https://www.testmenu.com/Intermountain/TestDirectory/SiteFile?fileName=sidebar%5CCriticalValues-0917.pdf)).

## Checks between fields

- Differential count must total 100% ([ref](https://www.sciencedirect.com/topics/biochemistry-genetics-and-molecular-biology/leukocyte-differential-count)).
- PCV ≈ 3 × Hb ± 3, and MCHC above 36 suggests error or lipemia ([3:1 rule](https://www.thebloodproject.com/the-31-rule/), [ASCLS](https://clsjournal.ascls.org/content/30/3/173)).
- Direct bilirubin ≤ total; albumin ≤ total protein; HDL and LDL ≤ total cholesterol.
- ESR ¼ ≤ ½ ≤ ¾ ≤ 1 hr readings; post-dialysis urea ≤ pre-dialysis.
- Negative anion gap, Na − (Cl + HCO3), is almost always an entry error ([StatPearls](https://www.ncbi.nlm.nih.gov/books/NBK539757/)).
- ABG: measured HCO3 within ±3 of 0.03 × pCO2 × 10^(pH − 6.1) ([formula](http://www-users.med.cornell.edu/~spon/picu/calc/basecalc.htm)).

## Calculated values

Offered when empty; flagged when a typed value differs by more than 5% (or a small absolute
tolerance).

| Field | Formula |
|---|---|
| MCV / MCH / MCHC | PCV×10/RBC · Hb×10/RBC · Hb×100/PCV ([NCBI](https://www.ncbi.nlm.nih.gov/books/NBK260/)) |
| Absolute eosinophils | WBC × eosinophil% / 100 |
| Indirect bilirubin | Total − direct |
| Globulin · A/G ratio | Total protein − albumin · albumin ÷ globulin |
| VLDL · LDL | TG/5 · TC − HDL − TG/5, only when TG ≤ 400 ([ASCLS](https://ascls.org/the-end-of-the-friedewald-equation/)) |
| Cholesterol/HDL ratio | TC ÷ HDL |
