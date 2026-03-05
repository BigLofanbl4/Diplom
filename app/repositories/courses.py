from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.courses import Test, Question


class TestRepository:
    def __init__(self, db):
        self.db = db

    def create(self, course_id: int, title: str, lesson_id: int):
        course = Test(course_id=course_id, title=title, lesson_id=lesson_id)
        self.db.add(course)
        self.db.commit()

    def update(self, test_id: int, questions: list):
        stmt = select(Test).where(Test.id == test_id).options(selectinload(Test.questions))
        test = self.db.scalar(stmt)
        test.questions.clear()

        question = QuestionRepository(db=self.db)
        for dct in questions:
            question.create(
                front_id=dct['front_id'],
                text=dct['text'],
                test_id=dct['test_id'],
                type_id=dct['type_id'],
            )
        self.db.commit()

    # def delete(self, test_id: int):
    #     stmt = select(Test).where(Test.id == test_id)
    #     self.db.delete(stmt)
    #     self.db.commit()


class QuestionRepository:
    def __init__(self, db):
        self.db = db

    def create(self, front_id: str, text: str, test_id: int, type_id: int):
        question = Question(
            front_id=front_id,
            text=text,
            test_id=test_id,
            type_id=type_id,
        )
        self.db.add(question)
        self.db.commit()

    def delete(self, question_id: int):
        stmt = select(Question).where(Question.id == question_id)
        self.db.delete(stmt)
        self.db.commit()
