import { BaseChoiceQuestionEditor } from "./BaseChoiceQuestionEditor.js";

export class SingleChoiceQuestionEditor extends BaseChoiceQuestionEditor {
  constructor({ questionData, formElement }) {
    super({ questionData, formElement, inputType: "radio" });
  }

  validateQuestionDraft(draft) {
    const result = { ok: true, errors: [] };
    if (String(draft.text).trim() === "") {
      result.ok = false;
      result.errors.push({ type: "empty_condition", message: "Пустой текст вопроса" });
    }

    if (!Array.isArray(draft.options) || draft.options.length === 0) {
      result.ok = false;
      result.errors.push({ type: "empty_options", message: "Отсутствуют варианты ответов на вопрос" });
      return result;
    }

    if (String(draft.answer).trim() === "") {
      result.ok = false;
      result.errors.push({ type: "empty_answer", message: "Пустой ответ на вопрос" });
    }

    return result;
  }

  getQuestionAnswer() {
    return [this.questionBodyElement.querySelector('input[name="answer"]:checked')?.value] ?? [];
  }
}
