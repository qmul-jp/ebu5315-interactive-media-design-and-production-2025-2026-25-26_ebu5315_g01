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
        question_zh: '直径所对的圆周角是多少度？',
        options: ['45°', '60°', '90°', '180°'],
        options_zh: ['45°', '60°', '90°', '180°'],
        correctIndex: 2,
        explanation: 'The angle in a semicircle is always a right angle (90°).',
        explanation_zh: '半圆所对的角总是直角（90°）。'
      },
      {
        id: 'l1-03',
        difficulty: 1,
        level: 1,
        category: 'same_segment',
        points: 10,
        question: 'Angles in the same segment of a circle are...',
        question_zh: '同一段弧所对的圆周角是...',
        options: ['Supplementary', 'Equal', 'Complementary', 'Reciprocal'],
        options_zh: ['互补的', '相等的', '互余的', '倒数的'],
        correctIndex: 1,
        explanation: 'Angles subtended by the same arc at the circumference are equal.',
        explanation_zh: '同弧所对的圆周角相等。'
      },
      {
        id: 'l1-04',
        difficulty: 1,
        level: 1,
        category: 'cyclic_quad',
        points: 10,
        question: 'Opposite angles in a cyclic quadrilateral always add up to...',
        question_zh: '圆内接四边形的对角之和总是...',
        options: ['90°', '180°', '270°', '360°'],
        options_zh: ['90°', '180°', '270°', '360°'],
        correctIndex: 1,
        explanation: 'The sum of opposite angles in a cyclic quadrilateral is 180°.',
        explanation_zh: '圆内接四边形的对角之和为 180°。'
      },
      {
        id: 'l1-05',
        difficulty: 1,
        level: 1,
        category: 'tangent_radius',
        points: 10,
        question: 'The angle between a tangent and a radius at the point of contact is...',
        question_zh: '切线与过切点的半径之间的夹角是...',
        options: ['0°', '45°', '90°', '180°'],
        options_zh: ['0°', '45°', '90°', '180°'],
        correctIndex: 2,
        explanation: 'A tangent is perpendicular (90°) to the radius at the point of contact.',
        explanation_zh: '切线与过切点的半径垂直（90°）。'
      },
      {
        id: 'l1-06',
        difficulty: 1,
        level: 1,
        category: 'tangents_point',
        points: 10,
        question: 'Two tangents drawn from the same external point to a circle are...',
        question_zh: '从圆外一点引向圆的两条切线是...',
        options: ['Parallel', 'Perpendicular', 'Equal in length', 'Unequal'],
        options_zh: ['平行的', '垂直的', '长度相等的', '长度不相等的'],
        correctIndex: 2,
        explanation: 'Tangents from the same external point to a circle are equal in length.',
        explanation_zh: '从圆外一点到圆的切线长度相等。'
      },
      {
        id: 'l1-07',
        difficulty: 1,
        level: 1,
        category: 'alternate_segment',
        points: 10,
        question: 'The angle between a tangent and a chord is equal to the angle in the...',
        question_zh: '切线与弦之间的夹角等于...中的角。',
        options: ['Same segment', 'Alternate segment', 'Centre', 'Semicircle'],
        options_zh: ['同一段弧', '对侧弧', '圆心', '半圆'],
        correctIndex: 1,
        explanation: 'This is the Alternate Segment Theorem.',
        explanation_zh: '这是弦切角定理。'
      },
      {
        id: 'l1-08',
        difficulty: 1,
        level: 1,
        category: 'chord_bisector',
        points: 10,
        question: 'A radius that bisects a chord (not a diameter) must be...',
        question_zh: '平分弦（非直径）的半径必定...',
        options: ['Parallel to it', 'Perpendicular to it', 'Twice its length', 'Half its length'],
        options_zh: ['平行于弦', '垂直于弦', '长度是弦的两倍', '长度是弦的一半'],
        correctIndex: 1,
        explanation: 'The line from the centre to the midpoint of a chord is perpendicular to the chord.',
        explanation_zh: '从圆心到弦中点的线段垂直于弦。'
      },
      {
        id: 'l1-09',
        difficulty: 1,
        level: 1,
        category: 'cyclic_quad',
        points: 10,
        question: 'If one angle of a cyclic quadrilateral is 85°, what is the opposite angle?',
        question_zh: '如果圆内接四边形的一个角是 85°，那么它的对角是多少度？',
        options: ['85°', '95°', '105°', '180°'],
        options_zh: ['85°', '95°', '105°', '180°'],
        correctIndex: 1,
        explanation: '180° - 85° = 95°.',
        explanation_zh: '180° - 85° = 95°.'
      },
      {
        id: 'l1-10',
        difficulty: 1,
        level: 1,
        category: 'center_circumference',
        points: 10,
        question: 'If the angle at the circumference is 42°, the angle at the centre is...',
        question_zh: '如果圆周角是 42°，那么圆心角是...',
        options: ['21°', '42°', '84°', '168°'],
        options_zh: ['21°', '42°', '84°', '168°'],
        correctIndex: 2,
        explanation: '42° * 2 = 84°.',
        explanation_zh: '42° * 2 = 84°.'
      },
      {
        id: 'l1-11',
        difficulty: 1,
        level: 1,
        category: 'isosceles_triangle',
        points: 10,
        question: 'Two radii and a chord form what type of triangle?',
        question_zh: '两条半径和一条弦形成什么类型的三角形？',
        options: ['Equilateral', 'Right-angled', 'Isosceles', 'Scalene'],
        options_zh: ['等边三角形', '直角三角形', '等腰三角形', '不等边三角形'],
        correctIndex: 2,
        explanation: 'Since radii are equal in length, it forms an isosceles triangle.',
        explanation_zh: '由于半径长度相等，所以形成等腰三角形。'
      },
      {
        id: 'l1-12',
        difficulty: 1,
        level: 1,
        category: 'tangent_radius',
        points: 10,
        question: 'If a line is perpendicular to a radius at its outer endpoint, the line is a...',
        question_zh: '如果一条直线垂直于半径的外端点，那么这条直线是...',
        options: ['Chord', 'Secant', 'Tangent', 'Diameter'],
        options_zh: ['弦', '割线', '切线', '直径'],
        correctIndex: 2,
        explanation: 'Definition of a tangent.',
        explanation_zh: '这是切线的定义。'
      },
      {
        id: 'l1-13',
        difficulty: 1,
        level: 1,
        category: 'cyclic_quad',
        points: 10,
        question: 'The exterior angle of a cyclic quadrilateral is equal to...',
        question_zh: '圆内接四边形的外角等于...',
        options: ['The interior opposite angle', 'The interior adjacent angle', '180°', '90°'],
        options_zh: ['内对角', '相邻内角', '180°', '90°'],
        correctIndex: 0,
        explanation: 'Exterior angle = interior opposite angle.',
        explanation_zh: '外角等于内对角。'
      },
      {
        id: 'l1-14',
        difficulty: 1,
        level: 1,
        category: 'semicircle',
        points: 10,
        question: 'A triangle is drawn inside a circle with one side as the diameter. The largest angle is...',
        question_zh: '一个三角形内接于圆，其中一边为直径。最大的角是...',
        options: ['60°', '90°', '120°', '180°'],
        options_zh: ['60°', '90°', '120°', '180°'],
        correctIndex: 1,
        explanation: 'Angle in a semicircle is 90°.',
        explanation_zh: '半圆所对的角是 90°。'
      },
      {
        id: 'l1-15',
        difficulty: 1,
        level: 1,
        category: 'same_segment',
        points: 10,
        question: 'If angle APB = 30° and P, Q are on the same arc, then angle AQB is...',
        question_zh: '如果角 APB = 30°，且 P、Q 在同一段弧上，那么角 AQB 是...',
        options: ['15°', '30°', '60°', '90°'],
        options_zh: ['15°', '30°', '60°', '90°'],
        correctIndex: 1,
        explanation: 'Angles in the same segment are equal.',
        explanation_zh: '同一段弧所对的角相等。'
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
        question_zh: '圆心的优角为 210°。圆周角是...',
        options: ['105°', '150°', '75°', '210°'],
        options_zh: ['105°', '150°', '75°', '210°'],
        correctIndex: 0,
        explanation: '210° / 2 = 105°.',
        explanation_zh: '210° / 2 = 105°.'
      },
      {
        id: 'l2-02',
        difficulty: 2,
        level: 2,
        category: 'cyclic_quad',
        points: 15,
        question: 'In cyclic quad ABCD, angle A=2x and angle C=3x. Find x.',
        question_zh: '在圆内接四边形 ABCD 中，角 A=2x，角 C=3x。求 x。',
        options: ['18°', '36°', '60°', '72°'],
        options_zh: ['18°', '36°', '60°', '72°'],
        correctIndex: 1,
        explanation: '2x + 3x = 180 => 5x = 180 => x = 36.',
        explanation_zh: '2x + 3x = 180 => 5x = 180 => x = 36.'
      },
      {
        id: 'l2-03',
        difficulty: 2,
        level: 2,
        category: 'tangents_point',
        points: 15,
        question: 'P is an external point. PA and PB are tangents. If angle APB = 40°, find angle AOB (O is centre).',
        question_zh: 'P 是圆外一点。PA 和 PB 是切线。如果角 APB = 40°，求角 AOB（O 是圆心）。',
        options: ['40°', '70°', '140°', '180°'],
        options_zh: ['40°', '70°', '140°', '180°'],
        correctIndex: 2,
        explanation: 'Angles in quad OAPB: 90+90+40 + AOB = 360. AOB = 140°.',
        explanation_zh: '四边形 OAPB 内角和：90+90+40 + AOB = 360. AOB = 140°.'
      },
      {
        id: 'l2-04',
        difficulty: 2,
        level: 2,
        category: 'alternate_segment',
        points: 15,
        question: 'Angle between tangent and chord is 55°. Find the angle in the alternate segment.',
        question_zh: '切线与弦之间的夹角为 55°。求对侧弧中的角。',
        options: ['35°', '55°', '110°', '125°'],
        options_zh: ['35°', '55°', '110°', '125°'],
        correctIndex: 1,
        explanation: 'They are equal by the Alternate Segment Theorem.',
        explanation_zh: '根据弦切角定理，它们相等。'
      },
      {
        id: 'l2-05',
        difficulty: 2,
        level: 2,
        category: 'isosceles_triangle',
        points: 15,
        question: 'In an isosceles triangle formed by two radii (O) and chord AB, if angle OAB = 25°, find angle AOB.',
        question_zh: '在由两条半径（O）和弦 AB 形成的等腰三角形中，如果角 OAB = 25°，求角 AOB。',
        options: ['25°', '50°', '130°', '155°'],
        options_zh: ['25°', '50°', '130°', '155°'],
        correctIndex: 2,
        explanation: '180 - 25 - 25 = 130°.',
        explanation_zh: '180 - 25 - 25 = 130°.'
      },
      {
        id: 'l2-06',
        difficulty: 2,
        level: 2,
        category: 'chord_bisector',
        points: 15,
        question: 'A chord is 8cm long and is 3cm from the centre. What is the radius?',
        question_zh: '一条弦长 8cm，距离圆心 3cm。半径是多少？',
        options: ['4cm', '5cm', '7cm', '10cm'],
        options_zh: ['4cm', '5cm', '7cm', '10cm'],
        correctIndex: 1,
        explanation: 'Pythagoras: √(4² + 3²) = 5cm.',
        explanation_zh: '勾股定理：√(4² + 3²) = 5cm.'
      },
      {
        id: 'l2-07',
        difficulty: 2,
        level: 2,
        category: 'combination',
        points: 15,
        question: 'Angle at centre is x+40, angle at circumference is x. Find x.',
        question_zh: '圆心角为 x+40，圆周角为 x。求 x。',
        options: ['20°', '40°', '80°', '120°'],
        options_zh: ['20°', '40°', '80°', '120°'],
        correctIndex: 1,
        explanation: 'x+40 = 2x => x = 40.',
        explanation_zh: 'x+40 = 2x => x = 40.'
      },
      {
        id: 'l2-08',
        difficulty: 2,
        level: 2,
        category: 'cyclic_quad',
        points: 15,
        question: 'ABCD is a cyclic quad. If angle ABC = 110°, find exterior angle at D.',
        question_zh: 'ABCD 是圆内接四边形。如果角 ABC = 110°，求 D 处的外角。',
        options: ['70°', '110°', '180°', '20°'],
        options_zh: ['70°', '110°', '180°', '20°'],
        correctIndex: 1,
        explanation: 'Exterior angle = interior opposite (ABC) = 110°.',
        explanation_zh: '外角 = 内对角（ABC）= 110°.'
      },
      {
        id: 'l2-09',
        difficulty: 2,
        level: 2,
        category: 'tangents_point',
        points: 15,
        question: 'If tangents PA and PB from P form an equilateral triangle PAB with the chord AB, angle APB is...',
        question_zh: '如果从 P 点引出的切线 PA 和 PB 与弦 AB 形成等边三角形 PAB，那么角 APB 是...',
        options: ['30°', '45°', '60°', '90°'],
        options_zh: ['30°', '45°', '60°', '90°'],
        correctIndex: 2,
        explanation: 'Equilateral triangles have 60° angles.',
        explanation_zh: '等边三角形的角为 60°。'
      },
      {
        id: 'l2-10',
        difficulty: 2,
        level: 2,
        category: 'center_circumference',
        points: 15,
        question: 'The angle subtended by a minor arc at the centre is 120°. The angle subtended by the major arc at the circumference is...',
        question_zh: '劣弧在圆心所对的角为 120°。优弧在圆周所对的角是...',
        options: ['60°', '120°', '240°', '30°'],
        options_zh: ['60°', '120°', '240°', '30°'],
        correctIndex: 0,
        explanation: '120 / 2 = 60°.',
        explanation_zh: '120 / 2 = 60°.'
      },
      {
        id: 'l2-11',
        difficulty: 2,
        level: 2,
        category: 'combination',
        points: 15,
        question: 'If a chord of length 12cm is 8cm from the centre, the diameter is...',
        question_zh: '如果一条弦长 12cm，距离圆心 8cm，那么直径是...',
        options: ['10cm', '20cm', '16cm', '24cm'],
        options_zh: ['10cm', '20cm', '16cm', '24cm'],
        correctIndex: 1,
        explanation: 'Radius = √(6²+8²) = 10. Diameter = 20.',
        explanation_zh: '半径 = √(6²+8²) = 10. 直径 = 20.'
      },
      {
        id: 'l2-12',
        difficulty: 2,
        level: 2,
        category: 'semicircle',
        points: 15,
        question: 'In a semicircle with diameter AB, C is a point on arc. If AC = BC, angle BAC is...',
        question_zh: '在以 AB 为直径的半圆中，C 是弧上的一点。如果 AC = BC，那么角 BAC 是...',
        options: ['30°', '45°', '60°', '90°'],
        options_zh: ['30°', '45°', '60°', '90°'],
        correctIndex: 1,
        explanation: 'Angle C = 90°. Since AC=BC, angles A and B are (180-90)/2 = 45°.',
        explanation_zh: '角 C = 90°。由于 AC=BC，角 A 和角 B 为 (180-90)/2 = 45°.'
      },
      {
        id: 'l2-13',
        difficulty: 2,
        level: 2,
        category: 'alternate_segment',
        points: 15,
        question: 'Triangle ABC is in a circle. Tangent at A forms 40° with AB. Find angle ACB.',
        question_zh: '三角形 ABC 内接于圆。A 点的切线与 AB 形成 40° 角。求角 ACB。',
        options: ['40°', '50°', '80°', '140°'],
        options_zh: ['40°', '50°', '80°', '140°'],
        correctIndex: 0,
        explanation: 'By Alternate Segment Theorem, angle ACB = 40°.',
        explanation_zh: '根据弦切角定理，角 ACB = 40°.'
      },
      {
        id: 'l2-14',
        difficulty: 2,
        level: 2,
        category: 'cyclic_quad',
        points: 15,
        question: 'Three angles of cyclic quad are 100, 80, 70. The fourth is...',
        question_zh: '圆内接四边形的三个角为 100°、80°、70°。第四个角是...',
        options: ['100°', '110°', '80°', '90°'],
        options_zh: ['100°', '110°', '80°', '90°'],
        correctIndex: 1,
        explanation: 'Opposite to 70 is 180-70 = 110°.',
        explanation_zh: '70° 的对角是 180-70 = 110°.'
      },
      {
        id: 'l2-15',
        difficulty: 2,
        level: 2,
        category: 'tangents_point',
        points: 15,
        question: 'Tangents PA, PB to circle centre O. If angle AOB=150, angle APB is...',
        question_zh: 'PA、PB 是圆（圆心 O）的切线。如果角 AOB=150°，那么角 APB 是...',
        options: ['15°', '30°', '75°', '150°'],
        options_zh: ['15°', '30°', '75°', '150°'],
        correctIndex: 1,
        explanation: '180 - 150 = 30°.',
        explanation_zh: '180 - 150 = 30°.'
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
        question_zh: '在圆中，圆心角为 4x+10，圆周角为 3x-15。求 x。',
        options: ['10', '20', '25', '40'],
        options_zh: ['10', '20', '25', '40'],
        correctIndex: 1,
        explanation: '4x+10 = 2(3x-15) => 4x+10 = 6x-30 => 2x=40 => x=20.',
        explanation_zh: '4x+10 = 2(3x-15) => 4x+10 = 6x-30 => 2x=40 => x=20.'
      },
      {
        id: 'l3-02',
        difficulty: 3,
        level: 3,
        category: 'complex_cyclic',
        points: 20,
        question: 'In cyclic quad ABCD, angle A = x+20, angle C = x+40. Find angle A.',
        question_zh: '在圆内接四边形 ABCD 中，角 A = x+20，角 C = x+40。求角 A。',
        options: ['60°', '80°', '100°', '120°'],
        options_zh: ['60°', '80°', '100°', '120°'],
        correctIndex: 1,
        explanation: 'x+20 + x+40 = 180 => 2x=120 => x=60. Angle A = 60+20=80°.',
        explanation_zh: 'x+20 + x+40 = 180 => 2x=120 => x=60. 角 A = 60+20=80°.'
      },
      {
        id: 'l3-03',
        difficulty: 3,
        level: 3,
        category: 'tangent_logic',
        points: 20,
        question: 'P is 17cm from centre O. Radius is 8cm. Tangent PQ length is...',
        question_zh: 'P 点距离圆心 O 17cm。半径为 8cm。切线 PQ 的长度是...',
        options: ['9cm', '15cm', '25cm', '12.5cm'],
        options_zh: ['9cm', '15cm', '25cm', '12.5cm'],
        correctIndex: 1,
        explanation: '√(17² - 8²) = √(289 - 64) = √225 = 15cm.',
        explanation_zh: '√(17² - 8²) = √(289 - 64) = √225 = 15cm.'
      },
      {
        id: 'l3-04',
        difficulty: 3,
        level: 3,
        category: 'center_circumference',
        points: 20,
        question: 'Angle at centre by arc AB is 140°. Point C is on major arc, D on minor arc. Angle ADB is...',
        question_zh: '弧 AB 在圆心所对的角为 140°。点 C 在优弧上，D 在劣弧上。角 ADB 是...',
        options: ['70°', '110°', '140°', '220°'],
        options_zh: ['70°', '110°', '140°', '220°'],
        correctIndex: 1,
        explanation: 'Angle at major arc = 70°. ADB = 180-70 = 110°.',
        explanation_zh: '优弧所对的角 = 70°. ADB = 180-70 = 110°.'
      },
      {
        id: 'l3-05',
        difficulty: 3,
        level: 3,
        category: 'alternate_segment',
        points: 20,
        question: 'Tangent SAT at A. AB is chord. Angle TAB=65. ABC is triangle in circle, BC=AC. Find angle BAC.',
        question_zh: 'SAT 是 A 点的切线。AB 是弦。角 TAB=65°。ABC 是圆内的三角形，BC=AC。求角 BAC。',
        options: ['50°', '65°', '115°', '130°'],
        options_zh: ['50°', '65°', '115°', '130°'],
        correctIndex: 0,
        explanation: 'Angle ACB=65. Since BC=AC, angle BAC=65. Wait, 180-65-65 = 50°.',
        explanation_zh: '角 ACB=65°。由于 BC=AC，角 BAC=65°。等等，180-65-65 = 50°.'
      },
      {
        id: 'l3-06',
        difficulty: 3,
        level: 3,
        category: 'combination',
        points: 20,
        question: 'Angle in semicircle is 90. One chord is radius length. Smallest angle is...',
        question_zh: '半圆中的角为 90°。一条弦长等于半径。最小的角是...',
        options: ['30°', '45°', '60°', '15°'],
        options_zh: ['30°', '45°', '60°', '15°'],
        correctIndex: 0,
        explanation: 'Triangle with radius as side is equilateral with centre, so angle at circum is 30°.',
        explanation_zh: '以半径为边的三角形与圆心形成等边三角形，所以圆周角为 30°.'
      },
      {
        id: 'l3-07',
        difficulty: 3,
        level: 3,
        category: 'complex_tangent',
        points: 20,
        question: 'Two concentric circles radii 3 and 5. Length of chord of larger circle tangent to smaller is...',
        question_zh: '两个同心圆，半径分别为 3 和 5。较大圆的一条切线与较小圆相切，这条弦的长度是...',
        options: ['4', '6', '8', '10'],
        options_zh: ['4', '6', '8', '10'],
        correctIndex: 2,
        explanation: 'Half chord = √(5²-3²) = 4. Full chord = 8.',
        explanation_zh: '弦长的一半 = √(5²-3²) = 4. 弦长 = 8.'
      },
      {
        id: 'l3-08',
        difficulty: 3,
        level: 3,
        category: 'cyclic_quad',
        points: 20,
        question: 'ABCD cyclic quad. AB is diameter. Angle ADC=130. Find angle BAC.',
        question_zh: 'ABCD 是圆内接四边形。AB 是直径。角 ADC=130°。求角 BAC。',
        options: ['40°', '50°', '90°', '130°'],
        options_zh: ['40°', '50°', '90°', '130°'],
        correctIndex: 0,
        explanation: 'Angle ABC = 180-130=50. Angle ACB=90. BAC = 180-90-50=40°.',
        explanation_zh: '角 ABC = 180-130=50°。角 ACB=90°。BAC = 180-90-50=40°.'
      },
      {
        id: 'l3-09',
        difficulty: 3,
        level: 3,
        category: 'arc_logic',
        points: 20,
        question: 'Arc length is 1/4 of circumference. Angle at circumference subtended by this arc is...',
        question_zh: '弧长是圆周长的 1/4。这条弧在圆周所对的角是...',
        options: ['45°', '90°', '22.5°', '11.25°'],
        options_zh: ['45°', '90°', '22.5°', '11.25°'],
        correctIndex: 0,
        explanation: 'Centre angle = 360/4 = 90. Circumference angle = 90/2 = 45°.',
        explanation_zh: '圆心角 = 360/4 = 90°。圆周角 = 90/2 = 45°.'
      },
      {
        id: 'l3-10',
        difficulty: 3,
        level: 3,
        category: 'ultimate_challenge',
        points: 20,
        question: 'A circle has radius 1. A square is inscribed. What is the area of the square?',
        question_zh: '一个圆的半径为 1。一个正方形内接于圆。正方形的面积是多少？',
        options: ['1', '2', '4', 'π'],
        options_zh: ['1', '2', '4', 'π'],
        correctIndex: 1,
        explanation: 'Diagonal = diameter = 2. Side = √2. Area = (√2)² = 2.',
        explanation_zh: '对角线 = 直径 = 2. 边长 = √2. 面积 = (√2)² = 2.'
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
