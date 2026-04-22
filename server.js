const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 5173);
const ROOT_DIR = __dirname;
const SPARK_HTTP_URL = 'https://spark-api-open.xf-yun.com/v1/chat/completions';

function readEnvFile() {
    const envPath = path.join(ROOT_DIR, '.env');
    if (!fs.existsSync(envPath)) return;
    const text = fs.readFileSync(envPath, 'utf8');
    text.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const idx = trimmed.indexOf('=');
        if (idx <= 0) return;
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        process.env[key] = value;
    });
}

readEnvFile();

function json(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    res.end(JSON.stringify(data));
}

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const map = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp3': 'audio/mpeg',
        '.ico': 'image/x-icon'
    };
    return map[ext] || 'application/octet-stream';
}

function safeResolveFile(urlPath) {
    const clean = decodeURIComponent(urlPath.split('?')[0]);
    const normalized = clean === '/' ? '/index.html' : clean;
    const abs = path.resolve(ROOT_DIR, `.${normalized}`);
    if (!abs.startsWith(ROOT_DIR)) return null;
    return abs;
}

async function handleSparkProxy(req, res) {
    // 【作业免配置版】这里直接硬编码了你的明文密钥（请填入你正确的 APIPassword，不要填带冒号的 APIKey:APISecret）
    const apiPassword = '填入你真实的APIPassword';

    let raw = '';
    req.on('data', (chunk) => {
        raw += chunk;
    });
    req.on('end', async () => {
        let body;
        try {
            body = raw ? JSON.parse(raw) : {};
        } catch (e) {
            json(res, 400, { error: { message: 'Invalid JSON request body' } });
            return;
        }

        try {
            const upstream = await fetch(SPARK_HTTP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiPassword}`
                },
                body: JSON.stringify(body)
            });
            const text = await upstream.text();
            res.writeHead(upstream.status, {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            });
            res.end(text);
        } catch (error) {
            json(res, 502, {
                error: { message: `Spark upstream request failed: ${error && error.message ? error.message : 'Unknown'}` }
            });
        }
    });
}

const server = http.createServer(async (req, res) => {
    const { method, url } = req;
    if (!url) {
        json(res, 400, { error: { message: 'Invalid request URL' } });
        return;
    }

    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        });
        res.end();
        return;
    }

    if (method === 'POST' && url.startsWith('/api/spark')) {
        await handleSparkProxy(req, res);
        return;
    }

    if (method !== 'GET' && method !== 'HEAD') {
        json(res, 405, { error: { message: 'Method Not Allowed' } });
        return;
    }

    const abs = safeResolveFile(url);
    if (!abs) {
        json(res, 403, { error: { message: 'Forbidden path' } });
        return;
    }

    fs.stat(abs, (err, stat) => {
        if (err || !stat.isFile()) {
            json(res, 404, { error: { message: 'Not Found' } });
            return;
        }
        const contentType = getContentType(abs);
        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        });
        if (method === 'HEAD') {
            res.end();
            return;
        }
        fs.createReadStream(abs).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`[CircleLearn] Server running at http://localhost:${PORT}`);
    console.log('[CircleLearn] Spark proxy endpoint: /api/spark');
});
