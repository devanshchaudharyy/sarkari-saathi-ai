// Shared choices prevent the form and API from disagreeing. Completion is data
// readiness only; it never represents eligibility for any government scheme.
export const STATES_AND_UTS = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];
export const OCCUPATIONS = [
  { value: "student", label: "Student" },
  { value: "salaried", label: "Salaried employee" },
  { value: "self-employed", label: "Self-employed / business owner" },
  { value: "farmer", label: "Farmer / agricultural worker" },
  { value: "daily-wage", label: "Daily-wage / casual worker" },
  { value: "homemaker", label: "Homemaker" },
  { value: "unemployed", label: "Currently not employed" },
  { value: "retired", label: "Retired" },
  { value: "other", label: "Other" },
];
export const MAX_INCOME = 1_000_000_000;
export const CORE_FIELDS = [
  { key: "age", label: "Age" },
  { key: "state", label: "State / Union Territory" },
  { key: "occupation", label: "Occupation" },
  { key: "annualHouseholdIncome", label: "Annual household income" },
];
export const emptyProfile = () => ({
  age: null,
  state: null,
  district: "",
  occupation: null,
  annualHouseholdIncome: null,
});
export function profileCompletion(profile) {
  const values = {
    age:
      Number.isInteger(profile.age) && profile.age >= 0 && profile.age <= 120,
    state: STATES_AND_UTS.includes(profile.state),
    occupation: OCCUPATIONS.some(
      (option) => option.value === profile.occupation,
    ),
    annualHouseholdIncome:
      Number.isInteger(profile.annualHouseholdIncome) &&
      profile.annualHouseholdIncome >= 0 &&
      profile.annualHouseholdIncome <= MAX_INCOME,
  };
  const missingFields = CORE_FIELDS.filter((field) => !values[field.key]).map(
    (field) => field.key,
  );
  const completedFields = CORE_FIELDS.length - missingFields.length;
  return {
    percentage: Math.round((completedFields / CORE_FIELDS.length) * 100),
    completedFields,
    totalFields: CORE_FIELDS.length,
    isComplete: missingFields.length === 0,
    missingFields,
  };
}
