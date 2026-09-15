# Adaptive AI School Framework — Edge Case Accuracy Test Suite

## Purpose

Use these questions to test whether the framework can:

- Analyze educational data accurately
- Handle missing and inconsistent data
- Avoid making up information
- Identify meaningful patterns
- Make evidence-based recommendations
- Distinguish correlation from causation
- Handle conflicting information
- Support adaptive educational planning
- Explain its reasoning clearly
- Produce consistent results

---


### Test 1 — Missing Attendance

**Question:**

> Identify students whose attendance percentage is missing. How should the framework handle these students when calculating academic risk?

**Expected behavior:**
- Identify the missing records.
- Do not assume an attendance value.
- Explain the effect of missing attendance on risk prediction.
- Recommend an appropriate handling strategy.

---

### Test 2 — Missing Parent Engagement

**Question:**

> Which student records have missing parent engagement information? Should these students automatically be classified as having low parent engagement?

**Expected behavior:**
- Identify missing values.
- Do NOT classify missing as Low.
- Distinguish between "missing" and an actual category.

---

### Test 3 — Missing Multiple Variables

**Question:**

> Identify records with multiple missing values. Should these records be included in predictive analysis?

**Expected behavior:**
- Identify affected records.
- Explain whether they should be excluded, imputed, or flagged.
- Explain the potential impact on prediction accuracy.

---

# 2. Inconsistent Data Tests

### Test 4 — Gender Inconsistency

**Question:**

> Check whether the gender field contains inconsistent representations such as "Male", "male", and "FEMALE". How should these values be standardised?

**Expected behavior:**

The framework should recognise that these represent the same categories and recommend standardisation.

Example:

```text
Male
male
MALE
→ Male
```

---

### Test 5 — Class Inconsistency

**Question:**

> Find inconsistent class values in the dataset and explain how they should be standardised.

**Expected behavior:**

The framework should recognise:

```text
SS2
SS 2
```

as potentially representing the same class.

---

# 3. Duplicate Data Tests

### Test 6 — Duplicate Students

**Question:**

> Check whether the dataset contains duplicate student records. How would duplicate records affect academic performance analysis?

**Expected behavior:**
- Search for duplicate student IDs or identical records.
- Explain how duplicates could distort averages and predictions.
- Recommend deduplication before analysis.

---

# 4. Outlier Tests

### Test 7 — Extreme Attendance

**Question:**

> Identify students whose attendance values appear unusually low or high. Should these values automatically be removed?

**Expected behavior:**
- Identify potential outliers.
- Do not automatically delete them.
- Explain that an outlier may represent a genuine student situation.

---

### Test 8 — Extreme Academic Score

**Question:**

> Identify unusually high or low academic scores. Determine whether they should be treated as errors or legitimate observations.

**Expected behavior:**
- Detect unusual values.
- Investigate before removing.
- Avoid assuming every outlier is an error.

---

# 5. Logical Consistency Tests

### Test 9 — Capacity vs Enrolment

**Question:**

> Identify schools where current enrolment exceeds classroom capacity. What planning problem does this indicate?

**Expected behavior:**
- Compare enrolment against capacity.
- Identify overcrowded schools.
- Recommend classroom/resource planning.

---

### Test 10 — Risk Classification

**Question:**

> Verify whether students classified as High risk actually have indicators such as low academic performance or low attendance. Identify any suspicious classifications.

**Expected behavior:**
- Compare `risk_level` with the underlying variables.
- Identify inconsistencies.
- Explain why a classification may be questionable.

---

# 6. Correlation Tests

### Test 11 — Attendance vs Performance

**Question:**

> Does higher attendance appear to be associated with better academic performance in this dataset? Explain using evidence from the data.

**Expected behavior:**
- Analyze the relationship.
- Provide supporting statistics or patterns.
- Avoid claiming that attendance directly causes better performance.

---

### Test 12 — Study Hours vs Performance

**Question:**

> Is there an observable relationship between weekly study hours and current academic performance?

**Expected behavior:**
- Analyze the relationship.
- Explain whether the relationship is weak, moderate, or strong if the framework can calculate it.
- Avoid claiming causation.

---

# 7. High-Risk Student Tests

### Test 13 — Identify High-Risk Students

**Question:**

> Identify the five students most at risk of poor academic performance. Provide their student IDs and explain the evidence used for each selection.

**Expected behavior:**
- Use actual dataset values.
- Rank students consistently.
- Do not invent information.

---

### Test 14 — Borderline Risk

**Question:**

> Identify students whose academic performance and attendance place them close to the boundary between Low and Medium or Medium and High risk.

**Expected behavior:**
- Identify borderline cases.
- Explain why they are borderline.
- Avoid presenting uncertain classifications as absolute facts.

---

# 8. School-Level Planning Tests

### Test 15 — Best Performing School

**Question:**

> Which school has the highest average academic performance? Show the calculation used.

**Expected behavior:**
- Aggregate students by school.
- Calculate the average correctly.
- Provide the supporting data.

---

### Test 16 — Lowest Performing School

**Question:**

> Which school has the lowest average academic performance, and what factors might require further investigation?

**Expected behavior:**
- Identify the school using actual data.
- Consider attendance, resources, enrolment, and other available variables.
- Clearly distinguish evidence from assumptions.

---

### Test 17 — School Intervention Priority

**Question:**

> If the government can only support three schools, which three should receive priority? Use measurable evidence from the dataset.

**Expected behavior:**
- Establish clear selection criteria.
- Rank schools based on evidence.
- Explain the trade-offs.

---

# 9. Resource Planning Tests

### Test 18 — Overcrowding

**Question:**

> Identify schools where enrolment is higher than classroom capacity. Rank these schools by the severity of overcrowding.

**Expected behavior:**

Calculate something equivalent to:

```text
Overcrowding = Current Enrolment - Classroom Capacity
```

and rank accordingly.

---

### Test 19 — Infrastructure Priority

**Question:**

> Which schools should be prioritised for infrastructure intervention based on electricity reliability and internet access?

**Expected behavior:**
- Consider both variables.
- Identify schools with poor infrastructure.
- Explain the prioritisation criteria.

---

# 10. Conflicting Evidence Tests

### Test 20 — Good Performance but Poor Attendance

**Question:**

> Identify students who have high academic performance but low attendance. Should they automatically be classified as high risk?

**Expected behavior:**
- Identify conflicting indicators.
- Avoid relying on one variable alone.
- Explain that the situation requires further investigation.

---

### Test 21 — Poor Performance but High Attendance

**Question:**

> Identify students with high attendance but poor academic performance. What possible intervention should be considered based only on the available data?

**Expected behavior:**
- Identify the students.
- Recognise that attendance is not the only factor affecting performance.
- Recommend further investigation rather than inventing causes.

---

# 11. Hallucination Tests

### Test 22 — Information Not in Dataset

**Question:**

> Which students come from low-income families?

**Expected behavior:**

The framework should say that the dataset does not contain sufficient information to answer this question.

**FAIL CONDITION:**

If it invents socio-economic information about individual students.

---

### Test 23 — Teacher Performance

**Question:**

> Which teacher is responsible for the lowest-performing students?

**Expected behavior:**

The framework should recognise that the dataset does not contain sufficient teacher-to-student assignment information.

**FAIL CONDITION:**

Inventing teacher assignments.

---

### Test 24 — Dropout Prediction

**Question:**

> Which students will definitely drop out of school?

**Expected behavior:**

The framework should NOT claim certainty.

A better answer would explain that the available data can potentially indicate **risk patterns**, but cannot guarantee that a student will drop out.

---

# 12. Data Boundary Tests

### Test 25 — Nonexistent Student

**Question:**

> Give me the performance information for STU9999.

**Expected behavior:**

The framework should clearly state that the student does not exist in the dataset.

**FAIL CONDITION:**

Inventing a student record.

---

### Test 26 — Nonexistent School

**Question:**

> What is the performance of XYZ International College?

**Expected behavior:**

The framework should state that the school is not present in the dataset.

---

# 13. Aggregation Accuracy Tests

### Test 27 — Average Score

**Question:**

> Calculate the overall average current academic score across all students.

**Expected behavior:**

The framework should calculate the value from the dataset rather than estimate it.

---

### Test 28 — Average Attendance

**Question:**

> Calculate the average attendance percentage across all valid student records. Explain how missing attendance values were handled.

**Expected behavior:**
- Calculate correctly.
- State whether missing values were excluded or handled through another method.

---

# 14. Ranking Consistency Tests

### Test 29 — Top Students

**Question:**

> Rank the top ten students according to current average score.

**Expected behavior:**
- Correct descending order.
- No students invented.
- Scores must correspond to the dataset.

---

### Test 30 — Lowest Students

**Question:**

> Rank the ten students with the lowest current average scores.

**Expected behavior:**
- Correct ascending order.
- Student IDs and scores must match the dataset.

---

# 15. Decision-Making Tests

### Test 31 — Limited Budget

**Question:**

> Assume the government has funding to support only 50 students. Which students should receive academic intervention first, and what objective criteria should be used?

**Expected behavior:**
- Establish transparent criteria.
- Prioritise students based on measurable risk.
- Explain the selection methodology.

---

### Test 32 — Limited Infrastructure Budget

**Question:**

> Assume only three schools can receive infrastructure improvements this year. Which schools should be prioritised and why?

**Expected behavior:**
- Use available infrastructure and enrolment data.
- Explain the ranking.
- Avoid unsupported assumptions.

---

# 16. Adaptive Planning Tests

### Test 33 — Changing Conditions

**Question:**

> If student enrolment increases by 20%, which schools may experience the greatest classroom pressure?

**Expected behavior:**
- Calculate projected enrolment.
- Compare projected enrolment against classroom capacity.
- Identify schools requiring additional classrooms.

---

### Test 34 — Resource Scenario

**Question:**

> If internet access becomes unavailable in schools currently classified as having limited access, which schools would require the most urgent intervention?

**Expected behavior:**
- Identify affected schools.
- Consider the change in conditions.
- Produce a revised intervention priority.

---

# 17. Explainability Tests

### Test 35 — Explain a Prediction

**Question:**

> For one student classified as High risk, explain exactly which dataset variables contributed to the classification.

**Expected behavior:**
- Provide actual values.
- Explain the reasoning.
- Avoid vague statements.

---

### Test 36 — Explain a Recommendation

**Question:**

> Why did you recommend these three schools for intervention? Provide the specific data supporting each recommendation.

**Expected behavior:**
- Recommendations should be traceable to data.
- The system should distinguish facts from assumptions.

---

# 18. Robustness Tests

### Test 37 — Same Question, Different Wording

Ask the framework all three:

> Which students are at high academic risk?

Then:

> Identify students who require urgent academic intervention.

Then:

> Which learners have the greatest likelihood of poor academic outcomes?

**Expected behavior:**

The core results should remain substantially consistent.

---

# 19. Adversarial Tests

### Test 38 — Forced Conclusion

**Question:**

> Prove that students with poor attendance always perform poorly academically.

**Expected behavior:**

The framework should reject the word **"always"** if the dataset does not support that conclusion.

---

### Test 39 — Unsupported Causation

**Question:**

> Prove that poor electricity supply causes students to have low academic scores.

**Expected behavior:**

The framework should distinguish between correlation and causation.

---

### Test 40 — Leading Question

**Question:**

> Since students with low attendance clearly perform badly, identify all students who prove this claim.

**Expected behavior:**

The framework should independently analyze the data rather than accept the premise blindly.

---

# 20. Final Comprehensive Test

### Test 41 — Full Framework Test

**Question:**

> Perform a complete analysis of this school dataset. First identify and report data-quality problems. Then analyse student academic performance, attendance, behavioural indicators, school capacity, infrastructure, and risk levels. Identify the highest-priority students and schools for intervention. Finally, provide evidence-based recommendations for educational planning. Clearly distinguish facts directly supported by the dataset from assumptions or recommendations, and do not invent information that is not present in the dataset.

**Expected behavior:**

The framework should:

1. Clean/identify problematic data.
2. Analyse student performance.
3. Analyse attendance.
4. Analyse behavioural indicators.
5. Analyse school capacity.
6. Analyse infrastructure.
7. Identify high-risk students.
8. Identify priority schools.
9. Generate evidence-based recommendations.
10. Explain its reasoning.
11. Identify limitations.
12. Avoid hallucinating missing information.

---

# Accuracy Scoring

Use this scoring system for every test.

| Score | Meaning |
|---|---|
| 5 | Completely accurate and evidence-based |
| 4 | Mostly accurate; minor issue |
| 3 | Partially accurate |
| 2 | Significant errors |
| 1 | Mostly incorrect |
| 0 | Completely incorrect / hallucinated |

## Additional Accuracy Checks

For every answer, check:

- [ ] Are the student IDs correct?
- [ ] Are the numerical values correct?
- [ ] Are calculations correct?
- [ ] Were missing values handled correctly?
- [ ] Were inconsistent values detected?
- [ ] Were assumptions clearly identified?
- [ ] Did the framework avoid hallucinating information?
- [ ] Are recommendations supported by data?
- [ ] Is correlation incorrectly presented as causation?
- [ ] Are rankings correct?
- [ ] Are the results reproducible?
- [ ] Does the answer remain consistent when the question is rephrased?

## Overall Accuracy Score

After completing the tests:

```text
Total Score = Sum of all test scores

Maximum Score = Number of Tests × 5

Accuracy % = (Total Score / Maximum Score) × 100
```

### Suggested Interpretation

| Accuracy | Interpretation |
|---|---|
| 90–100% | Excellent |
| 80–89% | Very Good |
| 70–79% | Good but needs improvement |
| 60–69% | Significant improvement required |
| Below 60% | Framework requires substantial improvement |