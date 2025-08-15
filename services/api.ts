export const api = {
    get: async (url: string, token: string | null) => {
        const response = await fetch(`http://localhost:3001${url}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // This could be a good place to trigger a logout
            }
            throw new Error('Network response was not ok');
        }
        return response.json();
    },
    post: async (url: string, data: any, token: string | null) => {
        const response = await fetch(`http://localhost:3001${url}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },
    put: async (url: string, data: any, token: string | null) => {
        const response = await fetch(`http://localhost:3001${url}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },
    delete: async (url: string, token: string | null) => {
        const response = await fetch(`http://localhost:3001${url}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Network response was not ok');
    },
};
