import { TextQuestionEditor } from "./editors/TextQuestionEditor.js";
import { SingleChoiceQuestionEditor } from "./editors/SingleChoiceQuestionEditor.js";
import { MultipleChoiceQuestionEditor } from "./editors/MultipleChoiceQuestionEditor.js";
import {
  renderMultipleChoiceQuestionCard,
  renderSingleChoiceQuestionCard,
  renderTextQuestionCard,
} from "./templates/questionCardTemplates.js";

function createQuestionId() {
  return crypto.randomUUID();
}

export const QUESTION_TYPE_REGISTRY = {
  text: {
    Editor: TextQuestionEditor,
    renderCard: renderTextQuestionCard,
    createEmptyDraft: () => ({ uiId: createQuestionId(), type: "text", text: "", answer: "" }),
  },
  single_choice: {
    Editor: SingleChoiceQuestionEditor,
    renderCard: renderSingleChoiceQuestionCard,
    createEmptyDraft: () => ({ uiId: createQuestionId(), type: "single_choice", text: "", answer: "", options: [] }),
  },
  multiple_choice: {
    Editor: MultipleChoiceQuestionEditor,
    renderCard: renderMultipleChoiceQuestionCard,
    createEmptyDraft: () => ({ uiId: createQuestionId(), type: "multiple_choice", text: "", answer: [], options: [] }),
  },
};
