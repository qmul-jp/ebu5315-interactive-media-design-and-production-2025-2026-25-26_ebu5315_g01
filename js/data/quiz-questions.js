/**
 * 完整强化版题库 (40道)
 * 涵盖：圆心角定理、半圆角、同弓形角、圆内接四边形、切线定理、弦切角定理等。
 */
window.QUIZ_QUESTIONS = [
    // --- LEVEL 1: 基础定义与核心定理 (1-15题) ---
    {
        id: 'l1-01',
        level: 1,
        category: 'center_circumference',
        question: 'The angle at the centre is how many times the angle at the circumference subtended by the same arc?',
        options: ['Equal', 'Twice', 'Half', 'Three times'],
        correctIndex: 1,
        explanation: 'The angle at the centre is twice the angle at the circumference.'
    },
    {
        id: 'l1-02',
        level: 1,
        category: 'semicircle',
        question: 'What is the size of an angle subtended by a diameter at the circumference?',
        options: ['45°', '60°', '90°', '180°'],
        correctIndex: 2,
        explanation: 'The angle in a semicircle is always a right angle (90°).'
    },
    {
        id: 'l1-03',
        level: 1,
        category: 'same_segment',
        question: 'Angles in the same segment of a circle are...',
        options: ['Supplementary', 'Equal', 'Complementary', 'Reciprocal'],
        correctIndex: 1,
        explanation: 'Angles subtended by the same arc at the circumference are equal.'
    },
    {
        id: 'l1-04',
        level: 1,
        category: 'cyclic_quad',
        question: 'Opposite angles in a cyclic quadrilateral always add up to...',
        options: ['90°', '180°', '270°', '360°'],
        correctIndex: 1,
        explanation: 'The sum of opposite angles in a cyclic quadrilateral is 180°.'
    },
    {
        id: 'l1-05',
        level: 1,
        category: 'tangent_radius',
        question: 'The angle between a tangent and a radius at the point of contact is...',
        options: ['0°', '45°', '90°', '180°'],
        correctIndex: 2,
        explanation: 'A tangent is perpendicular (90°) to the radius at the point of contact.'
    },
    {
        id: 'l1-06',
        level: 1,
        category: 'tangents_point',
        question: 'Two tangents drawn from the same external point to a circle are...',
        options: ['Parallel', 'Perpendicular', 'Equal in length', 'Unequal'],
        correctIndex: 2,
        explanation: 'Tangents from the same external point to a circle are equal in length.'
    },
    {
        id: 'l1-07',
        level: 1,
        category: 'alternate_segment',
        question: 'The angle between a tangent and a chord is equal to the angle in the...',
        options: ['Same segment', 'Alternate segment', 'Centre', 'Semicircle'],
        correctIndex: 1,
        explanation: 'This is the Alternate Segment Theorem.'
    },
    {
        id: 'l1-08',
        level: 1,
        category: 'chord_bisector',
        question: 'A radius that bisects a chord (not a diameter) must be...',
        options: ['Parallel to it', 'Perpendicular to it', 'Twice its length', 'Half its length'],
        correctIndex: 1,
        explanation: 'The line from the centre to the midpoint of a chord is perpendicular to the chord.'
    },
    {
        id: 'l1-09',
        level: 1,
        category: 'cyclic_quad',
        question: 'If one angle of a cyclic quadrilateral is 85°, what is the opposite angle?',
        options: ['85°', '95°', '105°', '180°'],
        correctIndex: 1,
        explanation: '180° - 85° = 95°.'
    },
    {
        id: 'l1-10',
        level: 1,
        category: 'center_circumference',
        question: 'If the angle at the circumference is 42°, the angle at the centre is...',
        options: ['21°', '42°', '84°', '168°'],
        correctIndex: 2,
        explanation: '42° * 2 = 84°.'
    },
    {
        id: 'l1-11',
        level: 1,
        category: 'isosceles_triangle',
        question: 'Two radii and a chord form what type of triangle?',
        options: ['Equilateral', 'Right-angled', 'Isosceles', 'Scalene'],
        correctIndex: 2,
        explanation: 'Since radii are equal in length, it forms an isosceles triangle.'
    },
    {
        id: 'l1-12',
        level: 1,
        category: 'tangent_radius',
        question: 'If a line is perpendicular to a radius at its outer endpoint, the line is a...',
        options: ['Chord', 'Secant', 'Tangent', 'Diameter'],
        correctIndex: 2,
        explanation: 'Definition of a tangent.'
    },
    {
        id: 'l1-13',
        level: 1,
        category: 'cyclic_quad',
        question: 'The exterior angle of a cyclic quadrilateral is equal to...',
        options: ['The interior opposite angle', 'The interior adjacent angle', '180°', '90°'],
        correctIndex: 0,
        explanation: 'Exterior angle = interior opposite angle.'
    },
    {
        id: 'l1-14',
        level: 1,
        category: 'semicircle',
        question: 'A triangle is drawn inside a circle with one side as the diameter. The largest angle is...',
        options: ['60°', '90°', '120°', '180°'],
        correctIndex: 1,
        explanation: 'Angle in a semicircle is 90°.'
    },
    {
        id: 'l1-15',
        level: 1,
        category: 'same_segment',
        question: 'If angle APB = 30° and P, Q are on the same arc, then angle AQB is...',
        options: ['15°', '30°', '60°', '90°'],
        correctIndex: 1,
        explanation: 'Angles in the same segment are equal.'
    },

    // --- LEVEL 2: 定理组合与应用 (16-30题) ---
    {
        id: 'l2-01',
        level: 2,
        category: 'center_circumference',
        question: 'A reflex angle at the centre is 210°. The angle at the circumference is...',
        options: ['105°', '150°', '75°', '210°'],
        correctIndex: 0,
        explanation: '210° / 2 = 105°.'
    },
    {
        id: 'l2-02',
        level: 2,
        category: 'cyclic_quad',
        question: 'In cyclic quad ABCD, angle A=2x and angle C=3x. Find x.',
        options: ['18°', '36°', '60°', '72°'],
        correctIndex: 1,
        explanation: '2x + 3x = 180 => 5x = 180 => x = 36.'
    },
    {
        id: 'l2-03',
        level: 2,
        category: 'tangents_point',
        question: 'P is an external point. PA and PB are tangents. If angle APB = 40°, find angle AOB (O is centre).',
        options: ['40°', '70°', '140°', '180°'],
        correctIndex: 2,
        explanation: 'Angles in quad OAPB: 90+90+40 + AOB = 360. AOB = 140°.'
    },
    {
        id: 'l2-04',
        level: 2,
        category: 'alternate_segment',
        question: 'Angle between tangent and chord is 55°. Find the angle in the alternate segment.',
        options: ['35°', '55°', '110°', '125°'],
        correctIndex: 1,
        explanation: 'They are equal by the Alternate Segment Theorem.'
    },
    {
        id: 'l2-05',
        level: 2,
        category: 'isosceles_triangle',
        question: 'In an isosceles triangle formed by two radii (O) and chord AB, if angle OAB = 25°, find angle AOB.',
        options: ['25°', '50°', '130°', '155°'],
        correctIndex: 2,
        explanation: '180 - 25 - 25 = 130°.'
    },
    {
        id: 'l2-06',
        level: 2,
        category: 'chord_bisector',
        question: 'A chord is 8cm long and is 3cm from the centre. What is the radius?',
        options: ['4cm', '5cm', '7cm', '10cm'],
        correctIndex: 1,
        explanation: 'Pythagoras: √(4² + 3²) = 5cm.'
    },
    {
        id: 'l2-07',
        level: 2,
        category: 'combination',
        question: 'Angle at centre is x+40, angle at circumference is x. Find x.',
        options: ['20°', '40°', '80°', '120°'],
        correctIndex: 1,
        explanation: 'x+40 = 2x => x = 40.'
    },
    {
        id: 'l2-08',
        level: 2,
        category: 'cyclic_quad',
        question: 'ABCD is a cyclic quad. If angle ABC = 110°, find exterior angle at D.',
        options: ['70°', '110°', '180°', '20°'],
        correctIndex: 1,
        explanation: 'Exterior angle = interior opposite (ABC) = 110°.'
    },
    {
        id: 'l2-09',
        level: 2,
        category: 'tangents_point',
        question: 'If tangents PA and PB from P form an equilateral triangle PAB with the chord AB, angle APB is...',
        options: ['30°', '45°', '60°', '90°'],
        correctIndex: 2,
        explanation: 'Equilateral triangles have 60° angles.'
    },
    {
        id: 'l2-10',
        level: 2,
        category: 'center_circumference',
        question: 'The angle subtended by a minor arc at the centre is 120°. The angle subtended by the major arc at the circumference is...',
        options: ['60°', '120°', '240°', '30°'],
        correctIndex: 0,
        explanation: '120 / 2 = 60°.'
    },
    {
        id: 'l2-11',
        level: 2,
        category: 'combination',
        question: 'If a chord of length 12cm is 8cm from the centre, the diameter is...',
        options: ['10cm', '20cm', '16cm', '24cm'],
        correctIndex: 1,
        explanation: 'Radius = √(6²+8²) = 10. Diameter = 20.'
    },
    {
        id: 'l2-12',
        level: 2,
        category: 'semicircle',
        question: 'In a semicircle with diameter AB, C is a point on arc. If AC = BC, angle BAC is...',
        options: ['30°', '45°', '60°', '90°'],
        correctIndex: 1,
        explanation: 'Angle C = 90°. Since AC=BC, angles A and B are (180-90)/2 = 45°.'
    },
    {
        id: 'l2-13',
        level: 2,
        category: 'alternate_segment',
        question: 'Triangle ABC is in a circle. Tangent at A forms 40° with AB. Find angle ACB.',
        options: ['40°', '50°', '80°', '140°'],
        correctIndex: 0,
        explanation: 'By Alternate Segment Theorem, angle ACB = 40°.'
    },
    {
        id: 'l2-14',
        level: 2,
        category: 'cyclic_quad',
        question: 'Three angles of cyclic quad are 100, 80, 70. The fourth is...',
        options: ['100°', '110°', '80°', '90°'],
        correctIndex: 1,
        explanation: 'Opposite to 70 is 180-70 = 110°.'
    },
    {
        id: 'l2-15',
        level: 2,
        category: 'tangents_point',
        question: 'Tangents PA, PB to circle centre O. If angle AOB=150, angle APB is...',
        options: ['15°', '30°', '75°', '150°'],
        correctIndex: 1,
        explanation: '180 - 150 = 30°.'
    },

    // --- LEVEL 3: 复杂推导与综合挑战 (31-40题) ---
    {
        id: 'l3-01',
        level: 3,
        category: 'combination',
        question: 'In a circle, angle at centre is 4x+10, angle at circumference is 3x-15. Find x.',
        options: ['10', '20', '25', '40'],
        correctIndex: 1,
        explanation: '4x+10 = 2(3x-15) => 4x+10 = 6x-30 => 2x=40 => x=20.'
    },
    {
        id: 'l3-02',
        level: 3,
        category: 'complex_cyclic',
        question: 'In cyclic quad ABCD, angle A = x+20, angle C = x+40. Find angle A.',
        options: ['60°', '80°', '100°', '120°'],
        correctIndex: 1,
        explanation: 'x+20 + x+40 = 180 => 2x=120 => x=60. Angle A = 60+20=80°.'
    },
    {
        id: 'l3-03',
        level: 3,
        category: 'tangent_logic',
        question: 'P is 17cm from centre O. Radius is 8cm. Tangent PQ length is...',
        options: ['9cm', '15cm', '25cm', '12.5cm'],
        correctIndex: 1,
        explanation: '√(17² - 8²) = √(289 - 64) = √225 = 15cm.'
    },
    {
        id: 'l3-04',
        level: 3,
        category: 'center_circumference',
        question: 'Angle at centre by arc AB is 140°. Point C is on major arc, D on minor arc. Angle ADB is...',
        options: ['70°', '110°', '140°', '220°'],
        correctIndex: 1,
        explanation: 'Angle at major arc = 70°. ADB = 180-70 = 110°.'
    },
    {
        id: 'l3-05',
        level: 3,
        category: 'alternate_segment',
        question: 'Tangent SAT at A. AB is chord. Angle TAB=65. ABC is triangle in circle, BC=AC. Find angle BAC.',
        options: ['50°', '65°', '115°', '130°'],
        correctIndex: 0,
        explanation: 'Angle ACB=65. Since BC=AC, angle BAC=65. Wait, 180-65-65 = 50°.'
    },
    {
        id: 'l3-06',
        level: 3,
        category: 'combination',
        question: 'Angle in semicircle is 90. One chord is radius length. Smallest angle is...',
        options: ['30°', '45°', '60°', '15°'],
        correctIndex: 0,
        explanation: 'Triangle with radius as side is equilateral with centre, so angle at circum is 30°.'
    },
    {
        id: 'l3-07',
        level: 3,
        category: 'complex_tangent',
        question: 'Two concentric circles radii 3 and 5. Length of chord of larger circle tangent to smaller is...',
        options: ['4', '6', '8', '10'],
        correctIndex: 2,
        explanation: 'Half chord = √(5²-3²) = 4. Full chord = 8.'
    },
    {
        id: 'l3-08',
        level: 3,
        category: 'cyclic_quad',
        question: 'ABCD cyclic quad. AB is diameter. Angle ADC=130. Find angle BAC.',
        options: ['40°', '50°', '90°', '130°'],
        correctIndex: 0,
        explanation: 'Angle ABC = 180-130=50. Angle ACB=90. BAC = 180-90-50=40°.'
    },
    {
        id: 'l3-09',
        level: 3,
        category: 'arc_logic',
        question: 'Arc length is 1/4 of circumference. Angle at circumference subtended by this arc is...',
        options: ['45°', '90°', '22.5°', '11.25°'],
        correctIndex: 0,
        explanation: 'Centre angle = 360/4 = 90. Circumference angle = 90/2 = 45°.'
    },
    {
        id: 'l3-10',
        level: 3,
        category: 'ultimate_challenge',
        question: 'A circle has radius 1. A square is inscribed. What is the area of the square?',
        options: ['1', '2', '4', 'π'],
        correctIndex: 1,
        explanation: 'Diagonal = diameter = 2. Side = √2. Area = (√2)² = 2.'
    }
];
