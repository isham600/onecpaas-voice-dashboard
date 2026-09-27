/**
 * Utility function to generate and download sample CSV with dynamic attributes
 * First column is always PhoneNumber, followed by dynamic attribute columns
 */

export const downloadSampleCsv = (
  attributes,
  uploadType = "Customized",
  fileName = "Sample_CSV.csv",
) => {
  let sampleContent = "";

  if (uploadType === "Bulk") {
    sampleContent =
      "PhoneNumber\n918517999182\n918878699182\n7000203011\n919783471692";
  } else {
    // Customized mode with dynamic attributes
    const attrKeys = Object.keys(attributes);
    const cols = attrKeys.length > 0 ? attrKeys : ["attribute1", "attribute2"];

    const header = ["PhoneNumber", ...cols].join(",");
    const row1 = ["919783471692", ...cols.map((_, i) => `Value${i + 1}`)].join(
      ",",
    );
    const row2 = ["918878699182", ...cols.map((_, i) => `Value${i + 1}`)].join(
      ",",
    );
    sampleContent = `${header}\n${row1}\n${row2}`;
  }

  const blob = new Blob([sampleContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Generate sample CSV with URL variables (for WhatsApp with button links)
 */
export const downloadSampleCsvWithUrlVariables = (
  attributes,
  urlVariables,
  uploadType = "Customized",
  fileName = "Sample_CSV.csv",
) => {
  let sampleContent = "";

  if (uploadType === "Bulk") {
    sampleContent =
      "PhoneNumber\n918517999182\n918878699182\n7000203011\n919783471692";
  } else {
    const attrKeys = Object.keys(attributes);
    const cols = attrKeys.length > 0 ? attrKeys : ["attribute1", "attribute2"];

    const urlVarColumns = Object.keys(urlVariables)
      .map((_, index) => `URLVar_Button${index + 1}`)
      .join(",");
    const sampleUrlValues1 = Object.keys(urlVariables)
      .map(() => "value1")
      .join(",");
    const sampleUrlValues2 = Object.keys(urlVariables)
      .map(() => "value2")
      .join(",");

    const header = ["PhoneNumber", ...cols, urlVarColumns].join(",");
    const row1 = [
      "919783471692",
      ...cols.map((_, i) => `Value${i + 1}`),
      sampleUrlValues1,
    ].join(",");
    const row2 = [
      "918878699182",
      ...cols.map((_, i) => `Value${i + 1}`),
      sampleUrlValues2,
    ].join(",");
    sampleContent = `${header}\n${row1}\n${row2}`;
  }

  const blob = new Blob([sampleContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
