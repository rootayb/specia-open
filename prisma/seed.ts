import { PrismaClient } from "@prisma/client";
import curriculumCatalog from "../src/data/bep_curriculum_catalog_full.json";
import { normalizeCurriculumCatalog } from "../src/lib/curriculum-catalog";

const prisma = new PrismaClient();

async function main() {
  const courses = normalizeCurriculumCatalog(curriculumCatalog);

  await prisma.curriculumOutcome.deleteMany();
  await prisma.curriculumTheme.deleteMany();
  await prisma.curriculumCourse.deleteMany();

  for (const course of courses) {
    const themes = course.themes ?? [];

    await prisma.curriculumCourse.create({
      data: {
        courseId: course.courseId,
        courseName: course.courseName,
        applicableGradeLevels: course.applicableGradeLevels,
        hasCatalogContent: course.hasCatalogContent,
        themes: {
          create: themes.map((theme) => ({
            themeOrder: theme.themeOrder,
            themeName: theme.themeName,
            tendencies: theme.tendencies,
            outcomes: {
              create: theme.outcomes.map((outcome) => ({
                outcomeCode: outcome.outcomeCode,
                outcomeText: outcome.outcomeText,
                processComponents: outcome.processComponents,
              })),
            },
          })),
        },
      },
    });
  }

  console.log(`Seeded ${courses.length} curriculum courses.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
