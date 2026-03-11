export default async function handler(req, res) {
    console.log('🚀 send-code.js wurde gestartet');
    console.log('Method:', req.method);
    
    // Nur POST erlauben
    if (req.method !== 'POST') {
        console.log('❌ Falsche Methode:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body;
        console.log('📧 Email erhalten:', email);

        if (!email) {
            console.log('❌ Keine Email im Request');
            return res.status(400).json({ error: 'Email required' });
        }

        // Environment Variables checken
        console.log('🔍 Prüfe Environment Variables...');
        const BOT_COOKIE = process.env.ROBLOX_COOKIE;
        console.log('ROBLOX_COOKIE vorhanden?', BOT_COOKIE ? '✅ JA' : '❌ NEIN');
        
        if (!BOT_COOKIE) {
            console.log('❌ ROBLOX_COOKIE fehlt in Vercel!');
            return res.status(500).json({ 
                success: false, 
                error: 'Bot cookie not configured',
                details: 'Set ROBLOX_COOKIE in Vercel Environment Variables'
            });
        }

        console.log('✅ Cookie vorhanden, rufe Roblox API auf...');

        // 1. CSRF Token holen
        console.log('📡 Hole CSRF Token...');
        const csrfResponse = await fetch('https://auth.roblox.com/v2/logout', {
            method: 'POST',
            headers: {
                'Cookie': `.ROBLOSECURITY=${BOT_COOKIE}`
            }
        });

        const csrfToken = csrfResponse.headers.get('x-csrf-token');
        console.log('CSRF Token erhalten?', csrfToken ? '✅ JA' : '❌ NEIN');

        if (!csrfToken) {
            console.log('❌ Kein CSRF Token – Cookie ungültig?');
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to get CSRF token',
                details: 'Cookie might be invalid or expired'
            });
        }

        // 2. One-Time Code anfordern
        console.log('📡 Fordere One-Time Code an für:', email);
        const codeResponse = await fetch('https://auth.roblox.com/v1/onetimecode/send', {
            method: 'POST',
            headers: {
                'Cookie': `.ROBLOSECURITY=${BOT_COOKIE}`,
                'x-csrf-token': csrfToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        });

        console.log('Roblox Response Status:', codeResponse.status);
        
        const responseText = await codeResponse.text();
        console.log('Roblox Response Body:', responseText);

        // 3. Antwort auswerten
        if (codeResponse.status === 200 || codeResponse.status === 429) {
            console.log('✅ Code erfolgreich angefordert');
            res.status(200).json({ 
                success: true, 
                message: 'Code requested successfully'
            });
        } else {
            console.log('❌ Roblox Fehler:', codeResponse.status);
            res.status(400).json({ 
                success: false, 
                error: 'Failed to send code',
                status: codeResponse.status,
                details: responseText
            });
        }

    } catch (error) {
        console.log('❌ CATCH Error:', error.message);
        console.log('Stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        });
    }
}
