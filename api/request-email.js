// api/request-email.js
// Vercel Serverless Function to automate Cloudflare Email Routing

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { alias, forward } = req.body;

        if (!alias || !forward) {
            return res.status(400).json({ error: 'Alias and forward email are required' });
        }

        const cleanAlias = alias.replace('@thehashcode.org', '').trim().toLowerCase();
        const forwardTo = forward.trim().toLowerCase();

        // Enforce validations
        const aliasRegex = /^[a-z0-9._-]+$/;
        if (!aliasRegex.test(cleanAlias)) {
            return res.status(400).json({ error: 'El alias contiene caracteres inválidos.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(forwardTo)) {
            return res.status(400).json({ error: 'El correo de destino no es válido.' });
        }

        const token = process.env.CLOUDFLARE_API_TOKEN;
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const zoneId = process.env.CLOUDFLARE_ZONE_ID;

        if (!token || !accountId || !zoneId) {
            console.warn('Cloudflare environment variables are not configured.');
            return res.status(501).json({ 
                error: 'Automation unconfigured', 
                message: 'El servidor no tiene configuradas las claves de Cloudflare. Por favor, realiza la solicitud por correo.' 
            });
        }

        // 1. Add destination address to Cloudflare Account (triggers Cloudflare verification email)
        const addressResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/email/routing/addresses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                address: forwardTo
            })
        });

        const addressData = await addressResponse.json();
        console.log('Cloudflare address registration output:', addressData);
        // Note: We proceed even if address exists or throws an error (e.g. already registered or verified)

        // 2. Create routing rule on the Cloudflare Zone
        const ruleResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/rules`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                enabled: true,
                name: `Forward ${cleanAlias}@thehashcode.org to ${forwardTo}`,
                matchers: [
                    {
                        type: 'literal',
                        field: 'to',
                        value: `${cleanAlias}@thehashcode.org`
                    }
                ],
                actions: [
                    {
                        type: 'forward',
                        value: [forwardTo]
                    }
                ]
            })
        });

        const ruleData = await ruleResponse.json();
        console.log('Cloudflare routing rule registration output:', ruleData);

        if (!ruleResponse.ok || !ruleData.success) {
            const errorMsg = ruleData.errors && ruleData.errors[0] ? ruleData.errors[0].message : 'Error desconocido de Cloudflare';
            return res.status(500).json({ 
                error: 'Cloudflare API error', 
                message: `Error de Cloudflare: ${errorMsg}` 
            });
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Alias creado y configurado en Cloudflare.',
            addressData: addressData,
            ruleData: ruleData
        });

    } catch (error) {
        console.error('Error handling request-email backend:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
