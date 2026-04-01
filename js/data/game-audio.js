/**
 * game-audio.js - 游戏音效引擎（Web Audio API 程序化生成）
 * 放置在 js/data/ 目录下，作为游戏模块的共享数据/工具
 * 无需外部音频文件，完全纯前端实现
 */
const GameAudio = (() => {
    let ctx = null;
    let masterGain = null;
    let enabled = true;
    let volume = 0.5;

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

    function playNoise(duration = 0.1, vol = 0.2) {
        if (!enabled || !ctx) return;
        resume();
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol * volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 0.5;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        source.start();
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
        for (let i = 0; i < 8; i++) {
            playTone(440 * Math.pow(2, i / 12), 'square', 0.1, 0.15, i * 0.06);
        }
    }

    function playTick() {
        playTone(800, 'sine', 0.05, 0.15);
    }

    function playGameOver() {
        playTone(440, 'sine', 0.3, 0.2, 0);
        playTone(370, 'sine', 0.3, 0.2, 0.2);
        playTone(311, 'sine', 0.5, 0.2, 0.4);
    }

    // ===== 通用 =====
    function playClick() {
        playTone(600, 'sine', 0.05, 0.1);
    }

    function setVolume(v) {
        volume = Math.max(0, Math.min(1, v));
        if (masterGain) masterGain.gain.value = volume;
        localStorage.setItem('game_audio_volume', volume.toString());
    }

    function getVolume() { return volume; }

    function setEnabled(state) {
        enabled = state;
        localStorage.setItem('game_audio_enabled', state.toString());
    }

    function isEnabled() { return enabled; }

    function initSettings() {
        const sv = localStorage.getItem('game_audio_volume');
        if (sv !== null) volume = parseFloat(sv);
        const se = localStorage.getItem('game_audio_enabled');
        if (se !== null) enabled = se === 'true';
    }

    return {
        init, resume,
        playLaunch, playHitWormhole, playCollision, playStarRating,
        playShoot, playPerfect, playExcellent, playGood, playMiss, playCombo, playFrenzy, playTick, playGameOver,
        playClick,
        setVolume, getVolume, setEnabled, isEnabled, initSettings
    };
})();

document.addEventListener('DOMContentLoaded', () => GameAudio.initSettings());
document.addEventListener('pointerdown', () => GameAudio.init(), { once: true });
document.addEventListener('touchstart', () => GameAudio.init(), { once: true });
