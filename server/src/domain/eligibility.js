// Deterministic, partial screening for NEW applications. Not an approval engine.
export const RULE_VERSION = "2026-10-08.1";
export const RULE_REVIEWED_AT = "2026-10-08";
const source = (title, url) => ({ title, url });
export const REFERENCES = {
  pmsby: source(
    "DFS PMSBY eligibility and policy FAQs",
    "https://www.financialservices.gov.in/pmsby",
  ),
  pmjjby: source(
    "DFS PMJJBY entry and renewal FAQs",
    "https://www.financialservices.gov.in/pmjjby",
  ),
  apy: source(
    "PFRDA APY FAQ · questions 3, 5 and 17",
    "https://www.pfrda.org.in/documents/33652/676426/APY%2BFAQs.pdf",
  ),
  pmjdy: source(
    "Official PMJDY scheme details",
    "https://www.pmjdy.gov.in/scheme",
  ),
  kisan: source(
    "Ministry exclusion criteria · 25 Jun 2019",
    "https://www.pib.gov.in/newsite/PrintRelease.aspx?lang=2&reg=48&relid=190752",
  ),
  kisanOverview: source(
    "Ministry PM-KISAN criteria · 22 Jul 2025",
    "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2146932&lang=2&reg=48",
  ),
  up: source(
    "Official UP family eligibility criteria",
    "https://mksy.up.gov.in/women_welfare/citizen/check-eligibility.php?dob-check=2026",
  ),
  upStages: source("Official UP stage requirements", "https://mksy.up.gov.in/"),
};
export const UP_STAGES = [
  {
    value: "birth",
    label: "Stage 1 · Birth",
    requirement: "Girl born on or after 1 April 2019.",
  },
  {
    value: "immunisation",
    label: "Stage 2 · Immunisation",
    requirement:
      "Girl born on or after 1 April 2018, with full immunisation completed within one year.",
  },
  {
    value: "class-1",
    label: "Stage 3 · Class 1",
    requirement: "Admission to class 1 in the current academic year.",
  },
  {
    value: "class-6",
    label: "Stage 4 · Class 6",
    requirement: "Admission to class 6 in the current academic year.",
  },
  {
    value: "class-9",
    label: "Stage 5 · Class 9",
    requirement: "Admission to class 9 in the current academic year.",
  },
  {
    value: "higher-education",
    label: "Stage 6 · Higher education",
    requirement:
      "Passed class 10/12 and entered a bachelor’s degree or certified diploma of at least two years in the current academic year.",
  },
];
const question = (
  key,
  label,
  helper,
  group,
  schemes,
  reference,
  extra = {},
) => ({
  key,
  label,
  helper,
  group,
  schemes,
  source: reference,
  type: "boolean",
  ...extra,
});
export const QUESTIONS = [
  question(
    "pmsbyAccount",
    "Do you have an individual account with a PMSBY participating bank or post office?",
    "Ask your provider if its account supports PMSBY. A joint individual account can qualify; institutional accounts do not.",
    "Accident insurance · PMSBY",
    ["pmsby"],
    REFERENCES.pmsby,
  ),
  question(
    "pmsbySingleAccount",
    "Would you enrol in PMSBY through only one account?",
    "Multiple accounts do not allow multiple PMSBY covers. This screen is for a new enrolment.",
    "Accident insurance · PMSBY",
    ["pmsby"],
    REFERENCES.pmsby,
  ),
  question(
    "pmjjbyAccount",
    "Do you have an individual account with a PMJJBY participating bank or post office?",
    "Confirm participation with the provider. This check uses new-entry criteria, not renewal cover to age 55.",
    "Life insurance · PMJJBY",
    ["pmjjby"],
    REFERENCES.pmjjby,
  ),
  question(
    "premiumConsent",
    "Would you consent to the required insurance premium auto-debit?",
    "Willingness to authorise premiums for the insurance schemes you check. This answer does not enrol you or authorise a payment.",
    "Insurance · payment consent",
    ["pmsby", "pmjjby"],
    REFERENCES.pmsby,
  ),
  question(
    "apySavingsAccount",
    "Do you have a personal savings bank or post-office savings account?",
    "This is needed for an APY account. You can ask the provider about opening one.",
    "Retirement · APY",
    ["atal-pension-yojana"],
    REFERENCES.apy,
  ),
  question(
    "indianCitizen",
    "Are you an Indian citizen?",
    "Do not enter an identity number or upload a document. This is self-reported.",
    "Retirement · APY",
    ["atal-pension-yojana"],
    REFERENCES.apy,
  ),
  question(
    "everIncomeTaxPayer",
    "Are you, or have you ever been, an income-tax payer?",
    "APY’s new-entry rule covers current AND past income-tax payers. A household-income amount cannot answer this question.",
    "Retirement · APY",
    ["atal-pension-yojana"],
    REFERENCES.apy,
  ),
  question(
    "apyByFortiethBirthday",
    "Is the application date no later than your 40th birthday?",
    "Only used when your saved age is 40. Entry ends on that birthday, not at the end of the year.",
    "Retirement · APY",
    ["atal-pension-yojana"],
    REFERENCES.apy,
    { ageCondition: 40 },
  ),
  question(
    "existingBankAccount",
    "Do you already have any other bank account?",
    "PMJDY’s basic-account starting point is for unbanked people. Provider KYC/account-opening rules still apply.",
    "Banking · PMJDY",
    ["pm-jan-dhan-yojana"],
    REFERENCES.pmjdy,
  ),
  question(
    "cultivableLandOwner",
    "Does your farmer family own cultivable land?",
    "Being an agricultural worker or selecting Farmer as your occupation does not establish ownership.",
    "Agriculture · PM-KISAN",
    ["pm-kisan"],
    REFERENCES.kisanOverview,
  ),
  question(
    "pmKisanExcluded",
    "Does any listed PM-KISAN exclusion apply to the landholder or farmer family?",
    "Institutional landholders; constitutional/political office holders; specified serving/retired government or local-body staff; pensioners receiving ₹10,000+ monthly (MTS/Class IV/Group D exceptions apply); last-assessment-year income-tax payers; registered practising doctors, engineers, lawyers, chartered accountants or architects. Read the full source before answering.",
    "Agriculture · PM-KISAN",
    ["pm-kisan"],
    REFERENCES.kisan,
  ),
  question(
    "upFamilyContext",
    "Do your saved state and household income describe the girl’s family?",
    "We use those details only if you confirm they describe this family. If not, this screen cannot assess its residency or income.",
    "Girls & education · UP",
    ["up-kanya-sumangala"],
    REFERENCES.up,
  ),
  question(
    "girlBeneficiary",
    "Is the intended beneficiary a girl?",
    "The account holder’s age is not used as the girl’s age. Stage conditions are checked separately.",
    "Girls & education · UP",
    ["up-kanya-sumangala"],
    REFERENCES.up,
  ),
  question(
    "upFamilyRulesMet",
    "Does the family meet the official child-count rules, including applicable exceptions?",
    "Normally at most two girls and two children; special twin-birth and adoption provisions apply. Use Not sure if you need the provider to clarify your family’s case.",
    "Girls & education · UP",
    ["up-kanya-sumangala"],
    REFERENCES.up,
  ),
  question(
    "upStage",
    "Which UP support stage are you checking?",
    "Choose a stage before confirming its requirements.",
    "Girls & education · UP",
    ["up-kanya-sumangala"],
    REFERENCES.upStages,
    { type: "stage", options: UP_STAGES },
  ),
  question(
    "upStageRequirementsMet",
    "Does the girl meet the selected stage’s date, immunisation or admission requirements?",
    "Answer only for the stage selected above. We do not collect her name, birth date or documents.",
    "Girls & education · UP",
    ["up-kanya-sumangala"],
    REFERENCES.upStages,
  ),
];
const field = (origin, key) => ({ origin, key });
function criterion(id, label, status, reason, input, reference) {
  return { id, label, status, reason, input, source: reference };
}
function booleanRule(answers, key, label, expected, reference) {
  const value = answers[key];
  const status =
    typeof value !== "boolean"
      ? "unknown"
      : value === expected
        ? "met"
        : "not_met";
  return criterion(
    key,
    label,
    status,
    status === "unknown"
      ? "Answer this question, or keep Not sure if you need clarification."
      : `Your answer ${value ? "Yes" : "No"} ${status === "met" ? "meets" : "does not meet"} this checked requirement.`,
    field("answer", key),
    reference,
  );
}
function ageRule(profile, min, max, reference) {
  const value = profile.age;
  const known = Number.isInteger(value) && value >= 0 && value <= 120;
  const status = !known
    ? "unknown"
    : value >= min && value <= max
      ? "met"
      : "not_met";
  return criterion(
    "age",
    `New-entry age ${min}–${max}`,
    status,
    !known
      ? "Add your age to your saved profile."
      : `Saved age ${value} ${status === "met" ? "is within" : "is outside"} this entry range.`,
    field("profile", "age"),
    reference,
  );
}
const definitions = {
  pmsby: {
    sources: [REFERENCES.pmsby],
    limitations: [
      "Provider confirmation, exact age/termination rules, premium payment and policy conditions still apply. At saved age 70, this screen defers the age decision to the provider.",
    ],
    rules: (p, a) => {
      const age = ageRule(p, 18, 70, REFERENCES.pmsby);
      if (p.age === 70)
        Object.assign(age, {
          status: "unknown",
          reason:
            "The FAQ lists 18–70 but also termination at age 70 (nearer birthday). Ask the provider to verify your exact entry date; whole-year age is insufficient.",
          input: field("official", "pmsby-age"),
        });
      return [
        age,
        booleanRule(
          a,
          "pmsbyAccount",
          "Participating individual account",
          true,
          REFERENCES.pmsby,
        ),
        booleanRule(
          a,
          "pmsbySingleAccount",
          "One PMSBY enrolment account",
          true,
          REFERENCES.pmsby,
        ),
        booleanRule(
          a,
          "premiumConsent",
          "Premium auto-debit consent",
          true,
          REFERENCES.pmsby,
        ),
      ];
    },
  },
  pmjjby: {
    sources: [REFERENCES.pmjjby],
    limitations: [
      "This checks new entry, not renewal of existing cover. Provider verification, single-cover conditions, premium and the non-accidental-death waiting period still apply.",
    ],
    rules: (p, a) => [
      ageRule(p, 18, 50, REFERENCES.pmjjby),
      booleanRule(
        a,
        "pmjjbyAccount",
        "Participating individual account",
        true,
        REFERENCES.pmjjby,
      ),
      booleanRule(
        a,
        "premiumConsent",
        "Premium auto-debit consent",
        true,
        REFERENCES.pmjjby,
      ),
    ],
  },
  "atal-pension-yojana": {
    sources: [REFERENCES.apy],
    limitations: [
      "New applications only. Existing APY subscribers may have different continuation rules. Contribution, nomination and provider verification remain outside this partial screen.",
    ],
    rules: (p, a) => {
      const age = ageRule(p, 18, 40, REFERENCES.apy);
      if (p.age === 40) {
        const boundary = booleanRule(
          a,
          "apyByFortiethBirthday",
          "No later than the 40th birthday",
          true,
          REFERENCES.apy,
        );
        Object.assign(age, {
          label: "New entry by the 40th birthday",
          status: boundary.status,
          reason:
            boundary.status === "unknown"
              ? "Saved age 40 needs an exact birthday confirmation; the full year is not eligible for entry."
              : boundary.reason,
          input: boundary.input,
        });
      }
      return [
        age,
        booleanRule(
          a,
          "indianCitizen",
          "Indian citizenship",
          true,
          REFERENCES.apy,
        ),
        booleanRule(
          a,
          "apySavingsAccount",
          "Savings bank or post-office account",
          true,
          REFERENCES.apy,
        ),
        booleanRule(
          a,
          "everIncomeTaxPayer",
          "Never an income-tax payer at application",
          false,
          REFERENCES.apy,
        ),
      ];
    },
  },
  "pm-jan-dhan-yojana": {
    sources: [REFERENCES.pmjdy],
    limitations: [
      "Only the unbanked-person starting criterion is screened. Age/minor-account, KYC and bank requirements require provider verification. This is not approval for an overdraft or insurance.",
    ],
    rules: (p, a) => [
      booleanRule(
        a,
        "existingBankAccount",
        "No other bank account",
        false,
        REFERENCES.pmjdy,
      ),
    ],
  },
  "pm-kisan": {
    sources: [REFERENCES.kisanOverview, REFERENCES.kisan],
    limitations: [
      "Land records, ownership/cut-off/inheritance conditions, family definition, exclusions, identity and payment validation require official review. Household income or occupation alone is not an eligibility rule.",
    ],
    rules: (p, a) => [
      booleanRule(
        a,
        "cultivableLandOwner",
        "Cultivable landholding farmer family",
        true,
        REFERENCES.kisanOverview,
      ),
      booleanRule(
        a,
        "pmKisanExcluded",
        "No listed exclusion applies",
        false,
        REFERENCES.kisan,
      ),
    ],
  },
  "up-kanya-sumangala": {
    sources: [REFERENCES.up, REFERENCES.upStages],
    limitations: [
      "Family context and stage requirements are self-confirmed, not independently verified. Family exceptions, stage dates, documents and current application terms require official review. Account-holder age is not the girl’s age.",
    ],
    rules: (p, a) => {
      const context = a.upFamilyContext === true;
      const residency =
        !context || !p.state
          ? "unknown"
          : p.state === "Uttar Pradesh"
            ? "met"
            : "not_met";
      const incomeKnown =
        context &&
        Number.isInteger(p.annualHouseholdIncome) &&
        p.annualHouseholdIncome >= 0;
      const income = !incomeKnown
        ? "unknown"
        : p.annualHouseholdIncome <= 300000
          ? "met"
          : "not_met";
      const stage = UP_STAGES.find((stage) => stage.value === a.upStage);
      const stageRule = booleanRule(
        a,
        "upStageRequirementsMet",
        "Selected stage requirements",
        true,
        REFERENCES.upStages,
      );
      if (!stage)
        Object.assign(stageRule, {
          status: "unknown",
          reason:
            "Choose the intended support stage before confirming its requirements.",
          input: field("answer", "upStage"),
        });
      else stageRule.label = `${stage.label}: requirements`;
      return [
        criterion(
          "state",
          "Girl’s family resides in Uttar Pradesh",
          residency,
          !context
            ? "Confirm that saved details describe the girl’s family; no residency inference was made."
            : !p.state
              ? "Add the family’s state to your saved profile."
              : `Saved family state: ${p.state}.`,
          context
            ? field("profile", "state")
            : field("answer", "upFamilyContext"),
          REFERENCES.up,
        ),
        criterion(
          "income",
          "Family annual income at most ₹3 lakh",
          income,
          !context
            ? "Confirm the family context before using saved household income."
            : !incomeKnown
              ? "Add annual household income to your saved profile; zero is valid."
              : `Saved family income: ₹${p.annualHouseholdIncome.toLocaleString("en-IN")} per year.`,
          context
            ? field("profile", "annualHouseholdIncome")
            : field("answer", "upFamilyContext"),
          REFERENCES.up,
        ),
        booleanRule(
          a,
          "girlBeneficiary",
          "Girl beneficiary",
          true,
          REFERENCES.up,
        ),
        booleanRule(
          a,
          "upFamilyRulesMet",
          "Official family-size conditions",
          true,
          REFERENCES.up,
        ),
        stageRule,
      ];
    },
  },
};
export function assessSchemes(schemes, profile = {}, answers = {}) {
  return schemes.map((scheme) => {
    const definition = definitions[scheme.slug];
    const rules = definition?.rules(profile, answers) || [];
    const status = !definition
      ? "not_assessed"
      : rules.some((rule) => rule.status === "not_met")
        ? "criteria_not_met"
        : rules.some((rule) => rule.status === "unknown")
          ? "needs_info"
          : "basic_match";
    const missing = rules
      .filter((rule) => rule.status === "unknown")
      .map((rule) => rule.input);
    return {
      slug: scheme.slug,
      name: scheme.name,
      acronym: scheme.acronym,
      category: scheme.category,
      level: scheme.level,
      assessment: {
        status,
        rules,
        missing: missing.filter(
          (item, index) =>
            missing.findIndex(
              (other) => other.origin === item.origin && other.key === item.key,
            ) === index,
        ),
        sources: definition?.sources || [],
        limitations: definition?.limitations || [
          "No reviewed screening rules are available for this catalog entry.",
        ],
        ruleVersion: definition ? RULE_VERSION : null,
        reviewedAt: definition ? RULE_REVIEWED_AT : null,
      },
    };
  });
}
