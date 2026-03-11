export default async function handler(req, res) {
    console.log('🚀 send-code.js wurde gestartet');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body;
        console.log('📧 Email:', email);

        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        const BOT_COOKIE = process.env.ROBLOX_COOKIE;
        console.log('🍪 Cookie vorhanden?', BOT_COOKIE ? '✅ JA' : '❌ NEIN');

        if (!BOT_COOKIE) {
            return res.status(500).json({ 
                success: false, 
                error: 'Bot cookie not configured' 
            });
        }

        // WICHTIG: User-Agent setzen (Roblox blockiert sonst!)
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Cookie': `.ROBLOSECURITY=${BOT_COOKIE}`,
            'Content-Type': 'application/json'
        };

        // 1️⃣ **NEU: Zuerst GET Request zu auth.roblox.com (ohne CSRF)**
        console.log('📡 Schritt 1: GET Request zu auth.roblox.com...');
        const getResponse = await fetch('https://auth.roblox.com/', {
            method: 'GET',
            headers: headers
        });

        // 2️⃣ **JETZT den CSRF-Token holen (mit POST)**
        console.log('📡 Schritt 2: POST Request für CSRF-Token...');
        const csrfResponse = await fetch('https://auth.roblox.com/v2/logout', {
            method: 'POST',
            headers: headers,
            // WICHTIG: Kein Body!
        });

        // Debug: Alle Response-Headers loggen
        console.log('Response Status:', csrfResponse.status);
        console.log('Response Headers:', Object.fromEntries(csrfResponse.headers));

        const csrfToken = csrfResponse.headers.get('x-csrf-token');
        
        if (!csrfToken) {
            // Wenn kein CSRF-Token, liegt's meist am Cookie
            console.log('❌ Kein CSRF-Token erhalten – Cookie prüfen!');
            
            // Versuch den Cookie-Status zu checken
            const cookieCheck = await fetch('https://users.roblox.com/v1/users/authenticated', {
                headers: headers
            });
            
            if (cookieCheck.status === 401) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'Cookie is invalid or expired',
                    details: 'Please refresh your .ROBLOSECURITY cookie'
                });
            }
            
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to get CSRF token',
                details: 'Cookie might need to be refreshed'
            });
        }

        console.log('✅ CSRF-Token erhalten:', csrfToken);

        // 3️⃣ **One-Time Code anfordern – JETZT MIT CSRF-TOKEN!**
        console.log('📡 Schritt 3: Fordere One-Time Code an...');
        
        const codeResponse = await fetch('https://auth.roblox.com/v1/onetimecode/send', {
            method: 'POST',
            headers: {
                ...headers,
                'x-csrf-token': csrfToken  // CSRF-Token hinzufügen!
            },
            body: JSON.stringify({ email: email })
        });

        const responseText = await codeResponse.text();
        console.log('Code Response Status:', codeResponse.status);
        console.log('Code Response Body:', responseText);

        if (codeResponse.status === 200 || codeResponse.status === 429) {
            console.log('✅ Code erfolgreich angefordert');
            res.status(200).json({ 
                success: true, 
                message: 'Code requested successfully'
            });
        } else {
            // Speziell: 403 mit "Token Validation Failed" – dann Token neu holen
            if (codeResponse.status === 403 && responseText.includes('Token Validation Failed')) {
                return res.status(400).json({
                    success: false,
                    error: 'CSRF token expired',
                    retry: true  // Signal zum Wiederholen
                });
            }

            res.status(400).json({ 
                success: false, 
                error: 'Failed to send code',
                status: codeResponse.status,
                details: responseText
            });
        }

    } catch (error) {
        console.log('❌ Catch Error:', error.message);
        console.log('Stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
