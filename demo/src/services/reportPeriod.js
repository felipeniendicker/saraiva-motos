function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function formatAppliedPeriod({ startDate = "", endDate = "" } = {}) {
  if (!startDate && !endDate) return "Todo o período";
  if (startDate && endDate) return `${formatDate(startDate)} a ${formatDate(endDate)}`;
  if (startDate) return `A partir de ${formatDate(startDate)}`;
  return `Até ${formatDate(endDate)}`;
}
