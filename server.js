/**
 * 会议录音助手 - 服务器 v4
 * serveo.net SSH 隧道（跟 PPT 项目同方案，零注册，移动端直接打开）
 */
const express = require('express');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const fs = require('fs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const PORT = 3000;
const PUBLIC_URL_FILE = path.join(__dirname, 'public-url.txt');
const URL_HISTORY_FILE = path.join(__dirname, 'url-history.log');

const app = express();

// ── 静态文件 ────────────────────────────────────
app.use(express.static(__dirname));

// ── 局域网 IP ───────────────────────────────────
function getLanIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}
const LAN_IP = getLanIP();

// ── 全局状态 ────────────────────────────────────
let publicUrl = null;
const serverStartTime = new Date().toISOString();

// ── API ─────────────────────────────────────────
app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        localUrl: `http://localhost:${PORT}`,
        lanUrl: `http://${LAN_IP}:${PORT}`,
        publicUrl: publicUrl || null,
        startTime: serverStartTime,
        uptime: Math.floor((Date.now() - new Date(serverStartTime).getTime()) / 1000),
    });
});

// ── iOS Safari 语音转文字 API ─────────────────
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'No audio file received' });
    }

    const audioBuffer = req.file.buffer;
    const tmpDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const tmpFile = path.join(tmpDir, 'recording_' + Date.now() + '.webm');
    fs.writeFileSync(tmpFile, audioBuffer);

    // Try whisper CLI
    try {
        const result = await tryWhisper(tmpFile);
        fs.unlinkSync(tmpFile);
        return res.json({ text: result, method: 'whisper' });
    } catch (e1) {
        // Try whisper via Python
        try {
            const result = await tryPythonWhisper(tmpFile);
            fs.unlinkSync(tmpFile);
            return res.json({ text: result, method: 'python-whisper' });
        } catch (e2) {
            // No STT available — return audio URL for download
            const pubFile = 'recording_' + Date.now() + '.webm';
            const pubPath = path.join(__dirname, 'uploads', pubFile);
            fs.renameSync(tmpFile, pubPath);
            const downloadUrl = `/uploads/${pubFile}`;
            return res.json({
                text: '',
                method: 'download',
                downloadUrl,
                message: '语音已录制。请下载音频文件后在桌面端播放转写，或安装 whisper 实现自动转写。'
            });
        }
    }
});

function tryWhisper(filePath) {
    return new Promise((resolve, reject) => {
        const proc = spawn('whisper', [filePath, '--model', 'tiny', '--language', 'zh', '--output_format', 'txt', '--output_dir', path.dirname(filePath)], {
            timeout: 60000,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let stdout = '';
        proc.stdout.on('data', d => { stdout += d.toString(); });
        proc.on('close', code => {
            if (code === 0) {
                const txtFile = filePath.replace(/\.[^.]+$/, '.txt');
                try { resolve(fs.readFileSync(txtFile, 'utf8').trim()); } catch (_) { resolve(stdout.trim()); }
            } else reject(new Error('whisper exited ' + code));
        });
        proc.on('error', reject);
    });
}

function tryPythonWhisper(filePath) {
    return new Promise((resolve, reject) => {
        const proc = spawn('python', ['-c', `
import whisper, sys
model = whisper.load_model("tiny")
result = model.transcribe("${filePath.replace(/\\/g, '\\\\')}", language="zh")
print(result["text"].strip())
`], { timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        proc.stdout.on('data', d => { stdout += d.toString(); });
        proc.on('close', code => {
            if (code === 0 && stdout.trim()) resolve(stdout.trim());
            else reject(new Error('python whisper failed'));
        });
        proc.on('error', reject);
    });
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ── 启动 Express ────────────────────────────────
function startServer() {
    return new Promise((resolve) => {
        app.listen(PORT, () => {
            console.log('');
            console.log('══════════════════════════════════════════════');
            console.log('     🎙️  会议录音助手 - 服务器已启动');
            console.log('══════════════════════════════════════════════');
            console.log(`  💻 本机:   http://localhost:${PORT}`);
            console.log(`  🏠 局域网: http://${LAN_IP}:${PORT}`);
            console.log('══════════════════════════════════════════════');
            resolve();
        });
    });
}

// ── 保存公网地址 ────────────────────────────────
function savePublicUrl(url) {
    try {
        fs.writeFileSync(PUBLIC_URL_FILE, url);
        const ts = new Date().toLocaleString('zh-CN', {
            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });
        fs.appendFileSync(URL_HISTORY_FILE, `  [${ts}] ${url}\n`);
    } catch (e) {
        // 忽略写入错误
    }
}

// ── serveo.net SSH 隧道（跟 PPT 项目一样）──────
function startServeoTunnel() {
    return new Promise((resolve) => {
        console.log('');
        console.log('🌐 正在创建公网隧道 (serveo.net)...');
        console.log('   (无需注册，断线自动重连)');
        console.log('');

        // 检查 SSH 是否可用
        const sshCheck = spawn('ssh', ['-V'], { stdio: 'ignore' });
        sshCheck.on('error', () => {
            console.log('  ❌ 未找到 SSH，请安装 OpenSSH 客户端');
            console.log('  Windows 设置 → 系统 → 可选功能 → OpenSSH 客户端');
            resolve(false);
        });
        sshCheck.on('close', (code) => {
            if (code !== 0) {
                // SSH 存在但版本检查可能返回非0，继续尝试
            }
            doConnect();
        });

        function doConnect() {
            const ssh = spawn('ssh', [
                '-o', 'StrictHostKeyChecking=no',
                '-o', 'UserKnownHostsFile=/dev/null',
                '-o', 'ServerAliveInterval=30',
                '-o', 'ServerAliveCountMax=3',
                '-o', 'ConnectTimeout=15',
                '-o', 'ExitOnForwardFailure=yes',
                '-R', `80:localhost:${PORT}`,
                'serveo.net',
            ], {
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            let firstUrl = true;

            const extractUrl = (data) => {
                const text = data.toString();
                // serveo.net 格式: https://xxx.serveo.net 或 https://xxx.serveousercontent.com
                const match = text.match(/(https?:\/\/[a-zA-Z0-9-]+\.serveo(?:usercontent)?\.(?:net|com))/);
                return match ? match[1] : null;
            };

            ssh.stdout.on('data', (data) => {
                process.stdout.write(data);
                const url = extractUrl(data);
                if (url && firstUrl) {
                    firstUrl = false;
                    publicUrl = url;
                    savePublicUrl(url);
                    printSuccessBanner();
                    resolve(true);
                }
            });

            ssh.stderr.on('data', (data) => {
                process.stdout.write(data);
                const url = extractUrl(data);
                if (url && firstUrl) {
                    firstUrl = false;
                    publicUrl = url;
                    savePublicUrl(url);
                    printSuccessBanner();
                    resolve(true);
                }
            });

            ssh.on('error', (err) => {
                if (firstUrl) {
                    console.log(`  ⚠️  SSH 连接失败: ${err.message}`);
                    console.log('');
                    console.log('  🔧 请确保:');
                    console.log('  1. OpenSSH 客户端已安装');
                    console.log('     Windows 设置 → 可选功能 → 添加 → OpenSSH 客户端');
                    console.log('  2. 网络可以连接 serveo.net');
                    console.log('');
                    resolve(false);
                }
            });

            ssh.on('close', (code) => {
                if (firstUrl) {
                    console.log(`  ⚠️  SSH 连接关闭 (code: ${code})`);
                    resolve(false);
                } else {
                    // 已获取过 URL，断开后自动重连
                    publicUrl = null;
                    console.log('');
                    console.log('⚠️  隧道断开，5秒后自动重连...');
                    setTimeout(() => {
                        console.log('🔄 正在重新连接...');
                        doConnect();
                    }, 5000);
                }
            });

            // 15 秒超时
            setTimeout(() => {
                if (firstUrl) {
                    ssh.kill();
                    resolve(false);
                }
            }, 20000);
        }
    });
}

// ── 打印成功横幅 ────────────────────────────────
function printSuccessBanner() {
    const qrApi = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='
        + encodeURIComponent(publicUrl);

    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('          🎉  公网访问已就绪');
    console.log('══════════════════════════════════════════════');
    console.log(`  🌐 ${publicUrl}`);
    console.log('──────────────────────────────────────────────');
    console.log('  📱 任何设备、任何网络均可直接访问');
    console.log('  手机 / 平板 / 其他电脑，输入上方地址即可');
    console.log('  📷 二维码:');
    console.log(`  ${qrApi}`);
    console.log('══════════════════════════════════════════════');
    console.log('');
    console.log('  💡 同 WiFi 用局域网更快:');
    console.log(`      http://${LAN_IP}:${PORT}`);
    console.log('  Ctrl+C 安全退出 | 断线自动重连');
    console.log('');
}

// ── 主入口 ──────────────────────────────────────
async function main() {
    await startServer();
    await startServeoTunnel();
}

main().catch(err => {
    console.error('❌ 启动失败:', err.message);
    console.log('');
    console.log('请先安装依赖:');
    console.log('  cd D:\\会议记录网站');
    console.log('  npm install express');
    console.log('');
    process.exit(1);
});
