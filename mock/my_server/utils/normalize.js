export function normalizeNullableField(value) {
  return value === null || value === undefined || value === "" ? null : value;
}

export function normalizeNullableId(value) {
  const normalizedValue = normalizeNullableField(value);
  if (normalizedValue === null) return null;
  const numberValue = Number(normalizedValue);
  return Number.isNaN(numberValue) ? null : numberValue;
}
