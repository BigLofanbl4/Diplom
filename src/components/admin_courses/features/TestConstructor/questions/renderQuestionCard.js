import { QUESTION_TYPE_REGISTRY } from "./questionTypeRegistry.js";

export function renderQuestionCard(questionData) {
  const typeConfig = QUESTION_TYPE_REGISTRY[questionData.type];
  if (!typeConfig) {
    throw new Error(`Question type "${questionData.type}" not found.`);
  }
  return typeConfig.renderCard(questionData);
}
