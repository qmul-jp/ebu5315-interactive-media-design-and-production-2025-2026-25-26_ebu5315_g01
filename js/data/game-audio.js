/**
 * game-audio.js - 游戏音效引擎（Web Audio API 程序化生成）
 * 放置在 js/data/ 目录下，作为游戏模块的共享数据/工具
 * 无需外部音频文件，完全纯前端实现
 */
const GameAudio = (() => {
    let ctx = null;
    let masterGain = null;
    let enabled = true;
    let bgmEnabled = true;
    let volume = 0.5;

    // 外部加载的音效文件 (使用相对于 HTML 页面的正确路径)
    const bossWarningAudio = new Audio('../assets/audio/game/pi-sniper/boss_alert.mp3');

    // BGM 音频对象
    const bgmTracks = {
        // pi-sniper BGM
        cyberpunk: new Audio('../assets/audio/game/pi-sniper/cyberpunk.mp3'),
        forest: new Audio('../assets/audio/game/pi-sniper/forest.mp3'),
        sea: new Audio('../assets/audio/game/pi-sniper/sea.mp3'),
        space: new Audio('../assets/audio/game/pi-sniper/space.mp3'),
        // gravity-slingshot BGM
        slingshot_normal: new Audio('../assets/audio/game/gravity-slingshot/normal_universe.mp3'),
        slingshot_ultra: new Audio('../assets/audio/game/gravity-slingshot/ultra_universe.mp3'),
        slingshot_ice: new Audio('../assets/audio/game/gravity-slingshot/ice.mp3'),
        slingshot_volcano: new Audio('../assets/audio/game/gravity-slingshot/volcano.mp3'),
        slingshot_cyberpunk: new Audio('../assets/audio/game/gravity-slingshot/cyberpunk.mp3'),
        // chord-breaker BGM
        chord_default: new Audio('../assets/audio/game/chord-breaker/space.mp3'),
        chord_cherryBlossom: new Audio('../assets/audio/game/chord-breaker/cherry_blossom.mp3'),
        chord_deepOcean: new Audio('../assets/audio/game/chord-breaker/sea.mp3'),
        chord_goldenAge: new Audio('../assets/audio/game/chord-breaker/golden_age.mp3'),
        chord_cyberMatrix: new Audio('../assets/audio/game/chord-breaker/cyberpunk.mp3')
    };

    // 配置 BGM 循环
    for (const key in bgmTracks) {
        bgmTracks[key].loop = true;
    }

    let currentBgm = null;

    function getSafeVolume() {
        const v = Number(volume);
        if (!Number.isFinite(v)) return 0.5;
        return Math.max(0, Math.min(1, v));
    }

    function playBgm(theme) {
        if (!enabled) return;

        // 映射主题到对应的音乐
        let trackKey = 'space'; // 默认

        // pi-sniper 映射
        if (theme === 'cyberpunk') trackKey = 'cyberpunk';
        else if (theme === 'forest') trackKey = 'forest';
        else if (theme === 'ocean') trackKey = 'sea';
        else if (theme === 'deepSpace') trackKey = 'space';

        // gravity-slingshot 映射 (星球皮肤)
        else if (theme === 'slingshot_default') trackKey = 'slingshot_normal';
        else if (theme === 'slingshot_ringedPlanet') trackKey = 'slingshot_ultra';
        else if (theme === 'slingshot_iceAge') trackKey = 'slingshot_ice';
        else if (theme === 'slingshot_lavaWorld') trackKey = 'slingshot_volcano';
        else if (theme === 'slingshot_cyberNeon') trackKey = 'slingshot_cyberpunk';

        // chord-breaker 映射 (弦界皮肤)
        else if (theme === 'chord_default') trackKey = 'chord_default';
        else if (theme === 'chord_cherryBlossom') trackKey = 'chord_cherryBlossom';
        else if (theme === 'chord_deepOcean') trackKey = 'chord_deepOcean';
        else if (theme === 'chord_goldenAge') trackKey = 'chord_goldenAge';
        else if (theme === 'chord_cyberMatrix') trackKey = 'chord_cyberMatrix';

        const track = bgmTracks[trackKey];
        if (!track) return;

        // 如果要播放的正是当前音乐，不中断
        if (currentBgm === track) {
            // 如果音乐被暂停了，尝试继续播放
            if (bgmEnabled && currentBgm.paused) {
                currentBgm.volume = getSafeVolume() * 0.5; // BGM音量稍低一点，避免盖过音效
                currentBgm.play().catch(e => console.warn("BGM播放失败:", e));
            }
            return;
        }

        // 停止当前音乐
        if (currentBgm) {
            currentBgm.pause();
            currentBgm.currentTime = 0;
        }

        // 播放新音乐
        currentBgm = track;
        currentBgm.volume = getSafeVolume() * 0.5;
        // 在大多数浏览器中，对未完全加载的 Audio 对象设置 currentTime = 0 可能会静默失败或抛错，
        // 这里采用更安全的处理方式：如果是第一次播放，直接 play
        try {
            currentBgm.currentTime = 0;
        } catch (e) { }

        if (bgmEnabled) {
            const playPromise = currentBgm.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => console.warn("BGM播放失败 (可能被自动播放策略拦截):", e));
            }
        }
    }

    function stopBgm() {
        if (currentBgm) {
            currentBgm.pause();
        }
    }

    function init() {
        if (ctx) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = volume;
            masterGain.connect(ctx.destination);
        } catch (e) {
            console.warn('Web Audio API not supported');
            enabled = false;
        }
    }

    function resume() {
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    function playTone(freq, type = 'sine', duration = 0.1, vol = 0.3, delay = 0) {
        if (!enabled || !ctx) return;
        resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(vol * volume, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
    }

    function playNoise(duration = 0.1, vol = 0.2, delay = 0) {
        if (!enabled || !ctx) return;
        resume();
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol * volume, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 0.5;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        source.start(ctx.currentTime + delay);
    }

    // ===== 引力弹弓音效 =====
    function playLaunch() {
        if (!enabled || !ctx) return;
        resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3 * volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    }

    function playHitWormhole() {
        playTone(523, 'sine', 0.3, 0.3, 0);
        playTone(659, 'sine', 0.3, 0.25, 0.05);
        playTone(784, 'sine', 0.4, 0.2, 0.1);
        playTone(1047, 'sine', 0.5, 0.15, 0.15);
    }

    function playCollision() {
        playNoise(0.15, 0.3);
        playTone(80, 'sine', 0.2, 0.3);
    }

    function playStarRating(stars) {
        const base = 440;
        for (let i = 0; i < stars; i++) {
            playTone(base * Math.pow(2, i / 6), 'sine', 0.3, 0.25, i * 0.15);
        }
    }

    // ===== 圆周狙击音效 =====
    function playShoot() {
        if (!enabled || !ctx) return;
        resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15 * volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }

    function playPerfect() {
        playTone(880, 'sine', 0.15, 0.3);
        playTone(1108, 'sine', 0.2, 0.25, 0.08);
        playTone(1319, 'sine', 0.3, 0.2, 0.16);
    }

    function playExcellent() {
        playTone(784, 'sine', 0.15, 0.25);
        playTone(988, 'sine', 0.2, 0.2, 0.08);
    }

    function playGood() {
        playTone(659, 'sine', 0.15, 0.2);
    }

    function playMiss() {
        playNoise(0.2, 0.15);
        playTone(200, 'sawtooth', 0.15, 0.1);
    }

    function playCombo(combo) {
        const freq = 440 * Math.pow(2, Math.min(combo, 12) / 12);
        playTone(freq, 'sine', 0.1, 0.2);
    }

    function playFrenzy() {
        // 使用锯齿波和方波组合，创造类似"充能爆发"和"警报升级"的激昂音效
        const baseFreq = 300;
        for (let i = 0; i < 12; i++) {
            // 频率逐渐飙升
            const freq = baseFreq * Math.pow(1.2, i);
            // 节奏越来越快
            const delay = i * Math.max(0.02, 0.1 - i * 0.008);
            playTone(freq, 'sawtooth', 0.1, 0.2, delay);
            // 叠加一层高八度的方波增加刺激感
            playTone(freq * 2, 'square', 0.08, 0.1, delay);
        }
        // 结尾一声强烈的长音爆发
        playTone(1500, 'sawtooth', 0.4, 0.3, 0.6);
        playNoise(0.4, 0.2); // 伴随白噪音模拟能量释放
    }

    function playTick() {
        playTone(800, 'sine', 0.05, 0.15);
    }

    function playGameOver() {
        playTone(440, 'sine', 0.3, 0.2, 0);
        playTone(370, 'sine', 0.3, 0.2, 0.2);
        playTone(311, 'sine', 0.5, 0.2, 0.4);
    }

    // ===== 圆周狙击 - Boss战音效 =====
    function playBossWarning() {
        if (!enabled) return;

        // 设置音量，保持与全局音量同步
        bossWarningAudio.volume = volume;

        // 重置播放进度并播放
        bossWarningAudio.currentTime = 0;
        bossWarningAudio.play().catch(e => {
            console.warn("Boss警告音效播放失败:", e);
        });
    }

    function playBossShieldBreak() {
        playNoise(0.15, 0.25);
        playTone(600, 'sawtooth', 0.1, 0.2);
        playTone(900, 'sawtooth', 0.15, 0.15, 0.05);
    }

    function playBossDefeated() {
        playTone(523, 'sine', 0.2, 0.3, 0);
        playTone(659, 'sine', 0.2, 0.3, 0.1);
        playTone(784, 'sine', 0.2, 0.3, 0.2);
        playTone(1047, 'sine', 0.4, 0.35, 0.3);
        playTone(1319, 'sine', 0.5, 0.3, 0.45);
    }

    function playBossHit() {
        playTone(440, 'sine', 0.1, 0.2);
        playTone(550, 'sine', 0.1, 0.15, 0.05);
    }

    // ===== 圆周狙击 - 道具音效 =====
    function playPowerupSpawn() {
        playTone(880, 'sine', 0.08, 0.15);
        playTone(1100, 'sine', 0.08, 0.12, 0.04);
        playTone(1320, 'sine', 0.1, 0.1, 0.08);
    }

    function playPowerupPickup() {
        playTone(660, 'sine', 0.1, 0.2);
        playTone(880, 'sine', 0.1, 0.2, 0.06);
        playTone(1100, 'sine', 0.15, 0.2, 0.12);
    }

    function playPowerupActivate() {
        playTone(523, 'sine', 0.15, 0.25);
        playTone(784, 'sine', 0.15, 0.25, 0.08);
        playTone(1047, 'sine', 0.2, 0.2, 0.16);
    }

    // ===== 圆周狙击 - 成就音效 =====
    function playAchievement() {
        playTone(784, 'sine', 0.15, 0.2, 0);
        playTone(988, 'sine', 0.15, 0.2, 0.1);
        playTone(1175, 'sine', 0.15, 0.2, 0.2);
        playTone(1568, 'sine', 0.3, 0.25, 0.3);
    }

    // ===== 通用 =====
    function playClick() {
        playTone(600, 'sine', 0.05, 0.1);
    }

    function setVolume(v) {
        const parsed = Number(v);
        volume = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.5;
        if (masterGain) masterGain.gain.value = volume;
        if (currentBgm) currentBgm.volume = volume * 0.5;
        localStorage.setItem('game_audio_volume', volume.toString());
    }

    function getVolume() { return volume; }

    function setEnabled(state) {
        enabled = !!state;
        if (!enabled) {
            stopBgm();
        } else if (currentBgm && bgmEnabled) {
            currentBgm.play().catch(e => console.warn("BGM恢复失败:", e));
        }
        localStorage.setItem('game_audio_enabled', state.toString());
    }

    function isEnabled() { return enabled; }

    function setBgmEnabled(state) {
        bgmEnabled = !!state;
        if (!bgmEnabled) {
            stopBgm();
        } else if (currentBgm && enabled) {
            currentBgm.play().catch(e => console.warn("BGM恢复失败:", e));
        }
        localStorage.setItem('game_audio_bgm_enabled', state.toString());
    }

    function isBgmEnabled() { return bgmEnabled; }

    function initSettings() {
        const sv = localStorage.getItem('game_audio_volume');
        if (sv !== null) {
            const parsed = parseFloat(sv);
            volume = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.5;
        } else {
            volume = 0.5;
        }

        const se = localStorage.getItem('game_audio_enabled');
        if (se === 'true') enabled = true;
        else if (se === 'false') enabled = false;
        else enabled = true;

        const sb = localStorage.getItem('game_audio_bgm_enabled');
        if (sb === 'true') bgmEnabled = true;
        else if (sb === 'false') bgmEnabled = false;
        else bgmEnabled = true;
    }

    return {
        init, resume,
        playBgm, stopBgm,
        playLaunch, playHitWormhole, playCollision, playStarRating,
        playShoot, playPerfect, playExcellent, playGood, playMiss, playCombo, playFrenzy, playTick, playGameOver,
        playBossWarning, playBossShieldBreak, playBossDefeated, playBossHit,
        playPowerupSpawn, playPowerupPickup, playPowerupActivate,
        playAchievement,
        playClick,
        setVolume, getVolume, setEnabled, isEnabled, setBgmEnabled, isBgmEnabled, initSettings
    };
})();

document.addEventListener('DOMContentLoaded', () => GameAudio.initSettings());
document.addEventListener('pointerdown', () => GameAudio.init(), { once: true });
document.addEventListener('touchstart', () => GameAudio.init(), { once: true });
