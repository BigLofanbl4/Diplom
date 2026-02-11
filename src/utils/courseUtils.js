export function getModuleData(courseData) {
  return courseData.modules.map(module => ({
    ...module,
    lessons: courseData.lessons.filter(lesson => lesson.module_id === module.id)
  }));
}