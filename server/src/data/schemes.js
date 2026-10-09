// Editorial summaries, reviewed against the sources listed in each record.
// This date is an editorial review date, not a source publication date.
const reviewedAt = "2026-10-08";
const dfs = "Department of Financial Services, Ministry of Finance";
const source = (title, url) => ({ title, url });
export const catalog = [
  {
    slug: "pm-kisan",
    name: "Pradhan Mantri Kisan Samman Nidhi",
    acronym: "PM-KISAN",
    category: "agriculture",
    level: "central",
    states: [],
    authority: "Ministry of Agriculture & Farmers Welfare",
    summary:
      "Income support for cultivable landholding farmer families, subject to the scheme’s exclusion rules.",
    benefitLabel: "₹6,000 per year",
    benefitNote: "Three equal instalments through direct benefit transfer.",
    benefits: [
      "₹6,000 a year is transferred in three instalments to eligible farmers’ Aadhaar-seeded bank accounts.",
    ],
    eligibility: [
      "Cultivable landholding is the primary criterion. Higher-income exclusions also apply; this overview does not list every exclusion.",
    ],
    applicationSteps: [
      "Read the official scheme information and exclusion rules on the PM-KISAN portal.",
      "Use the portal’s Farmers Corner for services and Know Your Status. A local Common Service Centre can help with status enquiries.",
    ],
    caveats: [
      "Landholding alone does not establish eligibility. The responsible authorities verify eligibility and payments.",
    ],
    officialUrl: "https://pmkisan.gov.in/",
    sources: [
      source(
        "Ministry statement: eligibility and benefits · 22 Jul 2025",
        "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2146932&lang=2&reg=48",
      ),
    ],
    keywords: ["farmer", "farming", "income", "kisan", "agriculture"],
    reviewedAt,
  },
  {
    slug: "pmsby",
    name: "Pradhan Mantri Suraksha Bima Yojana",
    acronym: "PMSBY",
    category: "insurance",
    level: "central",
    states: [],
    authority: dfs,
    summary:
      "Renewable personal accident insurance through participating banks and post offices.",
    benefitLabel: "Up to ₹2 lakh cover",
    benefitNote: "₹20 annual premium; accident cover, with policy conditions.",
    benefits: [
      "₹2 lakh for accidental death or specified permanent total disability; ₹1 lakh for specified permanent partial disability.",
      "Annual premium: ₹20, collected by consent-based auto-debit. Cover runs from 1 June to 31 May.",
    ],
    eligibility: [
      "Individual account holders aged 18–70 at participating banks or post offices, who consent to enrolment and auto-debit.",
      "Enrolment is through one account only, even if a person holds multiple accounts.",
    ],
    applicationSteps: [
      "Ask your participating bank or post office for the enrolment and consent form.",
      "Check the insurer’s conditions, nominate a beneficiary, and authorise the premium auto-debit.",
    ],
    caveats: [
      "This is accident insurance; it does not reimburse hospitalisation expenses. Definitions, exclusions and termination rules apply.",
    ],
    officialUrl: "https://financialservices.gov.in/pmsby",
    sources: [
      source(
        "DFS scheme overview",
        "https://financialservices.gov.in/pradhan-mantri-suraksha-bima-yojana-pmsby",
      ),
      source(
        "DFS enrolment and policy FAQs",
        "https://www.financialservices.gov.in/pmsby",
      ),
    ],
    keywords: ["accident", "disability", "bima", "insurance", "suraksha"],
    reviewedAt,
  },
  {
    slug: "pmjjby",
    name: "Pradhan Mantri Jeevan Jyoti Bima Yojana",
    acronym: "PMJJBY",
    category: "insurance",
    level: "central",
    states: [],
    authority: dfs,
    summary:
      "One-year life insurance that can be renewed through a participating bank or post office.",
    benefitLabel: "₹2 lakh life cover",
    benefitNote: "₹436 full annual premium; policy conditions apply.",
    benefits: [
      "₹2 lakh cover for death from any cause, subject to policy conditions.",
      "The full annual premium is ₹436. The annual cover period runs from 1 June to 31 May.",
    ],
    eligibility: [
      "Entry is for account holders aged 18–50 with a participating bank or post office account and consent for auto-debit.",
    ],
    applicationSteps: [
      "Ask your participating bank or post office for the scheme’s enrolment form and current terms.",
      "Submit your consent for premium auto-debit and check nomination details with the provider.",
    ],
    caveats: [
      "For new enrolments, death from a cause other than an accident is not covered during the first 30 days. Joining-date premium and renewal conditions should be checked with the provider.",
    ],
    officialUrl: "https://www.financialservices.gov.in/pmjjby",
    sources: [
      source(
        "DFS scheme overview",
        "https://www.financialservices.gov.in/pradhan-mantri-jeevan-jyoti-bima-yojana-pmjjby",
      ),
      source(
        "DFS enrolment and waiting-period FAQs",
        "https://www.financialservices.gov.in/pmjjby",
      ),
    ],
    keywords: ["life", "insurance", "bima", "jyoti", "death"],
    reviewedAt,
  },
  {
    slug: "atal-pension-yojana",
    name: "Atal Pension Yojana",
    acronym: "APY",
    category: "pension",
    level: "central",
    states: [],
    authority: dfs,
    summary:
      "A contributory pension scheme with a government-guaranteed minimum pension after age 60.",
    benefitLabel: "₹1,000–₹5,000 / month",
    benefitNote:
      "After age 60, according to the pension option and contributions.",
    benefits: [
      "Choose a minimum monthly pension of ₹1,000, ₹2,000, ₹3,000, ₹4,000 or ₹5,000 after age 60.",
      "Required contributions depend on entry age and pension option; payment can be monthly, quarterly or half-yearly.",
    ],
    eligibility: [
      "Indian citizens aged 18–40 with a savings bank or post office account.",
      "Income-tax payers cannot join from 1 October 2022. Check the current enrolment declaration for the full tax-payer exclusion.",
    ],
    applicationSteps: [
      "Read the official information and ask your bank or post office about APY enrolment.",
      "Review the contribution schedule for your age and selected pension before authorising contributions.",
    ],
    caveats: [
      "This requires ongoing contributions. The listed pension is not an immediate payment or an investment-return estimate.",
    ],
    officialUrl: "https://financialservices.gov.in/atal-pension-yojana-apy",
    sources: [
      source(
        "DFS pension overview",
        "https://financialservices.gov.in/atal-pension-yojana-apy",
      ),
      source(
        "DFS annual report 2025–26 · pension sector",
        "https://financialservices.gov.in/sites/default/files/2026-05/DFS-ANNUAL-REPORT-ENGLISH-2025-26.pdf",
      ),
    ],
    keywords: ["retirement", "pension", "atal", "apy", "contribution"],
    reviewedAt,
  },
  {
    slug: "pm-jan-dhan-yojana",
    name: "Pradhan Mantri Jan-Dhan Yojana",
    acronym: "PMJDY",
    category: "banking",
    level: "central",
    states: [],
    authority: dfs,
    summary:
      "Access to a basic savings bank account for people who do not have another account.",
    benefitLabel: "No minimum balance",
    benefitNote:
      "A basic savings account, interest on deposits and a RuPay card.",
    benefits: [
      "A basic savings bank deposit account with no minimum-balance requirement, deposit interest and a RuPay debit card.",
      "An overdraft up to ₹10,000 is available to eligible account holders, subject to the bank’s conditions.",
    ],
    eligibility: [
      "The official scheme page describes opening a basic account for unbanked persons who do not have another account. Bank account-opening and KYC rules apply.",
    ],
    applicationSteps: [
      "Visit a bank branch or a Business Correspondent (Bank Mitra) outlet.",
      "Ask for the account-opening requirements and provide the documentation requested by the bank.",
    ],
    caveats: [
      "Overdraft is conditional credit, not a grant. Associated insurance and other schemes have their own requirements.",
    ],
    officialUrl: "https://www.pmjdy.gov.in/scheme",
    sources: [
      source(
        "PMJDY official scheme details",
        "https://www.pmjdy.gov.in/scheme",
      ),
    ],
    keywords: ["bank", "banking", "savings", "jan dhan", "rupay", "account"],
    reviewedAt,
  },
  {
    slug: "up-kanya-sumangala",
    name: "Mukhyamantri Kanya Sumangala Yojana",
    acronym: "MKSY",
    category: "women-education",
    level: "state",
    states: ["Uttar Pradesh"],
    authority: "Directorate of Women Welfare, Government of Uttar Pradesh",
    summary:
      "Stage-based support for girls, from birth and vaccination through education in Uttar Pradesh.",
    benefitLabel: "Six stages of support",
    benefitNote: "Amounts and qualifying dates depend on the stage.",
    benefits: [
      "The portal lists one-time payments at birth, full immunisation, entry to classes 1, 6 and 9, and qualifying higher education.",
      "Listed stage amounts are ₹5,000, ₹2,000, ₹3,000, ₹3,000, ₹5,000 and ₹7,000 respectively; each stage has its own conditions.",
    ],
    eligibility: [
      "The family must reside in Uttar Pradesh and have annual income no greater than ₹3 lakh.",
      "Normally, at most two girls in a family with at most two children can benefit. Twin-birth and adoption provisions apply; consult the full official criteria.",
      "Birth dates, immunisation and education requirements vary by stage.",
    ],
    applicationSteps: [
      "Read the stage-specific criteria on the official portal.",
      "Use the official Citizen Services portal for registration and follow its current application instructions.",
    ],
    caveats: [
      "The six amounts are not one automatic lump-sum entitlement. The official portal may be unavailable during maintenance.",
    ],
    officialUrl: "https://mksy.up.gov.in/",
    sources: [
      source("MKSY stage benefits", "https://mksy.up.gov.in/"),
      source(
        "Official eligibility criteria",
        "https://mksy.up.gov.in/women_welfare/citizen/check-eligibility.php?dob-check=2026",
      ),
    ],
    keywords: [
      "girl",
      "girls",
      "education",
      "women",
      "kanya",
      "sumangala",
      "school",
      "uttar pradesh",
    ],
    reviewedAt,
  },
];
