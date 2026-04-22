/**
 * game-i18n.js - 游戏板块双语数据
 * 放置在 js/data/ 目录下，作为游戏模块的共享数据
 */
window.GameI18N = (() => {
    let currentLang = 'zh';

    const translations = {
        // ===== 游戏选择页 =====
        'game.select.title': { zh: '选择游戏', en: 'Choose a Game' },
        'game.select.subtitle': { zh: '通过互动游戏探索圆的几何奥秘', en: 'Explore the mysteries of circle geometry through interactive games' },
        'game.slingshot.name': { zh: '引力弹弓', en: 'Gravity Slingshot' },
        'game.slingshot.desc': { zh: '利用行星引力弯曲弹道，将能量球射入虫洞！掌握半径、切线与弧长的奥秘。', en: 'Bend trajectories using planetary gravity and shoot energy balls into wormholes! Master radius, tangent, and arc length.' },
        'game.slingshot.tag': { zh: '物理解谜', en: 'Physics Puzzle' },
        'game.sniper.name': { zh: '圆周狙击', en: 'Pi Sniper' },
        'game.sniper.desc': { zh: '在单位圆上精准瞄准目标角度！挑战你的角度直觉，解锁弧度与扇形面积模式。', en: 'Aim precisely at target angles on the unit circle! Challenge your angle intuition and unlock radian & sector area modes.' },
        'game.sniper.tag': { zh: '精准射击', en: 'Precision Shooting' },
        'game.play': { zh: '开始游戏', en: 'Play Now' },

        // ===== 引力弹弓 =====
        'slingshot.title': { zh: '引力弹弓', en: 'Gravity Slingshot' },
        'slingshot.level': { zh: '关卡', en: 'Level' },
        'slingshot.shots': { zh: '发射', en: 'Shots' },
        'slingshot.best': { zh: '最佳', en: 'Best' },
        'slingshot.launch': { zh: '拖拽发射', en: 'Drag to Launch' },
        'slingshot.reset': { zh: '重置', en: 'Reset' },
        'slingshot.next': { zh: '下一关', en: 'Next Level' },
        'slingshot.retry': { zh: '重试', en: 'Retry' },
        'slingshot.win': { zh: '命中目标！', en: 'Target Hit!' },
        'slingshot.congrats': { zh: '恭喜通关！', en: 'Congratulations!' },
        'slingshot.playAgain': { zh: '从头再来？', en: 'Play Again?' },
        'slingshot.fail': { zh: '未命中！', en: 'Missed!' },
        'slingshot.selectLevel': { zh: '选择关卡', en: 'Select Level' },
        'slingshot.backToMenu': { zh: '返回菜单', en: 'Back to Menu' },
        'slingshot.start': { zh: '开始', en: 'Start' },
        'slingshot.knowledge.radius': { zh: '半径(r)：行星大小决定引力强度', en: 'Radius (r): Planet size determines gravity strength' },
        'slingshot.knowledge.area': { zh: '面积(A=πr²)：引力场覆盖范围', en: 'Area (A=πr²): Gravity field coverage' },
        'slingshot.knowledge.tangent': { zh: '切线：能量球脱离引力场的方向', en: 'Tangent: Direction of ball escaping gravity' },
        'slingshot.knowledge.arc': { zh: '弧长(L=rθ)：能量球绕行星的弧形轨迹', en: 'Arc Length (L=rθ): Curved trajectory around planet' },
        'slingshot.knowledge.pi': { zh: '圆周率(π)：轨道周长 C=2πr', en: 'Pi (π): Orbit circumference C=2πr' },
        'slingshot.achievements': { zh: '成就', en: 'Achievements' },
        'slingshot.skins': { zh: '皮肤', en: 'Skins' },
        'slingshot.achievementDetail': { zh: '成就详情', en: 'Achievement Detail' },
        'slingshot.skinDetail': { zh: '皮肤详情', en: 'Skin Detail' },
        'slingshot.unlockedAchievement': { zh: '解锁成就', en: 'Unlocked Achievement' },
        'slingshot.unlockedSkin': { zh: '解锁皮肤', en: 'Unlocked Skin' },
        'slingshot.progress': { zh: '进度', en: 'Progress' },
        'slingshot.equip': { zh: '穿戴', en: 'Equip' },
        'slingshot.equipped': { zh: '已装备', en: 'Equipped' },
        'slingshot.locked': { zh: '未解锁', en: 'Locked' },
        'slingshot.totalShots': { zh: '总发射次数', en: 'Total Shots' },
        'slingshot.totalStars': { zh: '获得星星', en: 'Total Stars' },
        'slingshot.finalDesc': { zh: '你已完成引力弹弓全部关卡', en: 'You have completed all Gravity Slingshot levels.' },
        'slingshot.skin.ball': { zh: '能量球', en: 'Ball' },
        'slingshot.skin.wormhole': { zh: '虫洞', en: 'Wormhole' },
        'slingshot.skin.planet': { zh: '星球', en: 'Planet' },

        // ===== 引力弹弓 - 皮肤 =====
        'slingshot.skin.ball.default': { zh: '默认', en: 'Default' },
        'slingshot.skin.ball.default.desc': { zh: '默认解锁', en: 'Unlocked by default' },
        'slingshot.skin.ball.comet': { zh: '彗星', en: 'Comet' },
        'slingshot.skin.ball.comet.desc': { zh: '解锁条件: 累计发射能量球达到 50 次', en: 'Unlock: Launch the ball 50 times in total' },
        'slingshot.skin.ball.pulsar': { zh: '脉冲星', en: 'Pulsar' },
        'slingshot.skin.ball.pulsar.desc': { zh: '解锁条件: 累计收集 15 颗星', en: 'Unlock: Collect 15 stars in total' },
        'slingshot.skin.ball.meteor': { zh: '陨石', en: 'Meteor' },
        'slingshot.skin.ball.meteor.desc': { zh: '解锁条件: 在任意关卡单次尝试发射超过 5 次后通关', en: 'Unlock: Clear any level after launching more than 5 times in a single try' },
        'slingshot.skin.ball.darkMatter': { zh: '暗物质', en: 'Dark Matter' },
        'slingshot.skin.ball.darkMatter.desc': { zh: '解锁条件: 成功通关第 10 关（死亡黑洞）', en: 'Unlock: Clear Level 10 (Deadly Black Hole)' },
        'slingshot.skin.ball.galaxy': { zh: '星系', en: 'Galaxy' },
        'slingshot.skin.ball.galaxy.desc': { zh: '解锁条件: 满星（36颗星）通关全部 12 关', en: 'Unlock: Clear all 12 levels with 3 stars (36 stars total)' },

        'slingshot.skin.wormhole.default': { zh: '默认', en: 'Default' },
        'slingshot.skin.wormhole.default.desc': { zh: '默认解锁', en: 'Unlocked by default' },
        'slingshot.skin.wormhole.spaceRift': { zh: '时空裂隙', en: 'Space Rift' },
        'slingshot.skin.wormhole.spaceRift.desc': { zh: '解锁条件: 累计通关 20 次任意关卡', en: 'Unlock: Clear any level 20 times in total' },
        'slingshot.skin.wormhole.quantumTunnel': { zh: '量子隧道', en: 'Quantum Tunnel' },
        'slingshot.skin.wormhole.quantumTunnel.desc': { zh: '解锁条件: 单局游戏以 1 杆（1次发射）完美通关', en: 'Unlock: Clear any level in 1 shot' },
        'slingshot.skin.wormhole.whiteHole': { zh: '白洞', en: 'White Hole' },
        'slingshot.skin.wormhole.whiteHole.desc': { zh: '解锁条件: 解锁 3 个任意成就', en: 'Unlock: Unlock any 3 achievements' },

        'slingshot.skin.planet.default': { zh: '默认', en: 'Default' },
        'slingshot.skin.planet.default.desc': { zh: '默认解锁', en: 'Unlocked by default' },
        'slingshot.skin.planet.iceAge': { zh: '冰川时代', en: 'Ice Age' },
        'slingshot.skin.planet.iceAge.desc': { zh: '解锁条件: 累计发射能量球达到 100 次', en: 'Unlock: Launch the ball 100 times in total' },
        'slingshot.skin.planet.lavaWorld': { zh: '熔岩世界', en: 'Lava World' },
        'slingshot.skin.planet.lavaWorld.desc': { zh: '解锁条件: 成功通关第 12 关（混乱星系）', en: 'Unlock: Clear Level 12 (Chaos Galaxy)' },
        'slingshot.skin.planet.cyberNeon': { zh: '赛博霓虹', en: 'Cyber Neon' },
        'slingshot.skin.planet.cyberNeon.desc': { zh: '解锁条件: 解锁所有能量球皮肤', en: 'Unlock: Unlock all ball skins' },
        'slingshot.skin.planet.ringedPlanet': { zh: '光环星', en: 'Ringed Planet' },
        'slingshot.skin.planet.ringedPlanet.desc': { zh: '解锁条件: 累计收集满 30 颗星', en: 'Unlock: Collect 30 stars in total' },

        // ===== 引力弹弓 - 成就 =====
        'slingshot.achievement.firstLaunch': { zh: '初次启航', en: 'First Launch' },
        'slingshot.achievement.firstLaunch.desc': { zh: '迈出探索宇宙的第一步', en: 'Take the first step in exploring the universe' },
        'slingshot.achievement.bullseye': { zh: '一发入魂', en: 'Bullseye' },
        'slingshot.achievement.bullseye.desc': { zh: '在除第 1 关外的任意关卡，仅用 1 次发射（1 杆）通关', en: 'Clear any level (except Level 1) in 1 shot' },
        'slingshot.achievement.neverGiveUp': { zh: '百折不挠', en: 'Never Give Up' },
        'slingshot.achievement.neverGiveUp.desc': { zh: '在同一关卡连续发射失败 3 次后，第 4 次及以上成功通关', en: 'Fail 3 times in a row, then clear the level' },
        'slingshot.achievement.starExplorer': { zh: '星空探索者', en: 'Star Explorer' },
        'slingshot.achievement.starExplorer.desc': { zh: '累计获得 15 颗星', en: 'Collect 15 stars in total' },
        'slingshot.achievement.blackHoleSurvivor': { zh: '黑洞幸存者', en: 'Black Hole Survivor' },
        'slingshot.achievement.blackHoleSurvivor.desc': { zh: '成功通关第 10 关“死亡黑洞”', en: 'Clear Level 10 "Deadly Black Hole"' },
        'slingshot.achievement.gravityMaster': { zh: '引力大师', en: 'Gravity Master' },
        'slingshot.achievement.gravityMaster.desc': { zh: '成功通关全部 12 个关卡', en: 'Clear all 12 levels' },
        'slingshot.achievement.perfectionist': { zh: '完美主义者', en: 'Perfectionist' },
        'slingshot.achievement.perfectionist.desc': { zh: '12 个关卡全部以最高评价（满星36星）通关', en: 'Clear all 12 levels with 3 stars' },

        // ===== 圆周狙击 =====
        'sniper.title': { zh: '圆周狙击', en: 'Pi Sniper' },
        'sniper.score': { zh: '得分', en: 'Score' },
        'sniper.combo': { zh: '连击', en: 'Combo' },
        'sniper.best': { zh: '最佳', en: 'Best' },
        'sniper.time': { zh: '时间', en: 'Time' },
        'sniper.perfect': { zh: '完美！', en: 'Perfect!' },
        'sniper.excellent': { zh: '优秀！', en: 'Excellent!' },
        'sniper.good': { zh: '良好', en: 'Good' },
        'sniper.hit': { zh: '命中', en: 'Hit' },
        'sniper.miss': { zh: '脱靶！', en: 'Miss!' },
        'sniper.frenzy': { zh: 'PI FRENZY!', en: 'PI FRENZY!' },
        'sniper.mode.angle': { zh: '角度模式', en: 'Angle Mode' },
        'sniper.mode.radian': { zh: '弧度模式', en: 'Radian Mode' },
        'sniper.mode.arc': { zh: '弧长模式', en: 'Arc Length Mode' },
        'sniper.mode.locked': { zh: '下一等级解锁', en: 'Unlock at next level' },
        'sniper.start': { zh: '开始', en: 'Start' },
        'sniper.restart': { zh: '重新开始', en: 'Restart' },
        'sniper.backToMenu': { zh: '返回菜单', en: 'Back to Menu' },
        'sniper.gameOver': { zh: '游戏结束', en: 'Game Over' },
        'sniper.finalScore': { zh: '最终得分', en: 'Final Score' },
        'sniper.newRecord': { zh: '新纪录！', en: 'New Record!' },
        'sniper.knowledge.unitCircle': { zh: '单位圆：半径为1的圆，是三角函数的基础', en: 'Unit Circle: A circle with radius 1, the foundation of trigonometry' },
        'sniper.knowledge.centralAngle': { zh: '圆心角：以圆心为顶点的角', en: 'Central Angle: An angle with vertex at the center' },
        'sniper.knowledge.radian': { zh: '弧度：弧长等于半径时的圆心角，π rad = 180°', en: 'Radian: Angle when arc length equals radius, π rad = 180°' },
        'sniper.knowledge.arcLength': { zh: '弧长 L = rθ（θ为弧度）', en: 'Arc Length L = rθ (θ in radians)' },
        'sniper.knowledge.sectorArea': { zh: '扇形面积 A = ½r²θ', en: 'Sector Area A = ½r²θ' },

        // ===== 圆周狙击 - Boss战 =====
        'sniper.boss.warning': { zh: 'BOSS战', en: 'BOSS BATTLE' },
        'sniper.boss.piGuardian': { zh: 'π 之守护者', en: 'Pi Guardian' },
        'sniper.boss.anglePhantom': { zh: '角度幻影', en: 'Angle Phantom' },
        'sniper.boss.defeated': { zh: 'Boss 已击败!', en: 'Boss Defeated!' },
        'sniper.boss.hit': { zh: 'Boss 命中!', en: 'Boss Hit!' },
        'sniper.boss.piGuardianDefeated': { zh: 'π 守护者击败! +300 双倍得分!', en: 'π Guardian Defeated! +300 Double Score!' },
        'sniper.boss.anglePhantomDefeated': { zh: '角度幻影击败! +500!', en: 'Angle Phantom Defeated! +500!' },
        'sniper.boss.escaped': { zh: 'Boss 逃跑了!', en: 'Boss Escaped!' },
        'sniper.shieldBlock': { zh: '护盾阻挡!', en: 'Shield!' },
        'sniper.boss.shieldBreak': { zh: '护盾破碎!', en: 'Shield Broken!' },
        'sniper.boss.doubleTime': { zh: '双倍得分时间!', en: 'Double Score Time!' },
        'sniper.boss.hitsRequired': { zh: '命中', en: 'Hits' },

        // ===== 圆周狙击 - 道具 =====
        'sniper.powerup.freeze': { zh: '时间冻结', en: 'Time Freeze' },
        'sniper.powerup.double': { zh: '双倍得分', en: 'Double Score' },
        'sniper.powerup.shrink': { zh: '缩小判定', en: 'Shrink Judgment' },
        'sniper.powerup.shield': { zh: '连击保护', en: 'Combo Shield' },
        'sniper.powerup.time': { zh: '时间增加', en: 'Time Bonus' },
        'sniper.powerup.pickup': { zh: '点击拾取', en: 'Tap to collect' },
        'sniper.powerup.active': { zh: '已激活', en: 'Active' },

        // ===== 圆周狙击 - 成就 =====
        'sniper.achievement.firstPerfect': { zh: '初试锋芒', en: 'First Blood' },
        'sniper.achievement.firstPerfect.desc': { zh: '首次获得 Perfect', en: 'Get your first Perfect' },
        'sniper.achievement.sniper': { zh: '百步穿杨', en: 'Sharpshooter' },
        'sniper.achievement.sniper.desc': { zh: '单局 10 次 Perfect', en: '10 Perfects in one game' },
        'sniper.achievement.godlike': { zh: '神射手', en: 'Godlike' },
        'sniper.achievement.godlike.desc': { zh: '单局 20 次 Perfect', en: '20 Perfects in one game' },
        'sniper.achievement.zeroError': { zh: '零误差', en: 'Zero Error' },
        'sniper.achievement.zeroError.desc': { zh: '连续 5 次 Perfect', en: '5 Perfects in a row' },
        'sniper.achievement.combo5': { zh: '小试连击', en: 'Combo Starter' },
        'sniper.achievement.combo5.desc': { zh: '达成 5 连击', en: 'Reach 5 combo' },
        'sniper.achievement.combo15': { zh: '连击风暴', en: 'Combo Storm' },
        'sniper.achievement.combo15.desc': { zh: '达成 15 连击', en: 'Reach 15 combo' },
        'sniper.achievement.combo30': { zh: '不可阻挡', en: 'Unstoppable' },
        'sniper.achievement.combo30.desc': { zh: '达成 30 连击', en: 'Reach 30 combo' },
        'sniper.achievement.bossHunter': { zh: 'Boss 猎人', en: 'Boss Hunter' },
        'sniper.achievement.bossHunter.desc': { zh: '击败首个 Boss', en: 'Defeat your first Boss' },
        'sniper.achievement.bossHarvester': { zh: 'Boss 收割者', en: 'Boss Harvester' },
        'sniper.achievement.bossHarvester.desc': { zh: '单局击败 2 个 Boss', en: 'Defeat 2 Bosses in one game' },
        'sniper.achievement.timeMaster': { zh: '时间管理大师', en: 'Time Master' },
        'sniper.achievement.timeMaster.desc': { zh: '在最后 1 秒命中 Perfect', en: 'Perfect in the last second' },
        'sniper.achievement.comeback': { zh: '逆境翻盘', en: 'Comeback' },
        'sniper.achievement.comeback.desc': { zh: '0 连击后连续达成 10 连击', en: '10 combo after resetting to 0' },
        'sniper.achievement.frenzyRegular': { zh: 'Frenzy 常客', en: 'Frenzy Regular' },
        'sniper.achievement.frenzyRegular.desc': { zh: '单局进入 Frenzy 3 次', en: 'Enter Frenzy 3 times in one game' },
        'sniper.achievement.unlocked': { zh: '已解锁', en: 'Unlocked' },

        // ===== 圆周狙击 - 练习报告 =====
        'sniper.report.title': { zh: '本局练习报告', en: 'Session Report' },
        'sniper.report.viewReport': { zh: '查看报告', en: 'View Report' },
        'sniper.report.close': { zh: '关闭', en: 'Close' },
        'sniper.report.hitRate': { zh: '命中率', en: 'Hit Rate' },
        'sniper.report.maxCombo': { zh: '最高连击', en: 'Max Combo' },
        'sniper.report.weakAngles': { zh: '薄弱角度区间', en: 'Weak Angle Ranges' },
        'sniper.report.practiceMore': { zh: '建议加强练习！', en: 'Keep practicing!' },
        'sniper.report.perfectCount': { zh: 'Perfect', en: 'Perfect' },
        'sniper.report.excellentCount': { zh: 'Excellent', en: 'Excellent' },
        'sniper.report.goodCount': { zh: 'Good', en: 'Good' },
        'sniper.report.hitCount': { zh: 'Hit', en: 'Hit' },
        'sniper.report.missCount': { zh: 'Miss', en: 'Miss' },
        'sniper.report.frenzyCount': { zh: 'Frenzy次数', en: 'Frenzy Count' },
        'sniper.report.bossDefeated': { zh: '击败Boss', en: 'Bosses Defeated' },

        // ===== 圆周狙击 - 记录 =====
        'sniper.record.bestScore': { zh: '历史最高分', en: 'Best Score' },
        'sniper.record.totalGames': { zh: '总游玩局数', en: 'Total Games' },
        'sniper.record.totalTime': { zh: '总游玩时间', en: 'Total Time' },
        'sniper.record.totalHits': { zh: '总击中目标', en: 'Total Hits' },
        'sniper.record.totalPerfects': { zh: '完美射击', en: 'Total Perfects' },
        'sniper.record.totalMisses': { zh: '脱靶次数', en: 'Total Misses' },
        'sniper.record.maxCombo': { zh: '历史最大连击', en: 'Max Combo' },
        'sniper.record.totalBoss': { zh: '击败 Boss', en: 'Boss Defeated' },
        'sniper.record.totalFrenzy': { zh: '触发 Frenzy', en: 'Frenzy Triggered' },

        // ===== 圆周狙击 - 互动公式卡片 =====
        'sniper.formula.title': { zh: '公式卡片', en: 'Formula Cards' },
        'sniper.formula.arcLength': { zh: '弧长公式', en: 'Arc Length Formula' },
        'sniper.formula.arcLength.desc': { zh: 'L = r × θ（θ为弧度）', en: 'L = r × θ (θ in radians)' },
        'sniper.formula.sectorArea': { zh: '扇形面积公式', en: 'Sector Area Formula' },
        'sniper.formula.sectorArea.desc': { zh: 'A = ½r²θ', en: 'A = ½r²θ' },
        'sniper.formula.radian': { zh: '弧度定义', en: 'Radian Definition' },
        'sniper.formula.radian.desc': { zh: '弧长等于半径时的圆心角，π rad = 180°', en: 'Angle when arc length equals radius, π rad = 180°' },
        'sniper.formula.example': { zh: '例：r=3, θ=π/4 → L = 3π/4 ≈ 2.36', en: 'Ex: r=3, θ=π/4 → L = 3π/4 ≈ 2.36' },
        'sniper.formula.arcLengthDesc': { zh: 'L = θr，θ 为弧度', en: 'L = θr, θ in radians' },
        'sniper.formula.sectorAreaDesc': { zh: 'S = ½θr²', en: 'S = ½θr²' },
        'sniper.formula.radianDesc': { zh: '180° = π rad', en: '180° = π rad' },
        'sniper.formula.tapToCycle': { zh: '点击切换', en: 'Tap to cycle' },
        'sniper.analysis.title': { zh: '误差', en: 'Error' },

        // ===== 圆周狙击 - 皮肤 =====
        'sniper.skin.crosshair': { zh: '准星样式', en: 'Crosshair Style' },
        'sniper.skin.lineColor': { zh: '瞄准线颜色', en: 'Aim Line Color' },
        'sniper.skin.circleStyle': { zh: '单位圆样式', en: 'Circle Style' },
        'sniper.skin.particle': { zh: '粒子效果', en: 'Particle Effect' },
        'sniper.skin.background': { zh: '背景主题', en: 'Background Theme' },
        'sniper.skin.default': { zh: '默认', en: 'Default' },
        'sniper.skin.circle': { zh: '圆形', en: 'Circle' },
        'sniper.skin.laser': { zh: '激光', en: 'Laser' },
        'sniper.skin.bow': { zh: '弓形', en: 'Bow' },
        'sniper.skin.green': { zh: '绿色', en: 'Green' },
        'sniper.skin.gold': { zh: '金色', en: 'Gold' },
        'sniper.skin.blue': { zh: '蓝色', en: 'Blue' },
        'sniper.skin.purple': { zh: '紫色', en: 'Purple' },
        'sniper.skin.rainbow': { zh: '彩虹', en: 'Rainbow' },
        'sniper.skin.standard': { zh: '标准', en: 'Standard' },
        'sniper.skin.neon': { zh: '霓虹', en: 'Neon' },
        'sniper.skin.minimal': { zh: '极简', en: 'Minimal' },
        'sniper.skin.retro': { zh: '复古', en: 'Retro' },
        'sniper.skin.star': { zh: '星光', en: 'Star' },
        'sniper.skin.fire': { zh: '火焰', en: 'Fire' },
        'sniper.skin.electric': { zh: '电弧', en: 'Electric' },
        'sniper.skin.deepSpace': { zh: '深空', en: 'Deep Space' },
        'sniper.skin.ocean': { zh: '海洋', en: 'Ocean' },
        'sniper.skin.forest': { zh: '森林', en: 'Forest' },
        'sniper.skin.cyberpunk': { zh: '赛博朋克', en: 'Cyberpunk' },
        'sniper.skin.laserDesc': { zh: '解锁条件: 单局获得 20 次 Perfect', en: 'Unlock: Get 20 Perfects in one game' },
        'sniper.skin.bowDesc': { zh: '解锁条件: 累计获得 50 次 Perfect', en: 'Unlock: Get 50 Perfects total' },
        'sniper.skin.purpleDesc': { zh: '解锁条件: 累计击败 5 个 Boss', en: 'Unlock: Defeat 5 Bosses total' },
        'sniper.skin.rainbowDesc': { zh: '解锁条件: 累计得分达到 10,000', en: 'Unlock: Reach 10,000 total score' },
        'sniper.skin.neonDesc': { zh: '解锁条件: 首次获得 Perfect', en: 'Unlock: Get your first Perfect' },
        'sniper.skin.retroDesc': { zh: '解锁条件: 累计游玩 10 局游戏', en: 'Unlock: Play 10 games total' },
        'sniper.skin.starDesc': { zh: '解锁条件: 首次获得 Perfect', en: 'Unlock: Get your first Perfect' },
        'sniper.skin.fireDesc': { zh: '解锁条件: 达成 30 连击', en: 'Unlock: Reach 30 combo' },
        'sniper.skin.electricDesc': { zh: '解锁条件: 累计击败 3 个 Boss', en: 'Unlock: Defeat 3 Bosses total' },
        'sniper.skin.cyberpunkDesc': { zh: '解锁条件: 累计游玩 20 局游戏', en: 'Unlock: Play 20 games total' },
        'sniper.skin.purple': { zh: '紫色', en: 'Purple' },
        'sniper.skin.rainbow': { zh: '彩虹', en: 'Rainbow' },
        'sniper.skin.neon': { zh: '霓虹', en: 'Neon' },
        'sniper.skin.minimal': { zh: '极简', en: 'Minimal' },
        'sniper.skin.retro': { zh: '复古', en: 'Retro' },
        'sniper.skin.star': { zh: '星光', en: 'Star' },
        'sniper.skin.fire': { zh: '火焰', en: 'Fire' },
        'sniper.skin.electric': { zh: '电弧', en: 'Electric' },
        'sniper.skin.deepSpace': { zh: '深空', en: 'Deep Space' },
        'sniper.skin.ocean': { zh: '海洋', en: 'Ocean' },
        'sniper.skin.forest': { zh: '森林', en: 'Forest' },
        'sniper.skin.cyberpunk': { zh: '赛博朋克', en: 'Cyberpunk' },
        'sniper.skin.locked': { zh: '未解锁', en: 'Locked' },

        // ===== 角度猎人 =====
        'game.hunter.name': { zh: '角度猎人', en: 'Angle Hunter' },
        'game.hunter.desc': { zh: '拖动圆上的顶点，发现隐藏的角度！掌握Thales定理、圆周角与内接四边形的奥秘。', en: 'Drag vertices on the circle to discover hidden angles! Master Thales\' theorem, inscribed angles, and cyclic quadrilateral properties.' },
        'game.hunter.tag': { zh: '角度解谜', en: 'Angle Puzzle' },
        'hunter.title': { zh: '角度猎人', en: 'Angle Hunter' },
        'hunter.level': { zh: '关卡', en: 'Level' },
        'hunter.solved': { zh: '已解', en: 'Solved' },
        'hunter.hints': { zh: '提示', en: 'Hints' },
        'hunter.start': { zh: '开始', en: 'Start' },
        'hunter.next': { zh: '下一关', en: 'Next Level' },
        'hunter.win': { zh: '全部角度已找到！', en: 'All Angles Found!' },
        'hunter.backToMenu': { zh: '返回菜单', en: 'Back to Menu' },
        'hunter.correct': { zh: '正确！', en: 'Correct!' },
        'hunter.wrong': { zh: '再想想...', en: 'Try again...' },
        'hunter.hintUsed': { zh: '提示已使用', en: 'Hint used' },
        'hunter.dragTip': { zh: '拖动顶点观察角度变化', en: 'Drag vertices to observe angle changes' },
        'hunter.clickAngle': { zh: '点击未知角度输入答案', en: 'Click unknown angle to input answer' },
        'hunter.knowledge.thales': { zh: 'Thales定理：半圆上的角始终为90°', en: 'Thales\' Theorem: Angle in a semicircle is always 90°' },
        'hunter.knowledge.inscribedAngle': { zh: '圆周角定理：圆周角 = 圆心角 ÷ 2', en: 'Inscribed Angle Theorem: Inscribed angle = Central angle ÷ 2' },
        'hunter.knowledge.sameArc': { zh: '同弧定理：同弧上的圆周角相等', en: 'Same Arc: Angles subtended by the same arc are equal' },
        'hunter.knowledge.cyclicQuad': { zh: '内接四边形：对角互补，∠A+∠C=180°', en: 'Cyclic Quadrilateral: Opposite angles sum to 180°' },
        'hunter.knowledge.triangleSum': { zh: '三角形内角和 = 180°', en: 'Triangle angle sum = 180°' },

        // ===== 弦之裂变 =====
        'game.chord.name': { zh: '弦之裂变', en: 'Chord Breaker' },
        'game.chord.desc': { zh: '发射能量球在圆内弹射！击中弦上的节点来通关，运用交弦定理。', en: 'Launch energy balls that bounce inside the circle! Hit chord nodes to clear levels using intersecting chords theorem.' },
        'game.chord.tag': { zh: '物理弹射', en: 'Pinball Puzzle' },
        'game.selectLevel': { zh: '请选择关卡：', en: 'Select Level:' },
        'chord.title': { zh: '弦之裂变', en: 'Chord Breaker' },
        'chord.level': { zh: '关卡', en: 'Level' },
        'chord.shots': { zh: '发射', en: 'Shots' },
        'chord.nodes': { zh: '节点', en: 'Nodes' },
        'chord.start': { zh: '开始', en: 'Start' },
        'chord.next': { zh: '下一关', en: 'Next Level' },
        'chord.retry': { zh: '重试', en: 'Retry' },
        'chord.win': { zh: '关卡通过！', en: 'Level Clear!' },
        'chord.finalCongrats': { zh: '恭喜通关！', en: 'Congratulations!' },
        'chord.finalDesc': { zh: '你已完成弦之裂变全部关卡', en: 'You have completed all Chord Breaker levels.' },
        'chord.playAgain': { zh: '再来一轮', en: 'Play Again' },
        'chord.backToMenu': { zh: '返回菜单', en: 'Back to Menu' },
        'chord.dragToAim': { zh: '在圆周上拖拽瞄准', en: 'Drag on circle to aim' },
        'chord.knowledge.chordTheorem': { zh: '交弦定理：PA × PB = PC × PD', en: 'Chord Theorem: PA × PB = PC × PD' },
        'chord.knowledge.secantTheorem': { zh: '割线定理：从圆外一点引割线，切线²=割线外段×全段', en: 'Secant Theorem: Tangent² = External segment × Whole secant' },
        'chord.knowledge.perpBisector': { zh: '弦的垂直平分线过圆心', en: 'Perpendicular bisector of a chord passes through the center' },
        'chord.knowledge.reflection': { zh: '反射定律：入射角=反射角（圆弧法线=半径方向）', en: 'Reflection: Angle of incidence = Angle of reflection (normal = radius direction)' },

        // ===== 弦之裂变 - 成就与皮肤 UI =====
        'chord.achievements': { zh: '成就', en: 'Achievements' },
        'chord.skins': { zh: '皮肤', en: 'Skins' },
        'chord.selectLevel': { zh: '选择关卡', en: 'Select Level' },
        'chord.achievementDetail': { zh: '成就详情', en: 'Achievement Detail' },
        'chord.skinDetail': { zh: '皮肤详情', en: 'Skin Detail' },
        'chord.progress': { zh: '进度', en: 'Progress' },
        'chord.equip': { zh: '穿戴', en: 'Equip' },
        'chord.equipped': { zh: '已装备', en: 'Equipped' },
        'chord.skin.skins': { zh: '弦界皮肤', en: 'Chord Skins' },
        'chord.achievement.unlocked': { zh: '已达成', en: 'Unlocked' },
        'chord.skin.unlocked': { zh: '解锁皮肤', en: 'Unlocked Skin' },

        // ===== 弦之裂变 - 成就详情 =====
        'chord.achievement.novice': { zh: '初探弦界', en: 'Novice' },
        'chord.achievement.novice.desc': { zh: '首次通关第 1 关。', en: 'Clear Level 1 for the first time.' },
        'chord.achievement.gettingTheHangOfIt': { zh: '渐入佳境', en: 'Getting the Hang of It' },
        'chord.achievement.gettingTheHangOfIt.desc': { zh: '累计获得 15 颗星星。', en: 'Collect 15 stars in total.' },
        'chord.achievement.fiveStarChain': { zh: '五星连珠', en: 'Five-Star Chain' },
        'chord.achievement.fiveStarChain.desc': { zh: '只发射一次便通关第 10 关。', en: 'Clear Level 10 with only 1 shot.' },
        'chord.achievement.geometryMaster': { zh: '几何大师', en: 'Geometry Master' },
        'chord.achievement.geometryMaster.desc': { zh: '成功通关最高难度（第 12 关）。', en: 'Clear the highest difficulty (Level 12).' },
        'chord.achievement.perfectionist': { zh: '完美主义', en: 'Perfectionist' },
        'chord.achievement.perfectionist.desc': { zh: '在所有 12 个关卡中全部获得 3 星评价。', en: 'Get 3 stars in all 12 levels.' },
        'chord.achievement.chordResonance': { zh: '弦音共振', en: 'Chord Resonance' },
        'chord.achievement.chordResonance.desc': { zh: '光线在关卡中累计发生 50 次反射。', en: 'Accumulate 50 ray reflections in levels.' },
        'chord.achievement.neverGiveUp': { zh: '百折不挠', en: 'Never Give Up' },
        'chord.achievement.neverGiveUp.desc': { zh: '在同一个关卡中消耗 5 个能量球后通关。', en: 'Clear a level after using 5 energy balls.' },

        // ===== 弦之裂变 - 皮肤详情 =====
        'chord.skin.balls': { zh: '能量球皮肤', en: 'Ball Skins' },
        'chord.skin.default': { zh: '经典霓虹', en: 'Classic Neon' },
        'chord.skin.default.desc': { zh: '默认拥有的经典青蓝色弦界。', en: 'The default classic cyan chord world.' },
        'chord.skin.cherryBlossom': { zh: '樱花飞舞', en: 'Cherry Blossom' },
        'chord.skin.cherryBlossom.desc': { zh: '累计获得 15 颗星星解锁。柔和的粉红色光晕与花瓣特效。', en: 'Unlock: Collect 15 stars. Soft pink halos with petal effects.' },
        'chord.skin.deepOcean': { zh: '深海潜流', en: 'Deep Ocean' },
        'chord.skin.deepOcean.desc': { zh: '通关第 8 关解锁。幽蓝色节点与类似水波纹的流动光线。', en: 'Unlock: Clear Level 8. Deep blue nodes and water-like flowing light.' },
        'chord.skin.goldenAge': { zh: '黄金时代', en: 'Golden Age' },
        'chord.skin.goldenAge.desc': { zh: '全12关获得3星解锁。纯金色描边与耀眼的金色激光。', en: 'Unlock: 3 stars in all 12 levels. Pure golden strokes and dazzling golden lasers.' },
        'chord.skin.cyberMatrix': { zh: '赛博矩阵', en: 'Cyber Matrix' },
        'chord.skin.cyberMatrix.desc': { zh: '累计光线反射 50 次解锁。品红与荧光绿撞色，带有故障风格的连线。', en: 'Unlock: 50 ray reflections. Magenta and neon green with glitch style.' },

        // ===== 弦之裂变 - 能量球皮肤 =====
        'chord.skin.ball.default': { zh: '纯白光球', en: 'Pure White' },
        'chord.skin.ball.default.desc': { zh: '默认拥有的纯白色实心圆球，带有柔和白光拖尾。', en: 'Default pure white solid ball with soft white trail.' },
        'chord.skin.ball.fireball': { zh: '炽热火球', en: 'Fireball' },
        'chord.skin.ball.fireball.desc': { zh: '累计获得 20 颗星星解锁。核心为橙黄色，拖尾为跳动的火焰粒子。', en: 'Unlock: Collect 20 stars. Orange-yellow core with jumping fire particle trail.' },
        'chord.skin.ball.frostCore': { zh: '冰霜核心', en: 'Frost Core' },
        'chord.skin.ball.frostCore.desc': { zh: '达成成就【初探弦界】解锁。冰蓝色球体，拖尾为菱形冰晶碎片。', en: 'Unlock: "Novice" achievement. Ice blue ball with diamond ice crystal trail.' },
        'chord.skin.ball.darkMatter': { zh: '暗影物质', en: "Dark Matter" },
        'chord.skin.ball.darkMatter.desc': { zh: '达成成就【百折不挠】解锁。黑色球体，带有紫色的发光边缘与深紫迷雾拖尾。', en: 'Unlock: "Never Give Up" achievement. Black ball with purple glowing edge and dark purple mist trail.' },
        'chord.skin.ball.lightning': { zh: '闪电穿梭', en: 'Lightning' },
        'chord.skin.ball.lightning.desc': { zh: '达成成就【五星连珠】解锁。亮黄色球体，拖尾带有折线的电流闪烁特效。', en: 'Unlocked by achievement "Five-Star Chain". Bright yellow ball with lightning trail.' },
    };

    function t(key) {
        const entry = translations[key];
        if (!entry) return key;
        return entry[currentLang] || entry['en'] || key;
    }

    function getLang() { return currentLang; }

    function setLang(lang) {
        if (lang === 'zh' || lang === 'en') {
            currentLang = lang;
            document.dispatchEvent(new CustomEvent('gameLanguageChanged', { detail: { lang } }));
        }
    }

    /** 初始化：从 localStorage 或全局 lang 设置读取 */
    function init() {
        // 优先使用全站语言设置（由 utils.js 的 initLangToggle 管理）
        const siteLang = localStorage.getItem('lang');
        const legacyLang = localStorage.getItem('pref_lang');
        const mergedLang = siteLang || legacyLang;
        if (mergedLang && (mergedLang === 'zh' || mergedLang === 'en')) {
            currentLang = mergedLang;
        } else {
            const browserLang = navigator.language || 'en';
            currentLang = browserLang.startsWith('zh') ? 'zh' : 'en';
        }
    }

    /** 自动翻译页面中所有带 data-game-i18n 属性的元素 */
    function translatePage() {
        document.querySelectorAll('[data-game-i18n]').forEach(el => {
            const key = el.getAttribute('data-game-i18n');
            el.textContent = t(key);
        });
        document.querySelectorAll('[data-game-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-game-i18n-placeholder');
            el.placeholder = t(key);
        });
    }

    document.addEventListener('gameLanguageChanged', translatePage);

    return { t, getLang, setLang, init, translatePage };
})();
