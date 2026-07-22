import {
  AcademicCceType,
  AcademicEventType,
  AcademicHomeworkStatus,
  AcademicLessonPlanStatus,
  AcademicWorkloadLevel,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { nextAcademicRecordId } from './academicManagement.js';
import { ensureTeacherDevCycles, bulkGenerateEvaluations, updateTeacherEvaluation } from './teacherEvaluation.js';
import { createRosterTask, syncAllocationsToRoster, publishTeacherRosterTasks } from './teacherRoster.js';

export async function seedAcademicDemoData(institutionId: string, academicYear = '2025-26') {
  const existing = await prisma.academicClassSection.count({ where: { institutionId } });
  if (existing > 0) return { seeded: false, message: 'Academic data already exists' };

  const classes = [
    { className: 'Class 6', sectionName: 'A', teacher: 'Ms. Pooja Sharma' },
    { className: 'Class 7', sectionName: 'A', teacher: 'Ms. Kavita Gupta' },
    { className: 'Class 8', sectionName: 'B', teacher: 'Mr. Rahul Mehta' },
    { className: 'Class 9', sectionName: 'B', teacher: 'Mr. Amit Kumar' },
    { className: 'Class 10', sectionName: 'A', teacher: 'Dr. Neha Verma' },
  ];

  for (const c of classes) {
    await prisma.academicClassSection.create({
      data: {
        institutionId,
        recordId: await nextAcademicRecordId(institutionId, 'classSection'),
        academicYear,
        className: c.className,
        sectionName: c.sectionName,
        capacity: 40,
        room: `Room ${c.className.replace(/\D/g, '')}0`,
        classTeacher: c.teacher,
      },
    });
  }

  const subjects = [
    { name: 'Mathematics', code: 'MATH', type: 'Core', group: 'Science' },
    { name: 'Science', code: 'SCI', type: 'Core', group: 'Science' },
    { name: 'English', code: 'ENG', type: 'Core', group: 'Languages' },
    { name: 'Social Science', code: 'SST', type: 'Core', group: 'Humanities' },
    { name: 'Computer', code: 'CS', type: 'Elective', group: 'Technology' },
  ];

  const subjectIds: string[] = [];
  for (const s of subjects) {
    const row = await prisma.academicSubject.create({
      data: {
        institutionId,
        recordId: await nextAcademicRecordId(institutionId, 'subject'),
        subjectName: s.name,
        subjectCode: s.code,
        subjectType: s.type,
        subjectGroup: s.group,
        isElective: s.type === 'Elective',
      },
    });
    subjectIds.push(row.id);
  }

  const teachers = [
    { name: 'Dr. Neha Verma', dept: 'Mathematics' },
    { name: 'Mr. Rahul Mehta', dept: 'Science' },
    { name: 'Ms. Pooja Sharma', dept: 'English' },
    { name: 'Mr. Amit Kumar', dept: 'Social Science' },
    { name: 'Ms. Kavita Gupta', dept: 'Computer' },
  ];

  for (const c of classes) {
    for (let i = 0; i < subjectIds.length; i++) {
      const courseStart = new Date('2025-04-01');
      const courseEnd = new Date('2026-03-15');
      const revision = new Date('2026-02-01');
      await prisma.academicSubjectAllocation.create({
        data: {
          institutionId,
          recordId: await nextAcademicRecordId(institutionId, 'allocation'),
          subjectId: subjectIds[i],
          academicYear,
          className: c.className,
          sectionName: c.sectionName,
          teacherName: teachers[i % teachers.length].name,
          teacherEmail: `${teachers[i % teachers.length].name.toLowerCase().replace(/\s/g, '.')}@school.edu`,
          courseStartDate: courseStart,
          courseCompletionDeadline: courseEnd,
          revisionDeadline: revision,
        },
      });
    }
  }

  const syllabusTopics = ['Number Systems', 'Algebra', 'Geometry', 'Literature', 'Grammar'];
  for (const c of classes) {
    for (const subj of subjects.slice(0, 3)) {
      for (let u = 0; u < 3; u++) {
        const revDate = new Date('2026-01-15');
        revDate.setMonth(revDate.getMonth() + u);
        await prisma.academicSyllabusChapter.create({
          data: {
            institutionId,
            recordId: await nextAcademicRecordId(institutionId, 'syllabus'),
            academicYear,
            term: 'Term 1',
            className: c.className,
            sectionName: c.sectionName,
            subjectName: subj.name,
            chapterTitle: `${subj.name} — ${syllabusTopics[u % syllabusTopics.length]}`,
            unitNumber: u + 1,
            plannedStartDate: new Date('2025-04-01'),
            plannedEndDate: new Date('2025-08-31'),
            revisionDeadline: revDate,
            completionPercent: 60 + (u * 10) + Math.floor(Math.random() * 15),
          },
        });
      }
    }
  }

  const periods = [
    { label: 'P1', start: '08:00', end: '08:40', type: 'THEORY' as const },
    { label: 'P2', start: '08:50', end: '09:30', type: 'THEORY' as const },
    { label: 'P3', start: '09:40', end: '10:20', type: 'LAB' as const },
    { label: 'P4', start: '10:40', end: '11:20', type: 'PRACTICAL' as const },
    { label: 'P5', start: '11:30', end: '12:10', type: 'SPORTS' as const },
    { label: 'P6', start: '12:20', end: '13:00', type: 'THEORY' as const },
  ];
  const periodTypes = ['THEORY', 'PRACTICAL', 'LAB', 'SPORTS', 'EVENT'] as const;
  const yearStart = new Date('2025-04-01');
  const yearEnd = new Date('2026-03-31');
  for (const c of classes) {
    for (let day = 1; day <= 6; day++) {
      for (let p = 0; p < periods.length; p++) {
        const pt = periodTypes[(p + day) % periodTypes.length];
        await prisma.academicTimetableSlot.create({
          data: {
            institutionId,
            recordId: await nextAcademicRecordId(institutionId, 'timetable'),
            academicYear,
            term: 'Term 1',
            className: c.className,
            sectionName: c.sectionName,
            dayOfWeek: day,
            period: p + 1,
            periodLabel: periods[p].label,
            periodType: pt,
            startTime: periods[p].start,
            endTime: periods[p].end,
            subjectName: subjects[(p + day) % subjects.length].name,
            teacherName: teachers[(p + day) % teachers.length].name,
            room: `Room ${100 + p}`,
            effectiveFrom: yearStart,
            effectiveTo: yearEnd,
            versionLabel: 'Term 1 Master',
            publishedAt: new Date(),
          },
        });
      }
    }
  }

  const planStatuses: AcademicLessonPlanStatus[] = ['COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'PENDING', 'DRAFT'];
  const bloomsLevels = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'] as const;
  const methods = ['Lecture', 'Demonstration', 'Group Discussion', 'Project-Based', 'Lab Activity'];
  const objectives = [
    'Students will understand core concepts and apply them to problems',
    'Students will analyze real-world scenarios using subject knowledge',
    'Students will evaluate solutions and create original responses',
  ];
  const createdPlans: { id: string; className: string; sectionName: string; subjectName: string }[] = [];
  for (let i = 0; i < 15; i++) {
    const c = classes[i % classes.length];
    const subj = subjects[i % subjects.length];
    const status = planStatuses[i % planStatuses.length];
    const plan = await prisma.academicLessonPlan.create({
      data: {
        institutionId,
        recordId: await nextAcademicRecordId(institutionId, 'lessonPlan'),
        academicYear,
        term: 'Term 1',
        className: c.className,
        sectionName: c.sectionName,
        subjectName: subj.name,
        department: subj.group,
        title: `${subj.name} Lesson ${i + 1}`,
        teacherName: teachers[i % teachers.length].name,
        objective: objectives[i % objectives.length],
        teachingMethod: methods[i % methods.length],
        propsUsed: 'Whiteboard, Textbook, Charts',
        bloomsLevel: bloomsLevels[i % bloomsLevels.length],
        resultMeasurement: 'Class test score distribution and student participation',
        status,
        completionPercent: status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? 65 : 0,
        sharedAt: status !== 'DRAFT' ? new Date() : null,
      },
    });
    createdPlans.push({ id: plan.id, className: c.className, sectionName: c.sectionName, subjectName: subj.name });

    if (i < 8) {
      const classTest = await prisma.academicClassTest.create({
        data: {
          institutionId,
          recordId: await nextAcademicRecordId(institutionId, 'classTest'),
          lessonPlanId: plan.id,
          academicYear,
          term: 'Term 1',
          className: c.className,
          sectionName: c.sectionName,
          subjectName: subj.name,
          teacherName: teachers[i % teachers.length].name,
          title: `Class Test — ${subj.name}: Lesson ${i + 1}`,
          maxMarks: 100,
          conductedDate: i < 5 ? new Date() : null,
          status: i < 5 ? 'Conducted' : 'Scheduled',
          publishedAt: i < 5 ? new Date() : null,
        },
      });

      if (i < 5) {
        const sectionStudents = await prisma.student.findMany({
          where: { institutionId, className: c.className, sectionName: c.sectionName },
          take: 12,
        });
        const scoreSamples = [92, 85, 78, 72, 68, 55, 48, 42, 88, 95, 61, 33];
        for (let si = 0; si < sectionStudents.length; si++) {
          const pct = scoreSamples[si % scoreSamples.length];
          const bucket = pct >= 80 ? 'EXCELLENT' : pct >= 60 ? 'GOOD' : pct >= 36 ? 'AVERAGE' : 'BELOW';
          await prisma.academicClassTestScore.create({
            data: {
              institutionId,
              classTestId: classTest.id,
              studentId: sectionStudents[si].id,
              marksObtained: pct,
              maxMarks: 100,
              percentage: pct,
              bucket,
            },
          });
        }
      }
    }
  }

  const hwStatuses: AcademicHomeworkStatus[] = ['SUBMITTED', 'ASSIGNED', 'PENDING', 'OVERDUE'];
  const today = new Date();
  today.setHours(10, 0, 0, 0);
  for (let i = 0; i < 12; i++) {
    const c = classes[i % classes.length];
    const subj = subjects[i % subjects.length];
    const teacher = teachers[i % teachers.length];
    const status = hwStatuses[i % hwStatuses.length];
    const total = 35;
    const submitted = status === 'SUBMITTED' ? 31 : status === 'PENDING' ? 20 : status === 'OVERDUE' ? 15 : 0;
    const assignedDate = new Date(today);
    if (i >= 6) assignedDate.setDate(assignedDate.getDate() - 1);
    await prisma.academicHomework.create({
      data: {
        institutionId,
        recordId: await nextAcademicRecordId(institutionId, 'homework'),
        academicYear,
        term: 'Term 1',
        className: c.className,
        sectionName: c.sectionName,
        subjectName: subj.name,
        teacherName: teacher.name,
        title: `${subj.name} Homework ${i + 1}`,
        description: `Complete exercises from Chapter ${i + 1}. Submit via mobile app.`,
        assignedDate,
        status,
        totalStudents: total,
        submittedCount: submitted,
        sharedAt: new Date(),
        publishedAt: new Date(),
        dueDate: new Date(Date.now() + (i - 6) * 86400000),
      },
    });
  }

  const events: { title: string; type: AcademicEventType; days: number }[] = [
    { title: 'Unit Test - Science (Class 8-10)', type: 'EXAM', days: 3 },
    { title: 'Project Submission', type: 'ACTIVITY', days: 5 },
    { title: 'Parent Teacher Meeting', type: 'PTM', days: 7 },
    { title: 'Inter House Debate', type: 'ACTIVITY', days: 11 },
    { title: 'Term 1 Exams Start', type: 'EXAM', days: 24 },
  ];
  for (const e of events) {
    const d = new Date();
    d.setDate(d.getDate() + e.days);
    await prisma.academicCalendarEvent.create({
      data: {
        institutionId,
        recordId: await nextAcademicRecordId(institutionId, 'calendar'),
        academicYear,
        term: 'Term 1',
        boardName: 'CBSE',
        title: e.title,
        eventType: e.type,
        eventDate: d,
        sharedToParents: true,
        publishedAt: new Date(),
        eventSource: 'MANUAL',
      },
    });
  }

  const cceTypes: AcademicCceType[] = ['UNIT_TEST', 'ASSIGNMENT', 'PROJECT', 'ACTIVITY'];
  for (let i = 0; i < 20; i++) {
    const c = classes[i % classes.length];
    const type = cceTypes[i % cceTypes.length];
    await prisma.academicCceRecord.create({
      data: {
        institutionId,
        recordId: await nextAcademicRecordId(institutionId, 'cce'),
        academicYear,
        term: 'Term 1',
        className: c.className,
        sectionName: c.sectionName,
        cceType: type,
        title: `${CCE_LABEL[type]} ${i + 1}`,
        subjectName: subjects[i % subjects.length].name,
        conductedDate: new Date(),
        evaluatedCount: 30 + (i % 5),
      },
    });
  }

  const coActivities = [
    { title: 'Inter-House Basketball Tournament', category: 'PHYSICAL_HEALTH', sub: 'TEAM_INDIVIDUAL_SPORTS', type: 'Basketball', teacher: 'Mr. Rahul Mehta', days: 7, criteria: 'Teamwork, skill, sportsmanship — scored out of 100' },
    { title: 'Morning Yoga & Wellness Session', category: 'PHYSICAL_HEALTH', sub: 'WELLNESS', type: 'Yoga', teacher: 'Ms. Pooja Sharma', days: 3, criteria: 'Participation, posture, consistency' },
    { title: 'NCC Drill & Discipline Camp', category: 'PHYSICAL_HEALTH', sub: 'DISCIPLINE_DRILLS', type: 'National Cadet Corps (NCC)', teacher: 'Mr. Amit Kumar', days: 14, criteria: 'Discipline, drill precision, leadership' },
    { title: 'Basic Financial Literacy Workshop', category: 'WORK_EDUCATION', sub: 'PRACTICAL_SKILLS', type: 'Basic Financial Literacy', teacher: 'Dr. Neha Verma', days: 10, criteria: 'Worksheet completion, practical exercises' },
    { title: 'Public Speaking & Debate Workshop', category: 'WORK_EDUCATION', sub: 'SOFT_SKILLS', type: 'Public Speaking', teacher: 'Ms. Kavita Gupta', days: 12, criteria: 'Clarity, confidence, content quality' },
    { title: 'Eco-Club Tree Plantation Drive', category: 'WORK_EDUCATION', sub: 'ENVIRONMENTAL_AWARENESS', type: 'Tree Planting Drive', teacher: 'Mr. Rahul Mehta', days: 5, criteria: 'Participation, sapling care plan submission' },
    { title: 'Annual Art Exhibition — Painting & Pottery', category: 'VISUAL_PERFORMING_ARTS', sub: 'VISUAL_ARTS', type: 'Painting', teacher: 'Ms. Pooja Sharma', days: 20, criteria: 'Creativity, technique, presentation' },
    { title: 'School Choir & Instrumental Recital', category: 'VISUAL_PERFORMING_ARTS', sub: 'PERFORMING_ARTS', type: 'Choir', teacher: 'Ms. Kavita Gupta', days: 18, criteria: 'Rhythm, pitch, stage presence' },
    { title: 'Student Council Elections', category: 'LEADERSHIP_COMMUNITY', sub: 'GOVERNANCE', type: 'Student Council', teacher: 'Dr. Neha Verma', days: 8, criteria: 'Campaign quality, voter participation, conduct' },
    { title: 'Robotics Club Competition', category: 'LEADERSHIP_COMMUNITY', sub: 'CLUBS_SOCIETIES', type: 'Robotics', teacher: 'Mr. Amit Kumar', days: 15, criteria: 'Design, programming, teamwork' },
    { title: 'NSS Community Teaching Program', category: 'LEADERSHIP_COMMUNITY', sub: 'SOCIAL_WORK', type: 'Teaching Underprivileged Children', teacher: 'Ms. Pooja Sharma', days: 25, criteria: 'Hours served, student feedback, reflection report' },
  ];
  for (const a of coActivities) {
    const d = new Date();
    d.setDate(d.getDate() + a.days);
    const start = new Date();
    start.setDate(start.getDate() + a.days - 14);
    const c = classes[a.days % classes.length];
    await prisma.academicCoScholasticActivity.create({
      data: {
        institutionId,
        recordId: await nextAcademicRecordId(institutionId, 'coScholastic'),
        academicYear,
        term: 'Term 1',
        title: a.title,
        category: a.category,
        subCategory: a.sub,
        activityType: a.type,
        className: c.className,
        sectionName: c.sectionName,
        teacherName: a.teacher,
        activityDate: d,
        startDate: start,
        endDate: d,
        venue: 'School Campus',
        description: `${a.type} co-scholastic activity for ${c.className}.`,
        measurementCriteria: a.criteria,
        maxScore: 100,
        status: a.days < 10 ? 'IN_PROGRESS' : 'SCHEDULED',
        publishedAt: a.days < 12 ? new Date() : null,
      },
    });
  }

  const workloadLevels: AcademicWorkloadLevel[] = ['FULL', 'FULL', 'MEDIUM', 'LOW'];
  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i];
    for (const c of classes.slice(0, 2)) {
      await prisma.academicTeacherAllocation.create({
        data: {
          institutionId,
          recordId: await nextAcademicRecordId(institutionId, 'teacher'),
          academicYear,
          teacherName: t.name,
          department: t.dept,
          className: c.className,
          sectionName: c.sectionName,
          subjectName: subjects[i % subjects.length].name,
          periodsPerWeek: 18 + (i % 6),
          workloadLevel: workloadLevels[i % workloadLevels.length],
        },
      });
    }
  }

  await ensureTeacherDevCycles(institutionId, academicYear);
  const cycles = await prisma.academicTeacherDevCycle.findMany({
    where: { institutionId, academicYear },
    orderBy: { cycleNumber: 'asc' },
  });
  const cycle1 = cycles[0];
  if (cycle1) {
    await bulkGenerateEvaluations(institutionId, cycle1.id);
    const evals = await prisma.academicTeacherEvaluation.findMany({
      where: { institutionId, devCycleId: cycle1.id },
      take: 6,
    });
    const sampleScores = [
      { task: 88, plan: 82, eng: 75, parent: 80, student: 78 },
      { task: 72, plan: 70, eng: 68, parent: 65, student: 60 },
      { task: 92, plan: 90, eng: 85, parent: 88, student: 86 },
      { task: 55, plan: 58, eng: 52, parent: 50, student: 48 },
      { task: 78, plan: 76, eng: 80, parent: 74, student: 72 },
      { task: 85, plan: 83, eng: 79, parent: 82, student: 77 },
    ];
    for (let i = 0; i < evals.length; i++) {
      const s = sampleScores[i % sampleScores.length];
      await updateTeacherEvaluation(institutionId, evals[i].id, {
        taskActionScore: s.task,
        taskActionNotes: 'Tasks completed on schedule with documented follow-up.',
        improvementPlanScore: s.plan,
        improvementPlanNotes: 'Class improvement plan submitted and reviewed.',
        parentEngagementScore: s.eng,
        parentFeedbackScore: s.parent,
        studentFeedbackScore: s.student,
        status: i < 3 ? 'COMPLETED' : 'DRAFT',
        evaluatedBy: 'Academic Coordinator',
      });
    }
  }

  await syncAllocationsToRoster(institutionId, academicYear);

  const rosterTasks = [
    { teacher: 'Dr. Neha Verma', type: 'TASK' as const, title: 'Prepare Term 1 Question Papers', class: 'Class 10', section: 'A', subject: 'Mathematics', days: 14 },
    { teacher: 'Mr. Rahul Mehta', type: 'ACTIVITY' as const, title: 'Plan Science Exhibition Booth', class: 'Class 8', section: 'B', subject: 'Science', days: 10 },
    { teacher: 'Ms. Pooja Sharma', type: 'EVENT' as const, title: 'Organize Annual Day Rehearsals', class: 'Class 6', section: 'A', subject: '', days: 21 },
    { teacher: 'Mr. Amit Kumar', type: 'PARENT_ENGAGEMENT' as const, title: 'Class 9-B PTM & Parent Feedback Session', class: 'Class 9', section: 'B', subject: '', days: 7 },
    { teacher: 'Ms. Kavita Gupta', type: 'OTHER' as const, title: 'Update Computer Lab Software', class: '', section: '', subject: 'Computer', days: 5 },
  ];

  for (const t of rosterTasks) {
    const due = new Date();
    due.setDate(due.getDate() + t.days);
    const c = classes.find((cl) => cl.className === t.class) || classes[0];
    await createRosterTask(institutionId, {
      academicYear,
      teacherName: t.teacher,
      department: 'General',
      taskType: t.type,
      title: t.title,
      className: t.class || c.className,
      sectionName: t.section || c.sectionName,
      subjectName: t.subject,
      dueDate: due.toISOString(),
      description: `Assigned during academic year ${academicYear}`,
      feedbackRequired: t.type === 'PARENT_ENGAGEMENT',
      assignedBy: 'Academic Coordinator',
      status: t.days < 8 ? 'IN_PROGRESS' : 'PENDING',
    });
  }

  await publishTeacherRosterTasks(institutionId, { academicYear });

  return { seeded: true, message: 'Academic demo data seeded' };
}

const CCE_LABEL: Record<AcademicCceType, string> = {
  UNIT_TEST: 'Unit Test',
  ASSIGNMENT: 'Assignment',
  PROJECT: 'Project',
  ACTIVITY: 'Activity',
};
