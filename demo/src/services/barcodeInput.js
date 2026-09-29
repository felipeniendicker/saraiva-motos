export function submitBarcodeValue(value, onSubmit) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return false;
  onSubmit(normalized);
  return true;
}

export function handleBarcodeKeyDown(event, value, onSubmit) {
  if (event.key !== "Enter") return false;
  event.preventDefault();
  return submitBarcodeValue(value, onSubmit);
}
