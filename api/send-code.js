// Sendet One-Time Code an User-Email
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        const BOT_COOKIE = process.env.ROBLOX_COOKIE;

        if (!BOT_COOKIE) {
            return res.status(500).json({ error: 'Bot cookie not configured' });
        }

        // CSRF Token holen
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

        // One-Time Code anfordern
        const codeResponse = await fetch('https://auth.roblox.com/v1/onetimecode/send', {
            method: 'POST',
            headers: {
                'Cookie': `.ROBLOSECURITY=${BOT_COOKIE}`,
                'x-csrf-token': csrfToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email
            })
        });

        if (codeResponse.status === 200 || codeResponse.status === 429) {
            res.status(200).json({ 
                success: true, 
                message: 'Code requested successfully'
            });
        } else {
            const errorText = await codeResponse.text();
            res.status(400).json({ 
                success: false, 
                error: 'Failed to send code',
                details: errorText
            });
        }

    } catch (error) {
        console.error('Send Code Error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
