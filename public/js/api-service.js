// API Service Module
class ApiService {
    constructor() {
        this.baseURL = '/api';
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (app.token) {
            config.headers.Authorization = `Bearer ${app.token}`;
        }

        try {
            showLoading(true);
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        } finally {
            showLoading(false);
        }
    }

    // Auth endpoints
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async register(email, password, fullName) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, fullName })
        });
    }

    async logout() {
        return this.request('/auth/logout', { method: 'POST' });
    }

    async getProfile() {
        return this.request('/auth/profile');
    }

    async updateProfile(data) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Recipe endpoints
    async getRecipes(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/recipes?${query}`);
    }

    async getMyRecipes(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/recipes/my-recipes?${query}`);
    }

    async getRecipe(id) {
        return this.request(`/recipes/${id}`);
    }

    async createRecipe(data) {
        return this.request('/recipes', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateRecipe(id, data) {
        return this.request(`/recipes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteRecipe(id) {
        return this.request(`/recipes/${id}`, { method: 'DELETE' });
    }

    async copyRecipe(id) {
        return this.request(`/recipes/${id}/copy`, { method: 'POST' });
    }

    async rateRecipe(id, rating, review) {
        return this.request(`/recipes/${id}/rate`, {
            method: 'POST',
            body: JSON.stringify({ rating, review })
        });
    }

    // Tag endpoints
    async getTags() {
        return this.request('/tags');
    }

    async createTag(data) {
        return this.request('/tags', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Ingredient endpoints
    async getIngredients(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/ingredients?${query}`);
    }

    async createIngredient(data) {
        return this.request('/ingredients', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Search endpoints
    async searchGlobal(query) {
        return this.request(`/search/global?q=${encodeURIComponent(query)}`);
    }

    async searchRecipes(params) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/search/recipes?${query}`);
    }

    async convertUnits(quantity, fromUnit, toUnit) {
        return this.request('/search/convert-units', {
            method: 'POST',
            body: JSON.stringify({ quantity, fromUnit, toUnit })
        });
    }

    async getUnits() {
        return this.request('/search/units');
    }

    // Upload endpoints
    async uploadRecipeImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        
        return this.request('/upload/recipe-image', {
            method: 'POST',
            headers: {},
            body: formData
        });
    }

    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);
        
        return this.request('/upload/avatar', {
            method: 'POST',
            headers: {},
            body: formData
        });
    }
}

// Export for use in main app
window.ApiService = ApiService;
