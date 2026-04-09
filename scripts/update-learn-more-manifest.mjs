/**
 * 扫描 assets/images/learn_more/进阶 与 更进阶，重写 js/data/learn-more-manifest.js
 * 用法：node scripts/update-learn-more-manifest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'assets', 'images', 'learn_more');
const outFile = path.join(root, 'js', 'data', 'learn-more-manifest.js');

const IMAGE_RE = /\.(png|jpe?g|webp|gif|svg)$/i;

function listImages(sub) {
    const dir = path.join(base, sub);
    if (!fs.existsSync(dir)) {
        console.warn('missing dir:', dir);
        return [];
    }
    return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isFile() && IMAGE_RE.test(d.name))
        .map((d) => d.name)
        .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

const advanced = listImages('进阶');
const moreAdvanced = listImages('更进阶');

const body = `/**
 * Learn More：进阶 / 更进阶 定理配图清单（按 assets/images/learn_more 下图片更新）
 * 更新方式：仓库根目录执行 \`node scripts/update-learn-more-manifest.mjs\`
 */
window.LEARN_MORE_MANIFEST = {
    advanced: ${JSON.stringify(advanced, null, 4).replace(/\n/g, '\n    ')},
    moreAdvanced: ${JSON.stringify(moreAdvanced, null, 4).replace(/\n/g, '\n    ')}
};
`;

fs.writeFileSync(outFile, body, 'utf8');
console.log('wrote', path.relative(root, outFile));
console.log('advanced:', advanced.length, 'moreAdvanced:', moreAdvanced.length);
