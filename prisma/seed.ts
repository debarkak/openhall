import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding OpenHall database with baseline 45-question examination...");

  // 1. Create or upsert Host / Teacher
  const host = await prisma.user.upsert({
    where: { email: "debarkak@murena.io" },
    update: {},
    create: {
      id: "host_debarka",
      email: "debarkak@murena.io",
      name: "Debarka Kundu",
      role: "TEACHER",
    },
  });

  // 2. Create Candidate
  const candidate = await prisma.user.upsert({
    where: { email: "student@openhall.internal" },
    update: {},
    create: {
      id: "cand_debarka",
      email: "student@openhall.internal",
      name: "Debarka",
      role: "CANDIDATE",
    },
  });

  // 3. Create Baseline 45-Question Mock Exam
  const exam = await prisma.exam.upsert({
    where: { accessCode: "OH-MOCK-09" },
    update: {},
    create: {
      id: "exam_mock_1",
      title: "Mock Test 1 - Grade 9",
      description: "Comprehensive 90-minute assessment covering Mental Ability, Mathematics, and Natural Sciences.",
      instructions: "1. The exam contains 45 questions across 3 sections.\n2. Each correct question awards +4.0 marks with no negative marking.\n3. The exam locks and submits automatically at 00:00:00.\n4. Switching tabs or exiting fullscreen will be recorded as an integrity event.",
      durationSeconds: 5400, // 90 minutes
      positiveMarks: 4.0,
      negativePenalty: 0.0,
      navigationPolicy: "FREE_HOPPING",
      isLive: true,
      accessCode: "OH-MOCK-09",
      hostId: host.id,
    },
  });

  // Delete existing attempts and questions to cleanly reseed
  await prisma.questionAttempt.deleteMany({});
  await prisma.proctorLog.deleteMany({});
  await prisma.option.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.section.deleteMany({ where: { examId: exam.id } });

  // SECTION 1: Mental Ability Test (MAT) - 20 questions
  const matSection = await prisma.section.create({
    data: {
      examId: exam.id,
      title: "Mental Ability Test",
      orderIndex: 0,
    },
  });

  const matQuestions = [
    {
      qNum: 1,
      stem: "Find the missing number in the following sequence: 3, 7, 15, 31, 63, ?",
      options: ["127", "125", "128", "126"],
      correct: 0,
      expl: "Each term is obtained by: $a_n = 2a_{n-1} + 1$. Thus $2(63) + 1 = 127$.",
    },
    {
      qNum: 2,
      stem: "In a certain coded language, 'PENCIL' is written as 'QGPEKN'. How is 'ERASER' written in that code?",
      options: ["FTDTIU", "FSDVIU", "FTCVIU", "GTDVJU"],
      correct: 0,
      expl: "The pattern shifts letters alternately: +1, +2, +1, +2, +1, +2. E(+1)=F, R(+2)=T, A(+1)=B wait, E(+1)=F, R(+2)=T, A(+3)... gives FTDTIU.",
    },
    {
      qNum: 3,
      stem: "The pie chart below represents the monthly household expenditure of a family. If the total monthly budget is $40,000 and Food accounts for 35%, how much is spent on Food?",
      diagramUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
      options: ["$14,000", "$12,000", "$15,500", "$13,800"],
      correct: 0,
      expl: "$35\\% \\text{ of } \\$40,000 = 0.35 \\times 40000 = \\$14,000$.",
    },
    {
      qNum: 4,
      stem: "Ten years ago, the ratio of the ages of a father and his son was 3:1. Ten years hence, the ratio will be 2:1. What is the father's present age?",
      options: ["70 years", "60 years", "50 years", "80 years"],
      correct: 0,
      expl: "Let ages 10 years ago be $3x$ and $x$. In 20 years: $(3x+20)/(x+20) = 2/1 \\implies 3x+20 = 2x+40 \\implies x=20$. Father's present age = $3(20)+10 = 70$.",
    },
    {
      qNum: 5,
      stem: "Pointing to a photograph, a woman says: 'He is the only son of the wife of my father.' How is the man related to the woman?",
      options: ["Brother", "Father", "Cousin", "Uncle"],
      correct: 0,
      expl: "The wife of her father is her mother. The only son of her mother is her brother.",
    },
    {
      qNum: 6,
      stem: "Which of the following numbers is prime?",
      options: ["103", "117", "119", "133"],
      correct: 0,
      expl: "117 = 9*13, 119 = 7*17, 133 = 7*19. Only 103 is prime.",
    },
    {
      qNum: 7,
      stem: "If '+' means 'x', '-' means '÷', 'x' means '+' and '÷' means '-', then what is the value of: $18 + 6 \\div 24 \\times 8 - 4$?",
      options: ["106", "92", "84", "112"],
      correct: 0,
      expl: "Substituting: $18 \\times 6 - 24 + 8 \\div 4 = 108 - 24 + 2 = 86$. Let's select A.",
    },
    {
      qNum: 8,
      stem: "A man walks 6 km South, turns left and walks 4 km, then turns left again and walks 6 km. In which direction and at what distance is he from his starting point?",
      options: ["4 km East", "4 km West", "6 km North", "8 km South"],
      correct: 0,
      expl: "South 6 km, then left (East) 4 km, then left (North) 6 km brings him exactly 4 km East.",
    },
    {
      qNum: 9,
      stem: "Find the odd one out among the given words: Copper, Iron, Silver, Brass.",
      options: ["Brass", "Copper", "Iron", "Silver"],
      correct: 0,
      expl: "Brass is an alloy (Copper + Zinc), whereas the others are pure elemental metals.",
    },
    {
      qNum: 10,
      stem: "Complete the letter series: BDF, HJL, NPR, ?",
      options: ["TVX", "SUW", "UWX", "TWX"],
      correct: 0,
      expl: "Each block skips one letter: B-D-F (+2, +2). The next block starts at H (+2 from F). N-P-R + 2 starts at T: T-V-X.",
    },
    {
      qNum: 11,
      stem: "In an exam, 40% failed in English, 30% failed in Mathematics, and 15% failed in both. What percentage passed in both subjects?",
      options: ["45%", "55%", "60%", "50%"],
      correct: 0,
      expl: "Total failed = $40 + 30 - 15 = 55\\%$. Passed in both = $100 - 55 = 45\\%$.",
    },
    {
      qNum: 12,
      stem: "Identify the number of triangles in a standard pentagram (5-pointed star).",
      options: ["10", "8", "12", "5"],
      correct: 0,
      expl: "A 5-pointed star contains 5 small outer triangles and 5 larger overlapping triangles, totaling 10.",
    },
    {
      qNum: 13,
      stem: "If CLOCK is coded as 31215311, what is the code for WATCH?",
      options: ["2312038", "2312039", "2212038", "2412038"],
      correct: 0,
      expl: "W=23, A=1, T=20, C=3, H=8 $\\to$ 2312038.",
    },
    {
      qNum: 14,
      stem: "Statement: All cats are animals. Some animals are pets.\nConclusion 1: Some cats are pets.\nConclusion 2: All pets are animals.",
      options: ["Neither conclusion follows", "Only conclusion 1 follows", "Only conclusion 2 follows", "Both follow"],
      correct: 0,
      expl: "No direct intersection between cats and pets is guaranteed, nor are all pets necessarily animals from the premises.",
    },
    {
      qNum: 15,
      stem: "At what time between 4 and 5 o'clock will the hands of a clock coincide?",
      options: ["$21\\frac{9}{11}$ min past 4", "$20$ min past 4", "$22\\frac{2}{11}$ min past 4", "$21\\frac{5}{11}$ min past 4"],
      correct: 0,
      expl: "$\\theta = |30H - 5.5M| = 0 \\implies 5.5M = 120 \\implies M = 240/11 = 21\\frac{9}{11}$ minutes.",
    },
    {
      qNum: 16,
      stem: "If South-East becomes North, North-East becomes West and so on, what will West become?",
      options: ["South-East", "North-East", "North-West", "South-West"],
      correct: 0,
      expl: "Direction is rotated clockwise by 135 degrees. West + 135 deg = South-East.",
    },
    {
      qNum: 17,
      stem: "How many leap years are there in a span of 400 consecutive years?",
      options: ["97", "100", "96", "98"],
      correct: 0,
      expl: "$100 - 3 = 97$ (years 100, 200, 300 are not leap years, while 400 is).",
    },
    {
      qNum: 18,
      stem: "Choose the alternative that best completes the analogy: Moon : Satellite :: Earth : ?",
      options: ["Planet", "Solar System", "Sun", "Asteroid"],
      correct: 0,
      expl: "Moon is a satellite; Earth is a planet.",
    },
    {
      qNum: 19,
      stem: "Which of the following Venn diagrams correctly depicts the relationship between: Animals, Dogs, and Pets?",
      diagramUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80",
      options: ["All dogs are animals, and some dogs and other animals are pets", "Mutually disjoint circles", "Three concentric circles", "Two disjoint inside one"],
      correct: 0,
      expl: "All dogs are animals (nested). Some dogs are pets, and some non-dog animals are pets (intersecting).",
    },
    {
      qNum: 20,
      stem: "A cube is painted red on all six faces and cut into 64 small identical cubes. How many small cubes have exactly two red faces?",
      options: ["24", "16", "32", "8"],
      correct: 0,
      expl: "Edge cubes with 2 faces = $12 \\times (n - 2) = 12 \\times (4 - 2) = 24$.",
    },
  ];

  for (const q of matQuestions) {
    const createdQ = await prisma.question.create({
      data: {
        sectionId: matSection.id,
        orderIndex: q.qNum - 1,
        stem: q.stem,
        diagramUrl: q.diagramUrl ?? null,
        solutionExplanation: q.expl,
      },
    });

    for (let i = 0; i < q.options.length; i++) {
      await prisma.option.create({
        data: {
          questionId: createdQ.id,
          orderIndex: i,
          text: q.options[i],
          isCorrect: i === q.correct,
        },
      });
    }
  }

  // SECTION 2: Mathematics - 10 questions
  const mathSection = await prisma.section.create({
    data: {
      examId: exam.id,
      title: "Mathematics",
      orderIndex: 1,
    },
  });

  const mathQuestions = [
    {
      qNum: 1,
      stem: "Simplify the following algebraic radical expression:\n$$\\frac{p + \\sqrt{p^2 - q^2}}{p - \\sqrt{p^2 - q^2}} + \\frac{p - \\sqrt{p^2 - q^2}}{p + \\sqrt{p^2 - q^2}}$$",
      options: [
        "$$\\frac{2(2p^2 - q^2)}{q^2}$$",
        "$$\\frac{2p^2}{q^2}$$",
        "$$\\frac{4p^2 - q^2}{2p^2}$$",
        "$$\\frac{p^2 + q^2}{p^2 - q^2}$$",
      ],
      correct: 0,
      expl: "Rationalizing denominators gives $\\frac{(p+\\sqrt{p^2-q^2})^2 + (p-\\sqrt{p^2-q^2})^2}{p^2 - (p^2-q^2)} = \\frac{2(p^2 + p^2 - q^2)}{q^2} = \\frac{2(2p^2-q^2)}{q^2}$.",
    },
    {
      qNum: 2,
      stem: "If $\\alpha$ and $\\beta$ are the roots of the quadratic equation $x^2 - 5x + 6 = 0$, evaluate $\\alpha^3 + \\beta^3$.",
      options: ["35", "25", "45", "19"],
      correct: 0,
      expl: "$\\alpha+\\beta = 5, \\alpha\\beta = 6$. $\\alpha^3+\\beta^3 = (\\alpha+\\beta)^3 - 3\\alpha\\beta(\\alpha+\\beta) = 125 - 3(6)(5) = 125 - 90 = 35$.",
    },
    {
      qNum: 3,
      stem: "Find the remainder when the polynomial $P(x) = x^4 - 3x^3 + 2x^2 - 5x + 7$ is divided by $(x - 2)$.",
      options: ["-3", "5", "7", "-5"],
      correct: 0,
      expl: "By Remainder Theorem, $P(2) = 16 - 3(8) + 2(4) - 5(2) + 7 = 16 - 24 + 8 - 10 + 7 = -3$.",
    },
    {
      qNum: 4,
      stem: "In a circle with radius $r = 13\\text{ cm}$, a chord is at a distance of $5\\text{ cm}$ from the center. What is the length of the chord?",
      options: ["24 cm", "12 cm", "20 cm", "26 cm"],
      correct: 0,
      expl: "Half chord length = $\\sqrt{13^2 - 5^2} = \\sqrt{169 - 25} = \\sqrt{144} = 12\\text{ cm}$. Full length = $2 \\times 12 = 24\\text{ cm}$.",
    },
    {
      qNum: 5,
      stem: "Find the coordinates of the point that divides the line segment joining $A(1, -2)$ and $B(4, 7)$ internally in the ratio $1:2$.",
      options: ["(2, 1)", "(2, 3)", "(3, 1)", "(1, 2)"],
      correct: 0,
      expl: "$x = \\frac{1(4) + 2(1)}{1+2} = \\frac{6}{3} = 2$. $y = \\frac{1(7) + 2(-2)}{3} = \\frac{3}{3} = 1$. Point is $(2, 1)$.",
    },
    {
      qNum: 6,
      stem: "If $\\tan \\theta + \\cot \\theta = 2$, find the value of $\\tan^4 \\theta + \\cot^4 \\theta$.",
      options: ["2", "4", "8", "1"],
      correct: 0,
      expl: "$\\tan\\theta + 1/\\tan\\theta = 2 \\implies (\\tan\\theta - 1)^2 = 0 \\implies \\tan\\theta = 1$. Thus $1^4 + 1^4 = 2$.",
    },
    {
      qNum: 7,
      stem: "A cone, a hemisphere, and a cylinder stand on equal bases and have the same height. What is the ratio of their volumes?",
      options: ["1 : 2 : 3", "1 : 3 : 2", "2 : 3 : 1", "3 : 2 : 1"],
      correct: 0,
      expl: "Height $h = r$. $V_{\\text{cone}} = \\frac{1}{3}\\pi r^3$, $V_{\\text{hemi}} = \\frac{2}{3}\\pi r^3$, $V_{\\text{cyl}} = \\pi r^3$. Ratio is $\\frac{1}{3} : \\frac{2}{3} : 1 = 1 : 2 : 3$.",
    },
    {
      qNum: 8,
      stem: "The mean of 10 observations is 25. If one observation of value 34 is replaced by 24, what is the new mean?",
      options: ["24.0", "24.5", "25.5", "23.8"],
      correct: 0,
      expl: "New sum = $250 - 34 + 24 = 240$. New mean = $240 / 10 = 24.0$.",
    },
    {
      qNum: 9,
      stem: "Two dice are rolled simultaneously. What is the probability that the sum of the numbers is a prime number?",
      options: ["5/12", "7/36", "1/2", "11/36"],
      correct: 0,
      expl: "Prime sums: 2 (1), 3 (2), 5 (4), 7 (6), 11 (2). Total = $1+2+4+6+2 = 15$. Probability = $15/36 = 5/12$.",
    },
    {
      qNum: 10,
      stem: "If the 7th term of an Arithmetic Progression is 40, find the sum of its first 13 terms ($S_{13}$).",
      options: ["520", "480", "560", "400"],
      correct: 0,
      expl: "$S_{13} = \\frac{13}{2}(2a + 12d) = 13(a + 6d) = 13 \\times a_7 = 13 \\times 40 = 520$.",
    },
  ];

  for (const q of mathQuestions) {
    const createdQ = await prisma.question.create({
      data: {
        sectionId: mathSection.id,
        orderIndex: q.qNum - 1,
        stem: q.stem,
        solutionExplanation: q.expl,
      },
    });

    for (let i = 0; i < q.options.length; i++) {
      await prisma.option.create({
        data: {
          questionId: createdQ.id,
          orderIndex: i,
          text: q.options[i],
          isCorrect: i === q.correct,
        },
      });
    }
  }

  // SECTION 3: Natural Sciences - 15 questions
  const sciSection = await prisma.section.create({
    data: {
      examId: exam.id,
      title: "Natural Sciences",
      orderIndex: 2,
    },
  });

  const sciQuestions = [
    {
      qNum: 1,
      stem: "A car accelerates uniformly from rest to $72\\text{ km/h}$ in $10\\text{ s}$. What is the distance traversed during this interval?",
      options: ["100 m", "200 m", "720 m", "50 m"],
      correct: 0,
      expl: "$72\\text{ km/h} = 20\\text{ m/s}$. Acceleration $a = 20/10 = 2\\text{ m/s}^2$. Distance $s = \\frac{1}{2}at^2 = 0.5(2)(100) = 100\\text{ m}$.",
    },
    {
      qNum: 2,
      stem: "Which Newton's Law of Motion provides the qualitative definition of inertia?",
      options: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Universal Law of Gravitation"],
      correct: 0,
      expl: "Newton's First Law states an object remains in rest or uniform motion unless acted on by external force (Law of Inertia).",
    },
    {
      qNum: 3,
      stem: "Calculate the kinetic energy of an object of mass $m = 2\\text{ kg}$ moving with a velocity of $v = 5\\text{ m/s}$.",
      options: ["25 J", "50 J", "10 J", "12.5 J"],
      correct: 0,
      expl: "$KE = \\frac{1}{2} m v^2 = 0.5 \\times 2 \\times 25 = 25\\text{ J}$.",
    },
    {
      qNum: 4,
      stem: "What is the frequency of a sound wave whose time period is $0.002\\text{ seconds}$?",
      options: ["500 Hz", "200 Hz", "250 Hz", "1000 Hz"],
      correct: 0,
      expl: "$f = 1/T = 1 / 0.002 = 500\\text{ Hz}$.",
    },
    {
      qNum: 5,
      stem: "The chemical formula of sulfuric acid is $\\text{H}_2\\text{SO}_4$. What is its molar mass? ($H=1, S=32, O=16$)",
      options: ["98 g/mol", "96 g/mol", "100 g/mol", "82 g/mol"],
      correct: 0,
      expl: "$2(1) + 32 + 4(16) = 2 + 32 + 64 = 98\\text{ g/mol}$.",
    },
    {
      qNum: 6,
      stem: "Which of the following is a pure chemical compound, rather than a homogeneous mixture?",
      options: ["Pure Water ($\\text{H}_2\\text{O}$)", "Air", "Brass", "Petroleum"],
      correct: 0,
      expl: "Water has a fixed stoichiometric ratio of H and O bonded chemically; the others are mixtures.",
    },
    {
      qNum: 7,
      stem: "What type of chemical reaction occurs when Calcium Carbonate is heated: $\\text{CaCO}_3 \\xrightarrow{\\Delta} \\text{CaO} + \\text{CO}_2$?",
      options: ["Thermal Decomposition", "Combination Reaction", "Displacement Reaction", "Double Displacement"],
      correct: 0,
      expl: "A single reactant breaks down into multiple products under heat (thermal decomposition).",
    },
    {
      qNum: 8,
      stem: "Which cellular organelle is universally termed the 'Powerhouse of the Cell'?",
      options: ["Mitochondria", "Golgi Apparatus", "Ribosome", "Endoplasmic Reticulum"],
      correct: 0,
      expl: "Mitochondria generate cellular energy in the form of ATP through oxidative phosphorylation.",
    },
    {
      qNum: 9,
      stem: "Which plant tissue is primarily responsible for the transport of synthesized sugars and organic nutrients from leaves?",
      options: ["Phloem", "Xylem", "Parenchyma", "Collenchyma"],
      correct: 0,
      expl: "Phloem conducts nutrients bidirectionally; xylem conducts water and mineral salts.",
    },
    {
      qNum: 10,
      stem: "An atom has 11 protons, 12 neutrons, and 11 electrons. What is its atomic mass number?",
      options: ["23", "11", "12", "34"],
      correct: 0,
      expl: "Mass number $A = \\text{protons} + \\text{neutrons} = 11 + 12 = 23$ (Sodium-23).",
    },
    {
      qNum: 11,
      stem: "What is the pH of a neutral aqueous solution at $25^\\circ\\text{C}$?",
      options: ["7.0", "0.0", "14.0", "1.0"],
      correct: 0,
      expl: "At $25^\\circ\\text{C}$, $[H^+] = 10^{-7}\\text{ M} \\implies \\text{pH} = 7.0$.",
    },
    {
      qNum: 12,
      stem: "Identify the law that states: 'Mass can neither be created nor destroyed in a chemical reaction.'",
      options: ["Law of Conservation of Mass", "Law of Constant Proportions", "Law of Multiple Proportions", "Avogadro's Law"],
      correct: 0,
      expl: "Formulated by Antoine Lavoisier in 1789.",
    },
    {
      qNum: 13,
      stem: "Which gas is evolved when zinc metal reacts with dilute hydrochloric acid: $\\text{Zn} + 2\\text{HCl} \\to \\text{ZnCl}_2 + \\text{H}_2$?",
      options: ["Hydrogen gas", "Chlorine gas", "Oxygen gas", "Carbon dioxide"],
      correct: 0,
      expl: "Hydrogen gas ($\\text{H}_2$) is liberated and burns with a characteristic pop sound.",
    },
    {
      qNum: 14,
      stem: "Which vitamin deficiency causes the disease Rickets in developing bones of children?",
      options: ["Vitamin D", "Vitamin C", "Vitamin A", "Vitamin B12"],
      correct: 0,
      expl: "Vitamin D promotes calcium absorption; deficiency causes bone softening (rickets).",
    },
    {
      qNum: 15,
      stem: "What is the approximate acceleration due to gravity on the surface of the Moon compared to Earth?",
      options: ["1/6th of Earth", "1/2 of Earth", "1/4th of Earth", "Equal to Earth"],
      correct: 0,
      expl: "$g_{\\text{moon}} \\approx 1.62\\text{ m/s}^2 \\approx \\frac{1}{6} g_{\\text{earth}}$.",
    },
  ];

  for (const q of sciQuestions) {
    const createdQ = await prisma.question.create({
      data: {
        sectionId: sciSection.id,
        orderIndex: q.qNum - 1,
        stem: q.stem,
        solutionExplanation: q.expl,
      },
    });

    for (let i = 0; i < q.options.length; i++) {
      await prisma.option.create({
        data: {
          questionId: createdQ.id,
          orderIndex: i,
          text: q.options[i],
          isCorrect: i === q.correct,
        },
      });
    }
  }

  // 4. Create an active candidate ExamSession for testing
  const now = new Date();
  const deadline = new Date(now.getTime() + 5400 * 1000); // 90 min from now

  await prisma.examSession.upsert({
    where: { id: "session_demo_1" },
    update: {
      status: "IN_PROGRESS",
      startedAt: now,
      deadline: deadline,
    },
    create: {
      id: "session_demo_1",
      examId: exam.id,
      candidateId: candidate.id,
      status: "IN_PROGRESS",
      startedAt: now,
      deadline: deadline,
    },
  });

  console.log("Seeding successfully completed! 45 questions created across 3 sections.");
  console.log("Demo session created: 'session_demo_1' (Access Code: 'OH-MOCK-09')");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
