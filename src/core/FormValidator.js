export default class FormValidator {
  constructor(form) {
    this.form = form;
  }

  isValid() {
    return this.form.checkValidity();
  }

  highlightInvalidFields() {
    const fields = Array.from(this.form.elements);
    fields.forEach((field) => {
      if (field.name && !field.validity.valid) {
        field.classList.add("invalid");
      } else {
        field.classList.remove("invalid");
      }
    });

    this.form.reportValidity();
  }
}