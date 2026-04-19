/**
 * 完整强化版题库 (40道)
 * 涵盖：圆心角定理、半圆角、同弓形角、圆内接四边形、切线定理、弦切角定理等。
 */
window.QUIZ_QUESTIONS = {
  // 按难度分级组织
  byDifficulty: {
    // 难度1：基础定义与核心定理
    1: [
      {
        id: 'l1-01',
        difficulty: 1,
        level: 1,
        category: 'center_circumference',
        points: 10,
        question: 'The angle at the centre is how many times the angle at the circumference subtended by the same arc?',
        options: ['Equal', 'Twice', 'Half', 'Three times'],
        correctIndex: 1,
        explanation: 'The angle at the centre is twice the angle at the circumference.'
      },
      {
        id: 'l1-02',
        difficulty: 1,
        level: 1,
        category: 'semicircle',
        points: 10,
        question: 'What is the size of an angle subtended by a diameter at the circumference?',
        options: ['45°', '60°', '90°', '180°'],
        correctIndex: 2,
        explanation: 'The angle in a semicircle is always a right angle (90°).'
      },
      {
        id: 'l1-03',
        difficulty: 1,
        level: 1,
        category: 'same_segment',
        points: 10,
        question: 'Angles in the same segment of a circle are...',
        options: ['Supplementary', 'Equal', 'Complementary', 'Reciprocal'],
        correctIndex: 1,
        explanation: 'Angles subtended by the same arc at the circumference are equal.'
      },
      {
        id: 'l1-04',
        difficulty: 1,
        level: 1,
        category: 'cyclic_quad',
        points: 10,
        question: 'Opposite angles in a cyclic quadrilateral always add up to...',
        options: ['90°', '180°', '270°', '360°'],
        correctIndex: 1,
        explanation: 'The sum of opposite angles in a cyclic quadrilateral is 180°.'
      },
      {
        id: 'l1-05',
        difficulty: 1,
        level: 1,
        category: 'tangent_radius',
        points: 10,
        question: 'The angle between a tangent and a radius at the point of contact is...',
        options: ['0°', '45°', '90°', '180°'],
        correctIndex: 2,
        explanation: 'A tangent is perpendicular (90°) to the radius at the point of contact.'
      },
      {
        id: 'l1-06',
        difficulty: 1,
        level: 1,
        category: 'tangents_point',
        points: 10,
        question: 'Two tangents drawn from the same external point to a circle are...',
        options: ['Parallel', 'Perpendicular', 'Equal in length', 'Unequal'],
        correctIndex: 2,
        explanation: 'Tangents from the same external point to a circle are equal in length.'
      },
      {
        id: 'l1-07',
        difficulty: 1,
        level: 1,
        category: 'alternate_segment',
        points: 10,
        question: 'The angle between a tangent and a chord is equal to the angle in the...',
        options: ['Same segment', 'Alternate segment', 'Centre', 'Semicircle'],
        correctIndex: 1,
        explanation: 'This is the Alternate Segment Theorem.'
      },
      {
        id: 'l1-08',
        difficulty: 1,
        level: 1,
        category: 'chord_bisector',
        points: 10,
        question: 'A radius that bisects a chord (not a diameter) must be...',
        options: ['Parallel to it', 'Perpendicular to it', 'Twice its length', 'Half its length'],
        correctIndex: 1,
        explanation: 'The line from the centre to the midpoint of a chord is perpendicular to the chord.'
      },
      {
        id: 'l1-09',
        difficulty: 1,
        level: 1,
        category: 'cyclic_quad',
        points: 10,
        question: 'If one angle of a cyclic quadrilateral is 85°, what is the opposite angle?',
        options: ['85°', '95°', '105°', '180°'],
        correctIndex: 1,
        explanation: '180° - 85° = 95°.'
      },
      {
        id: 'l1-10',
        difficulty: 1,
        level: 1,
        category: 'center_circumference',
        points: 10,
        question: 'If the angle at the circumference is 42°, the angle at the centre is...',
        options: ['21°', '42°', '84°', '168°'],
        correctIndex: 2,
        explanation: '42° * 2 = 84°.'
      },
      {
        id: 'l1-11',
        difficulty: 1,
        level: 1,
        category: 'isosceles_triangle',
        points: 10,
        question: 'Two radii and a chord form what type of triangle?',
        options: ['Equilateral', 'Right-angled', 'Isosceles', 'Scalene'],
        correctIndex: 2,
        explanation: 'Since radii are equal in length, it forms an isosceles triangle.'
      },
      {
        id: 'l1-12',
        difficulty: 1,
        level: 1,
        category: 'tangent_radius',
        points: 10,
        question: 'If a line is perpendicular to a radius at its outer endpoint, the line is a...',
        options: ['Chord', 'Secant', 'Tangent', 'Diameter'],
        correctIndex: 2,
        explanation: 'Definition of a tangent.'
      },
      {
        id: 'l1-13',
        difficulty: 1,
        level: 1,
        category: 'cyclic_quad',
        points: 10,
        question: 'The exterior angle of a cyclic quadrilateral is equal to...',
        options: ['The interior opposite angle', 'The interior adjacent angle', '180°', '90°'],
        correctIndex: 0,
        explanation: 'Exterior angle = interior opposite angle.'
      },
      {
        id: 'l1-14',
        difficulty: 1,
        level: 1,
        category: 'semicircle',
        points: 10,
        question: 'A triangle is drawn inside a circle with one side as the diameter. The largest angle is...',
        options: ['60°', '90°', '120°', '180°'],
        correctIndex: 1,
        explanation: 'Angle in a semicircle is 90°.'
      },
      {
        id: 'l1-15',
        difficulty: 1,
        level: 1,
        category: 'same_segment',
        points: 10,
        question: 'If angle APB = 30° and P, Q are on the same arc, then angle AQB is...',
        options: ['15°', '30°', '60°', '90°'],
        correctIndex: 1,
        explanation: 'Angles in the same segment are equal.'
      }
    ],
    // 难度2：定理组合与应用
    2: [
      {
        id: 'l2-01',
        difficulty: 2,
        level: 2,
        category: 'center_circumference',
        points: 15,
        question: 'A reflex angle at the centre is 210°. The angle at the circumference is...',
        options: ['105°', '150°', '75°', '210°'],
        correctIndex: 0,
        explanation: '210° / 2 = 105°.'
      },
      {
        id: 'l2-02',
        difficulty: 2,
        level: 2,
        category: 'cyclic_quad',
        points: 15,
        question: 'In cyclic quad ABCD, angle A=2x and angle C=3x. Find x.',
        options: ['18°', '36°', '60°', '72°'],
        correctIndex: 1,
        explanation: '2x + 3x = 180 => 5x = 180 => x = 36.'
      },
      {
        id: 'l2-03',
        difficulty: 2,
        level: 2,
        category: 'tangents_point',
        points: 15,
        question: 'P is an external point. PA and PB are tangents. If angle APB = 40°, find angle AOB (O is centre).',
        options: ['40°', '70°', '140°', '180°'],
        correctIndex: 2,
        explanation: 'Angles in quad OAPB: 90+90+40 + AOB = 360. AOB = 140°.'
      },
      {
        id: 'l2-04',
        difficulty: 2,
        level: 2,
        category: 'alternate_segment',
        points: 15,
        question: 'Angle between tangent and chord is 55°. Find the angle in the alternate segment.',
        options: ['35°', '55°', '110°', '125°'],
        correctIndex: 1,
        explanation: 'They are equal by the Alternate Segment Theorem.'
      },
      {
        id: 'l2-05',
        difficulty: 2,
        level: 2,
        category: 'isosceles_triangle',
        points: 15,
        question: 'In an isosceles triangle formed by two radii (O) and chord AB, if angle OAB = 25°, find angle AOB.',
        options: ['25°', '50°', '130°', '155°'],
        correctIndex: 2,
        explanation: '180 - 25 - 25 = 130°.'
      },
      {
        id: 'l2-06',
        difficulty: 2,
        level: 2,
        category: 'chord_bisector',
        points: 15,
        question: 'A chord is 8cm long and is 3cm from the centre. What is the radius?',
        options: ['4cm', '5cm', '7cm', '10cm'],
        correctIndex: 1,
        explanation: 'Pythagoras: √(4² + 3²) = 5cm.'
      },
      {
        id: 'l2-07',
        difficulty: 2,
        level: 2,
        category: 'combination',
        points: 15,
        question: 'Angle at centre is x+40, angle at circumference is x. Find x.',
        options: ['20°', '40°', '80°', '120°'],
        correctIndex: 1,
        explanation: 'x+40 = 2x => x = 40.'
      },
      {
        id: 'l2-08',
        difficulty: 2,
        level: 2,
        category: 'cyclic_quad',
        points: 15,
        question: 'ABCD is a cyclic quad. If angle ABC = 110°, find exterior angle at D.',
        options: ['70°', '110°', '180°', '20°'],
        correctIndex: 1,
        explanation: 'Exterior angle = interior opposite (ABC) = 110°.'
      },
      {
        id: 'l2-09',
        difficulty: 2,
        level: 2,
        category: 'tangents_point',
        points: 15,
        question: 'If tangents PA and PB from P form an equilateral triangle PAB with the chord AB, angle APB is...',
        options: ['30°', '45°', '60°', '90°'],
        correctIndex: 2,
        explanation: 'Equilateral triangles have 60° angles.'
      },
      {
        id: 'l2-10',
        difficulty: 2,
        level: 2,
        category: 'center_circumference',
        points: 15,
        question: 'The angle subtended by a minor arc at the centre is 120°. The angle subtended by the major arc at the circumference is...',
        options: ['60°', '120°', '240°', '30°'],
        correctIndex: 0,
        explanation: '120 / 2 = 60°.'
      },
      {
        id: 'l2-11',
        difficulty: 2,
        level: 2,
        category: 'combination',
        points: 15,
        question: 'If a chord of length 12cm is 8cm from the centre, the diameter is...',
        options: ['10cm', '20cm', '16cm', '24cm'],
        correctIndex: 1,
        explanation: 'Radius = √(6²+8²) = 10. Diameter = 20.'
      },
      {
        id: 'l2-12',
        difficulty: 2,
        level: 2,
        category: 'semicircle',
        points: 15,
        question: 'In a semicircle with diameter AB, C is a point on arc. If AC = BC, angle BAC is...',
        options: ['30°', '45°', '60°', '90°'],
        correctIndex: 1,
        explanation: 'Angle C = 90°. Since AC=BC, angles A and B are (180-90)/2 = 45°.'
      },
      {
        id: 'l2-13',
        difficulty: 2,
        level: 2,
        category: 'alternate_segment',
        points: 15,
        question: 'Triangle ABC is in a circle. Tangent at A forms 40° with AB. Find angle ACB.',
        options: ['40°', '50°', '80°', '140°'],
        correctIndex: 0,
        explanation: 'By Alternate Segment Theorem, angle ACB = 40°.'
      },
      {
        id: 'l2-14',
        difficulty: 2,
        level: 2,
        category: 'cyclic_quad',
        points: 15,
        question: 'Three angles of cyclic quad are 100, 80, 70. The fourth is...',
        options: ['100°', '110°', '80°', '90°'],
        correctIndex: 1,
        explanation: 'Opposite to 70 is 180-70 = 110°.'
      },
      {
        id: 'l2-15',
        difficulty: 2,
        level: 2,
        category: 'tangents_point',
        points: 15,
        question: 'Tangents PA, PB to circle centre O. If angle AOB=150, angle APB is...',
        options: ['15°', '30°', '75°', '150°'],
        correctIndex: 1,
        explanation: '180 - 150 = 30°.'
      }
    ],
    // 难度3：复杂推导与综合挑战
    3: [
      {
        id: 'l3-01',
        difficulty: 3,
        level: 3,
        category: 'combination',
        points: 20,
        question: 'In a circle, angle at centre is 4x+10, angle at circumference is 3x-15. Find x.',
        options: ['10', '20', '25', '40'],
        correctIndex: 1,
        explanation: '4x+10 = 2(3x-15) => 4x+10 = 6x-30 => 2x=40 => x=20.'
      },
      {
        id: 'l3-02',
        difficulty: 3,
        level: 3,
        category: 'complex_cyclic',
        points: 20,
        question: 'In cyclic quad ABCD, angle A = x+20, angle C = x+40. Find angle A.',
        options: ['60°', '80°', '100°', '120°'],
        correctIndex: 1,
        explanation: 'x+20 + x+40 = 180 => 2x=120 => x=60. Angle A = 60+20=80°.'
      },
      {
        id: 'l3-03',
        difficulty: 3,
        level: 3,
        category: 'tangent_logic',
        points: 20,
        question: 'P is 17cm from centre O. Radius is 8cm. Tangent PQ length is...',
        options: ['9cm', '15cm', '25cm', '12.5cm'],
        correctIndex: 1,
        explanation: '√(17² - 8²) = √(289 - 64) = √225 = 15cm.'
      },
      {
        id: 'l3-04',
        difficulty: 3,
        level: 3,
        category: 'center_circumference',
        points: 20,
        question: 'Angle at centre by arc AB is 140°. Point C is on major arc, D on minor arc. Angle ADB is...',
        options: ['70°', '110°', '140°', '220°'],
        correctIndex: 1,
        explanation: 'Angle at major arc = 70°. ADB = 180-70 = 110°.'
      },
      {
        id: 'l3-05',
        difficulty: 3,
        level: 3,
        category: 'alternate_segment',
        points: 20,
        question: 'Tangent SAT at A. AB is chord. Angle TAB=65. ABC is triangle in circle, BC=AC. Find angle BAC.',
        options: ['50°', '65°', '115°', '130°'],
        correctIndex: 0,
        explanation: 'Angle ACB=65. Since BC=AC, angle BAC=65. Wait, 180-65-65 = 50°.'
      },
      {
        id: 'l3-06',
        difficulty: 3,
        level: 3,
        category: 'combination',
        points: 20,
        question: 'Angle in semicircle is 90. One chord is radius length. Smallest angle is...',
        options: ['30°', '45°', '60°', '15°'],
        correctIndex: 0,
        explanation: 'Triangle with radius as side is equilateral with centre, so angle at circum is 30°.'
      },
      {
        id: 'l3-07',
        difficulty: 3,
        level: 3,
        category: 'complex_tangent',
        points: 20,
        question: 'Two concentric circles radii 3 and 5. Length of chord of larger circle tangent to smaller is...',
        options: ['4', '6', '8', '10'],
        correctIndex: 2,
        explanation: 'Half chord = √(5²-3²) = 4. Full chord = 8.'
      },
      {
        id: 'l3-08',
        difficulty: 3,
        level: 3,
        category: 'cyclic_quad',
        points: 20,
        question: 'ABCD cyclic quad. AB is diameter. Angle ADC=130. Find angle BAC.',
        options: ['40°', '50°', '90°', '130°'],
        correctIndex: 0,
        explanation: 'Angle ABC = 180-130=50. Angle ACB=90. BAC = 180-90-50=40°.'
      },
      {
        id: 'l3-09',
        difficulty: 3,
        level: 3,
        category: 'arc_logic',
        points: 20,
        question: 'Arc length is 1/4 of circumference. Angle at circumference subtended by this arc is...',
        options: ['45°', '90°', '22.5°', '11.25°'],
        correctIndex: 0,
        explanation: 'Centre angle = 360/4 = 90. Circumference angle = 90/2 = 45°.'
      },
      {
        id: 'l3-10',
        difficulty: 3,
        level: 3,
        category: 'ultimate_challenge',
        points: 20,
        question: 'A circle has radius 1. A square is inscribed. What is the area of the square?',
        options: ['1', '2', '4', 'π'],
        correctIndex: 1,
        explanation: 'Diagonal = diameter = 2. Side = √2. Area = (√2)² = 2.'
      }
    ]
  },
  // 方便快速查找的题目映射
  byId: {},
  // 按类别分组
  byCategory: {}
};

// 初始化 byId 和 byCategory 映射
(function() {
  for (let difficulty in window.QUIZ_QUESTIONS.byDifficulty) {
    const questions = window.QUIZ_QUESTIONS.byDifficulty[difficulty];
    questions.forEach(question => {
      // 构建 byId 映射
      window.QUIZ_QUESTIONS.byId[question.id] = question;
      
      // 构建 byCategory 映射
      if (!window.QUIZ_QUESTIONS.byCategory[question.category]) {
        window.QUIZ_QUESTIONS.byCategory[question.category] = [];
      }
      window.QUIZ_QUESTIONS.byCategory[question.category].push(question.id);
    });
  }
})();

// 适配器函数：按ID获取题目
window.getQuestionById = function(id) {
  return window.QUIZ_QUESTIONS.byId[id] || null;
};

// 适配器函数：按等级获取题目
window.getQuestionsByLevel = function(level) {
  return window.QUIZ_QUESTIONS.byDifficulty[level] || [];
};

// 向后兼容：保持原数组结构
window.QUIZ_QUESTIONS = Object.assign(window.QUIZ_QUESTIONS, {
  // 提供一个数组形式的访问方式，确保旧代码兼容
  length: 40,
  [Symbol.iterator]: function*() {
    for (let difficulty in this.byDifficulty) {
      yield* this.byDifficulty[difficulty];
    }
  }
});

// 模拟数组索引访问
for (let i = 0, count = 0; count < 40; i++) {
  for (let difficulty in window.QUIZ_QUESTIONS.byDifficulty) {
    const questions = window.QUIZ_QUESTIONS.byDifficulty[difficulty];
    for (let j = 0; j < questions.length && count < 40; j++) {
      window.QUIZ_QUESTIONS[count] = questions[j];
      count++;
    }
  }
};
