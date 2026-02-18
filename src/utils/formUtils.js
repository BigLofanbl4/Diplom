export function showFieldError({field, message, position = "afterend"}) {
  if (!field) return;

  field.classList.add('invalid');
  const messageElem = document.createElement("span");
  messageElem.classList.add('form-error');
  messageElem.textContent = message;
  messageElem.dataset.errorMessage = "true";
  field.insertAdjacentElement(position, messageElem);
}

export function clearFieldErrors(root) {
  if (!root) return;
  const invalidFields = root.querySelectorAll('.invalid');
  invalidFields.forEach(elem => elem.classList.remove("invalid"));
  const messageElems = root.querySelectorAll('[data-error-message]');
  messageElems.forEach(elem => elem.remove());
}