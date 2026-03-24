// MOCK AUTH SERVICE
// Simulates MSAL authentication for portfolio demonstration purposes.

const MOCK_USER = {
    username: "demo.user@example.com",
    name: "Demo User",
    homeAccountId: "mock-id-123",
    environment: "login.windows.net",
    tenantId: "mock-tenant-id",
    localAccountId: "mock-local-id"
};

// Simula a instância MSAL
export const msalInstance = {
    initialize: async () => Promise.resolve(),
    handleRedirectPromise: async () => Promise.resolve(null),
    setActiveAccount: (account) => sessionStorage.setItem('demo_user', JSON.stringify(account)),
    getActiveAccount: () => {
        const user = sessionStorage.getItem('demo_user');
        return user ? JSON.parse(user) : null;
    },
    logoutRedirect: async () => {
        sessionStorage.removeItem('demo_user');
        window.location.reload();
    }
};

export async function signIn() {
    // Simula delay de rede e login
    return new Promise((resolve) => {
        setTimeout(() => {
            msalInstance.setActiveAccount(MOCK_USER);
            window.location.reload(); // Simula o comportamento de redirect
            resolve();
        }, 800);
    });
}

export function signOut() {
    msalInstance.logoutRedirect();
}

export async function sendEmail(emailData) {
    console.log("--- MOCK EMAIL SEND ---");
    console.log("To:", emailData.to);
    console.log("Subject:", emailData.subject);
    console.log("Attachments:", emailData.attachments?.length);
    return Promise.resolve({ ok: true });
}