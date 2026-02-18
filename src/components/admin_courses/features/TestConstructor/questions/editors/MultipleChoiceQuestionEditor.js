import { BaseChoiceQuestionEditor } from "./BaseChoiceQuestionEditor.js";

export class MultipleChoiceQuestionEditor extends BaseChoiceQuestionEditor {
  constructor({ questionData = null, formElement }) {
    super({ questionData, formElement, inputType: "checkbox" });
  }

  validateQuestionDraft(draft) {
    const result = { ok: true, errors: [] };
    if (String(draft.text).trim() === "") {
      result.ok = false;
      result.errors.push({ type: "empty_condition", message: "Пустой текст вопроса" });
    }

    if (!Array.isArray(draft.options) || draft.options.length === 0) {
      result.ok = false;
      result.errors.push({ type: "empty_options", message: "Отсутствуют варианты ответов" });
      return result;
    }

    if (!Array.isArray(draft.answer) || draft.answer.length === 0) {
      result.ok = false;
      result.errors.push({ type: "empty_answer", message: "Отсутствуют выбранные ответы" });
    }

    return result;
  }

  getQuestionAnswer() {
    const answerElements = this.questionBodyElement.querySelectorAll('input[name="answer"]:checked');
    return Array.from(answerElements).map((element) => element.value.trim());
  }
}
