import * as msal from "@azure/msal-browser";

// MSAL configuration
const msalConfig = {
    auth: {
        clientId: "0a102342-3279-4cf1-bcf9-9bbf104a4434",
        authority: "https://login.microsoftonline.com/1fb2191f-c87b-46f6-993f-36116dcce77b",
        // Remove query (?) e hash (#) para garantir que a URI seja a base exata e corresponda ao Azure
        redirectUri: window.location.href.split(/[?#]/)[0]
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    }
};

export const msalInstance = new msal.PublicClientApplication(msalConfig);

// Escopos de permissão
export const loginRequest = {
    scopes: ["User.Read", "Mail.Send"],
    prompt: "select_account"
};

/**
 * Inicia o processo de login via Redirecionamento.
 * A página será recarregada após o login.
 */
export async function signIn() {
    try {
        // Usa loginRedirect para evitar problemas com popups
        await msalInstance.loginRedirect(loginRequest);
    } catch (err) {
        console.error("Erro durante o início do login:", err);
        throw err;
    }
}

/**
 * Inicia o logout via Redirecionamento.
 */
export function signOut() {
    const logoutRequest = {
        account: msalInstance.getActiveAccount()
    };
    if (logoutRequest.account) {
        msalInstance.logoutRedirect(logoutRequest);
    }
}

/**
 * Envia e-mail via Microsoft Graph
 */
export async function sendEmail(emailData) {
    const account = msalInstance.getActiveAccount();
    if (!account) {
        throw new Error("Sessão expirada. Recarregue e faça login.");
    }

    let tokenResponse;
    try {
        tokenResponse = await msalInstance.acquireTokenSilent({
            ...loginRequest,
            account: account
        });
    } catch (error) {
        if (error instanceof msal.InteractionRequiredAuthError) {
            // Se precisar de interação, usa redirect também
            await msalInstance.acquireTokenRedirect(loginRequest);
            return; // O código para aqui pois a página vai recarregar
        } else {
            throw error;
        }
    }

    const accessToken = tokenResponse.accessToken;
    const graphEndpoint = 'https://graph.microsoft.com/v1.0/me/sendMail';

    const message = {
        message: {
            subject: emailData.subject,
            body: {
                contentType: 'HTML',
                content: emailData.body
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: emailData.to
                    }
                }
            ],
            attachments: emailData.attachments || []
        },
        saveToSentItems: true
    };

    const response = await fetch(graphEndpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error?.message || "Erro ao enviar e-mail");
    }

    return response;
}