export const SCREENING_STATUSES = {
  basic_match: {
    label: "Basic criteria match",
    description:
      "All checked criteria match your answers. Other conditions and official verification still apply.",
  },
  needs_info: {
    label: "More information needed",
    description:
      "At least one checked requirement needs more information or provider clarification.",
  },
  criteria_not_met: {
    label: "A checked criterion isn’t met",
    description:
      "At least one requirement does not match the supplied details. Review the reasons before your next step.",
  },
  not_assessed: {
    label: "Not screened",
    description: "Reviewed rules are not available for this catalog entry.",
  },
};
