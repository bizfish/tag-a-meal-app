// Application State
class AppState {
    constructor() {
        this.user = null;
        this.token = localStorage.getItem('token');
        this.currentPage = 'home';
        this.recipes = [];
        this.tags = [];
        this.ingredients = [];
        this.currentRecipe = null;
        this.editingRecipe = null;
    }

    setUser(user) {
        this.user = user;
        this.updateUI();
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    updateUI() {
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        
        if (this.user) {
            userName.textContent = this.user.fullName || this.user.email;
            userAvatar.src = this.user.avatarUrl || '/api/placeholder-avatar';
            this.showAuthenticatedUI();
        } else {
            userName.textContent = 'Guest';
            userAvatar.src = '/api/placeholder-avatar';
            this.showGuestUI();
        }
    }

    showAuthenticatedUI() {
        const authRequiredElements = document.querySelectorAll('[data-auth-required]');
        authRequiredElements.forEach(el => el.style.display = 'block');
    }

    showGuestUI() {
        const authRequiredElements = document.querySelectorAll('[data-auth-required]');
        authRequiredElements.forEach(el => el.style.display = 'none');
    }
}

// API Service
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

// UI Utilities
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.add('active');
    } else {
        spinner.classList.remove('active');
    }
}

function showToast(message, type = 'success', title = '') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    toast.innerHTML = `
        <i class="toast-icon ${iconMap[type] || iconMap.info}"></i>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Auto remove after 5 seconds
    const autoRemove = setTimeout(() => removeToast(toast), 5000);

    // Manual close
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(autoRemove);
        removeToast(toast);
    });
}

function removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
}

function navigateToPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
        app.currentPage = pageId;

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const navItem = document.querySelector(`[data-page="${pageId}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        // Load page data
        loadPageData(pageId);
    }
}

async function loadPageData(pageId) {
    try {
        switch (pageId) {
            case 'home':
                await loadHomePage();
                break;
            case 'recipes':
                await loadRecipesPage();
                break;
            case 'my-recipes':
                await loadMyRecipesPage();
                break;
            case 'create-recipe':
                await loadCreateRecipePage();
                break;
            case 'profile':
                await loadProfilePage();
                break;
        }
    } catch (error) {
        console.error('Error loading page data:', error);
        showToast('Failed to load page data', 'error');
    }
}

// Page Loaders
async function loadHomePage() {
    try {
        // Load featured recipes
        const recipesData = await api.getRecipes({ limit: 6 });
        renderRecipeGrid(recipesData.recipes, 'featuredRecipes');

        // Load stats (mock data for now)
        document.getElementById('totalRecipes').textContent = recipesData.pagination?.total || '0';
        document.getElementById('totalUsers').textContent = '1,234';
        document.getElementById('totalTags').textContent = '45';
        document.getElementById('totalIngredients').textContent = '567';
    } catch (error) {
        console.error('Error loading home page:', error);
    }
}

async function loadRecipesPage() {
    try {
        const recipesData = await api.getRecipes();
        renderRecipeGrid(recipesData.recipes, 'recipesGrid');
        
        // Load tags for filters
        const tagsData = await api.getTags();
        renderTagFilters(tagsData.tags);
    } catch (error) {
        console.error('Error loading recipes page:', error);
    }
}

async function loadMyRecipesPage() {
    if (!app.user) {
        showModal('authModal');
        return;
    }

    try {
        const recipesData = await api.getMyRecipes();
        renderRecipeGrid(recipesData.recipes, 'myRecipesGrid');
    } catch (error) {
        console.error('Error loading my recipes page:', error);
    }
}

async function loadCreateRecipePage() {
    if (!app.user) {
        showModal('authModal');
        return;
    }

    try {
        // Load tags and ingredients for the form
        const [tagsData, ingredientsData] = await Promise.all([
            api.getTags(),
            api.getIngredients()
        ]);
        
        app.tags = tagsData.tags;
        app.ingredients = ingredientsData.ingredients;
        
        renderRecipeTagsForm();
        
        // Reset form if not editing
        if (!app.editingRecipe) {
            document.getElementById('recipeForm').reset();
            document.getElementById('recipeFormTitle').textContent = 'Create New Recipe';
            clearIngredientsList();
        }
    } catch (error) {
        console.error('Error loading create recipe page:', error);
    }
}

async function loadProfilePage() {
    if (!app.user) {
        showModal('authModal');
        return;
    }

    try {
        const profileData = await api.getProfile();
        const user = profileData.user;
        
        document.getElementById('profileFullName').value = user.fullName || '';
        document.getElementById('profileEmail').value = user.email || '';
        document.getElementById('profileAvatar').src = user.avatarUrl || '/api/placeholder-avatar';
    } catch (error) {
        console.error('Error loading profile page:', error);
    }
}

// Render Functions
function renderRecipeGrid(recipes, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!recipes || recipes.length === 0) {
        container.innerHTML = '<p class="text-center">No recipes found.</p>';
        return;
    }

    container.innerHTML = recipes.map(recipe => `
        <div class="recipe-card" onclick="viewRecipe('${recipe.id}')">
            <img src="${recipe.image_url || '/api/placeholder-recipe'}" alt="${recipe.title}" class="recipe-image">
            <div class="recipe-content">
                <h3 class="recipe-title">${recipe.title}</h3>
                <p class="recipe-description">${recipe.description || ''}</p>
                <div class="recipe-meta">
                    <span><i class="fas fa-clock"></i> ${recipe.prep_time || 0}+${recipe.cook_time || 0} min</span>
                    <span><i class="fas fa-users"></i> ${recipe.servings || 1} servings</span>
                    <span class="difficulty-${recipe.difficulty}">${recipe.difficulty || 'easy'}</span>
                </div>
                <div class="recipe-tags">
                    ${(recipe.recipe_tags || []).map(rt => 
                        `<span class="tag" style="background-color: ${rt.tags.color}">${rt.tags.name}</span>`
                    ).join('')}
                </div>
                <div class="recipe-footer">
                    <div class="recipe-author">
                        <img src="${recipe.users?.avatar_url || '/api/placeholder-avatar'}" alt="Author" class="author-avatar">
                        <span>${recipe.users?.full_name || 'Anonymous'}</span>
                    </div>
                    <div class="recipe-rating">
                        <i class="fas fa-star"></i>
                        <span>${recipe.averageRating?.toFixed(1) || '0.0'}</span>
                        <span>(${recipe.totalRatings || 0})</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderTagFilters(tags) {
    const container = document.getElementById('tagFilters');
    if (!container) return;

    container.innerHTML = tags.map(tag => `
        <span class="tag-filter" data-tag="${tag.name}" style="border-color: ${tag.color}">
            ${tag.name}
        </span>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.tag-filter').forEach(filter => {
        filter.addEventListener('click', () => {
            filter.classList.toggle('active');
            filterRecipes();
        });
    });
}

function renderRecipeTagsForm() {
    const container = document.getElementById('recipeTags');
    if (!container) return;

    container.innerHTML = app.tags.map(tag => `
        <label class="tag-checkbox">
            <input type="checkbox" value="${tag.id}" name="recipeTags">
            <span class="tag" style="background-color: ${tag.color}">${tag.name}</span>
        </label>
    `).join('');
}

function addIngredientRow() {
    const container = document.getElementById('ingredientsList');
    const row = document.createElement('div');
    row.className = 'ingredient-item';
    row.innerHTML = `
        <div class="form-group">
            <input type="text" placeholder="Ingredient name" class="ingredient-name" list="ingredientsList">
        </div>
        <div class="form-group">
            <input type="number" placeholder="Quantity" class="ingredient-quantity" step="0.01">
        </div>
        <div class="form-group">
            <input type="text" placeholder="Unit" class="ingredient-unit">
        </div>
        <div class="form-group">
            <input type="text" placeholder="Notes" class="ingredient-notes">
        </div>
        <button type="button" class="ingredient-remove" onclick="removeIngredientRow(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(row);
}

function removeIngredientRow(button) {
    button.closest('.ingredient-item').remove();
}

function clearIngredientsList() {
    document.getElementById('ingredientsList').innerHTML = '';
    addIngredientRow(); // Add one empty row
}

// Event Handlers
async function handleAuth(event) {
    event.preventDefault();
    
    const isLogin = !document.getElementById('registerFields').style.display || 
                   document.getElementById('registerFields').style.display === 'none';
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    try {
        let response;
        if (isLogin) {
            response = await api.login(email, password);
        } else {
            const fullName = document.getElementById('authFullName').value;
            const confirmPassword = document.getElementById('authConfirmPassword').value;
            
            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
            
            response = await api.register(email, password, fullName);
        }
        
        app.setToken(response.session.access_token);
        app.setUser(response.user);
        
        hideModal('authModal');
        showToast(`${isLogin ? 'Login' : 'Registration'} successful!`, 'success');
        
        // Reload current page if auth was required
        if (['my-recipes', 'create-recipe', 'profile'].includes(app.currentPage)) {
            loadPageData(app.currentPage);
        }
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleLogout() {
    try {
        await api.logout();
        app.setToken(null);
        app.setUser(null);
        navigateToPage('home');
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        // Clear local state even if API call fails
        app.setToken(null);
        app.setUser(null);
        navigateToPage('home');
    }
}

async function handleRecipeSubmit(event) {
    event.preventDefault();
    
    if (!app.user) {
        showModal('authModal');
        return;
    }
    
    try {
        const formData = new FormData(event.target);
        const ingredients = [];
        
        // Collect ingredients
        document.querySelectorAll('.ingredient-item').forEach(item => {
            const name = item.querySelector('.ingredient-name').value.trim();
            const quantity = item.querySelector('.ingredient-quantity').value;
            const unit = item.querySelector('.ingredient-unit').value.trim();
            const notes = item.querySelector('.ingredient-notes').value.trim();
            
            if (name) {
                ingredients.push({ name, quantity: parseFloat(quantity) || null, unit, notes });
            }
        });
        
        // Collect selected tags
        const tags = Array.from(document.querySelectorAll('input[name="recipeTags"]:checked'))
            .map(input => input.value);
        
        const recipeData = {
            title: document.getElementById('recipeTitle').value,
            description: document.getElementById('recipeDescription').value,
            instructions: document.getElementById('recipeInstructions').value,
            prepTime: parseInt(document.getElementById('recipePrepTime').value) || null,
            cookTime: parseInt(document.getElementById('recipeCookTime').value) || null,
            servings: parseInt(document.getElementById('recipeServings').value) || null,
            difficulty: document.getElementById('recipeDifficulty').value,
            isPublic: document.getElementById('recipePublic').value === 'true',
            ingredients,
            tags
        };
        
        // Add image URL if uploaded
        const imagePreview = document.querySelector('#imagePreview img');
        if (imagePreview && imagePreview.dataset.url) {
            recipeData.imageUrl = imagePreview.dataset.url;
        }
        
        let response;
        if (app.editingRecipe) {
            response = await api.updateRecipe(app.editingRecipe.id, recipeData);
            showToast('Recipe updated successfully!', 'success');
        } else {
            response = await api.createRecipe(recipeData);
            showToast('Recipe created successfully!', 'success');
        }
        
        app.editingRecipe = null;
        navigateToPage('my-recipes');
        
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const response = await api.uploadRecipeImage(file);
        
        // Update preview
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `
            <img src="${response.imageUrl}" alt="Recipe preview" style="max-width: 100%; height: 200px; object-fit: cover; border-radius: 8px;" data-url="${response.imageUrl}">
            <button type="button" onclick="removeImage()" class="btn btn-secondary" style="margin-top: 1rem;">
                <i class="fas fa-trash"></i> Remove Image
            </button>
        `;
        
        showToast('Image uploaded successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function removeImage() {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = `
        <button type="button" id="uploadImageBtn" class="upload-btn">
            <i class="fas fa-camera"></i>
            <span>Upload Image</span>
        </button>
    `;
    
    // Re-attach event listener
    document.getElementById('uploadImageBtn').addEventListener('click', () => {
        document.getElementById('recipeImage').click();
    });
}

async function viewRecipe(recipeId) {
    try {
        const recipe = await api.getRecipe(recipeId);
        app.currentRecipe = recipe;
        renderRecipeDetail(recipe);
        navigateToPage('recipe-detail');
    } catch (error) {
        showToast('Failed to load recipe', 'error');
    }
}

function renderRecipeDetail(recipe) {
    const container = document.getElementById('recipeDetail');
    
    container.innerHTML = `
        <div class="recipe-header">
            <h1>${recipe.title}</h1>
            <img src="${recipe.image_url || '/api/placeholder-recipe'}" alt="${recipe.title}" class="recipe-detail-image">
            <p class="recipe-description">${recipe.description || ''}</p>
            
            <div class="recipe-detail-meta">
                <div class="meta-item">
                    <i class="fas fa-clock"></i>
                    <span>Prep: ${recipe.prep_time || 0} min</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-fire"></i>
                    <span>Cook: ${recipe.cook_time || 0} min</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-users"></i>
                    <span>${recipe.servings || 1} servings</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-signal"></i>
                    <span>${recipe.difficulty || 'easy'}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-star"></i>
                    <span>${recipe.averageRating?.toFixed(1) || '0.0'} (${recipe.totalRatings || 0} reviews)</span>
                </div>
            </div>
            
            <div class="recipe-tags">
                ${(recipe.recipe_tags || []).map(rt => 
                    `<span class="tag" style="background-color: ${rt.tags.color}">${rt.tags.name}</span>`
                ).join('')}
            </div>
            
            ${app.user && app.user.id === recipe.user_id ? `
                <div class="recipe-actions" style="margin-top: 1rem;">
                    <button class="btn btn-primary" onclick="editRecipe('${recipe.id}')">
                        <i class="fas fa-edit"></i> Edit Recipe
                    </button>
                    <button class="btn btn-secondary" onclick="copyRecipe('${recipe.id}')">
                        <i class="fas fa-copy"></i> Copy Recipe
                    </button>
                    <button class="btn btn-error" onclick="deleteRecipe('${recipe.id}')">
                        <i class="fas fa-trash"></i> Delete Recipe
                    </button>
                </div>
            ` : ''}
        </div>
        
        <div class="recipe-detail-content">
            <div class="ingredients-section">
                <h3>Ingredients</h3>
                <ul class="ingredient-list">
                    ${(recipe.recipe_ingredients || []).map(ri => `
                        <li>
                            <span>${ri.ingredients.name}</span>
                            <span>${ri.quantity || ''} ${ri.unit || ''}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="instructions-section">
                <h3>Instructions</h3>
                <div class="instructions-text">${recipe.instructions}</div>
            </div>
        </div>
    `;
}

async function editRecipe(recipeId) {
    try {
        const recipe = await api.getRecipe(recipeId);
        app.editingRecipe = recipe;
        
        // Populate form
        document.getElementById('recipeFormTitle').textContent = 'Edit Recipe';
        document.getElementById('recipeTitle').value = recipe.title;
        document.getElementById('recipeDescription').value = recipe.description || '';
        document.getElementById('recipeInstructions').value = recipe.instructions;
        document.getElementById('recipePrepTime').value = recipe.prep_time || '';
        document.getElementById('recipeCookTime').value = recipe.cook_time || '';
        document.getElementById('recipeServings').value = recipe.servings || '';
        document.getElementById('recipeDifficulty').value = recipe.difficulty || 'easy';
        document.getElementById('recipePublic').value = recipe.is_public ? 'true' : 'false';
        
        // Populate ingredients
        clearIngredientsList();
        recipe.recipe_ingredients.forEach(ri => {
            addIngredientRow();
            const lastRow = document.querySelector('.ingredient-item:last-child');
            lastRow.querySelector('.ingredient-name').value = ri.ingredients.name;
            lastRow.querySelector('.ingredient-quantity').value = ri.quantity || '';
            lastRow.querySelector('.ingredient-unit').value = ri.unit || '';
            lastRow.querySelector('.ingredient-notes').value = ri.notes || '';
        });
        
        // Populate tags
        recipe.recipe_tags.forEach(rt => {
            const checkbox = document.querySelector(`input[value="${rt.tags.id}"]`);
            if (checkbox) checkbox.checked = true;
        });
        
        // Populate image
        if (recipe.image_url) {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `
                <img src="${recipe.image_url}" alt="Recipe preview" style="max-width: 100%; height: 200px; object-fit: cover; border-radius: 8px;" data-url="${recipe.image_url}">
                <button type="button" onclick="removeImage()" class="btn btn-secondary" style="margin-top: 1rem;">
                    <i class="fas fa-trash"></i> Remove Image
                </button>
            `;
        }
        
        navigateToPage('create-recipe');
    } catch (error) {
        showToast('Failed to load recipe for editing', 'error');
    }
}

async function copyRecipe(recipeId) {
    try {
        await api.copyRecipe(recipeId);
        showToast('Recipe copied successfully!', 'success');
        navigateToPage('my-recipes');
    } catch (error) {
        showToast('Failed to copy recipe', 'error');
    }
}

async function deleteRecipe(recipeId) {
    if (!confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
        return;
    }
    
    try {
        await api.deleteRecipe(recipeId);
        showToast('Recipe deleted successfully!', 'success');
        navigateToPage('my-recipes');
    } catch (error) {
        showToast('Failed to delete recipe', 'error');
    }
}

async function filterRecipes() {
    const search = document.getElementById('recipeSearch').value;
    const difficulty = document.getElementById('difficultyFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    
    const activeTags = Array.from(document.querySelectorAll('.tag-filter.active'))
        .map(filter => filter.dataset.tag);
    
    const params = {};
    if (search) params.q = search;
    if (difficulty) params.difficulty = difficulty;
    if (activeTags.length > 0) params.tags = activeTags.join(',');
    if (sortBy) params.sortBy = sortBy;
    
    try {
        const recipesData = await api.searchRecipes(params);
        renderRecipeGrid(recipesData.recipes, 'recipesGrid');
    } catch (error) {
        showToast('Failed to filter recipes', 'error');
    }
}

// Global search
let searchTimeout;
async function handleGlobalSearch(event) {
    const query = event.target.value.trim();
    
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
        document.getElementById('searchResults').style.display = 'none';
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        try {
            const results = await api.searchGlobal(query);
            renderSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
        }
    }, 300);
}

function renderSearchResults(results) {
    const container = document.getElementById('searchResults');
    
    if (results.totalResults === 0) {
        container.innerHTML = '<div style="padding: 1rem; text-align: center;">No results found</div>';
        container.style.display = 'block';
        return;
    }
    
    let html = '';
    
    if (results.results.recipes.length > 0) {
        html += '<div style="padding: 0.5rem; font-weight: 600; border-bottom: 1px solid var(--border-color);">Recipes</div>';
        results.results.recipes.forEach(recipe => {
            html += `
                <div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color); cursor: pointer;" onclick="viewRecipe('${recipe.id}')">
                    <div style="font-weight: 500;">${recipe.title}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">${recipe.description || ''}</div>
                </div>
            `;
        });
    }
    
    if (results.results.ingredients.length > 0) {
        html += '<div style="padding: 0.5rem; font-weight: 600; border-bottom: 1px solid var(--border-color);">Ingredients</div>';
        results.results.ingredients.forEach(ingredient => {
            html += `
                <div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color);">
                    <div style="font-weight: 500;">${ingredient.name}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">${ingredient.category || 'Uncategorized'}</div>
                </div>
            `;
        });
    }
    
    if (results.results.tags.length > 0) {
        html += '<div style="padding: 0.5rem; font-weight: 600; border-bottom: 1px solid var(--border-color);">Tags</div>';
        results.results.tags.forEach(tag => {
            html += `
                <div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color);">
                    <span class="tag" style="background-color: ${tag.color}">${tag.name}</span>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
    container.style.display = 'block';
}

// Initialize app
const app = new AppState();
const api = new ApiService();

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Check for existing token and validate
    if (app.token) {
        try {
            const profileData = await api.getProfile();
            app.setUser(profileData.user);
        } catch (error) {
            console.error('Token validation failed:', error);
            app.setToken(null);
        }
    }
    
    // Set up navigation
    document.querySelectorAll('[data-page]').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = element.dataset.page;
            navigateToPage(pageId);
        });
    });
    
    // Set up auth modal
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');
    const authSwitchLink = document.getElementById('authSwitchLink');
    const registerFields = document.getElementById('registerFields');
    const authModalTitle = document.getElementById('authModalTitle');
    const authSubmitText = document.getElementById('authSubmitText');
    const authSwitchText = document.getElementById('authSwitchText');
    
    // Auth form submission
    authForm.addEventListener('submit', handleAuth);
    
    // Auth mode switching
    authSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        const isLogin = registerFields.style.display === 'none' || !registerFields.style.display;
        
        if (isLogin) {
            // Switch to register
            registerFields.style.display = 'block';
            authModalTitle.textContent = 'Sign Up';
            authSubmitText.textContent = 'Sign Up';
            authSwitchText.innerHTML = 'Already have an account? <a href="#" id="authSwitchLink">Sign in</a>';
        } else {
            // Switch to login
            registerFields.style.display = 'none';
            authModalTitle.textContent = 'Sign In';
            authSubmitText.textContent = 'Sign In';
            authSwitchText.innerHTML = 'Don\'t have an account? <a href="#" id="authSwitchLink">Sign up</a>';
        }
        
        // Re-attach event listener to new link
        document.getElementById('authSwitchLink').addEventListener('click', arguments.callee);
    });
    
    // Modal close handlers
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeBtn.closest('.modal').classList.remove('active');
        });
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // User menu dropdown
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
    });
    
    document.addEventListener('click', () => {
        userDropdown.style.display = 'none';
    });
    
    // Profile link
    document.getElementById('profileLink').addEventListener('click', (e) => {
        e.preventDefault();
        navigateToPage('profile');
        userDropdown.style.display = 'none';
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
        userDropdown.style.display = 'none';
    });
    
    // Recipe form
    const recipeForm = document.getElementById('recipeForm');
    recipeForm.addEventListener('submit', handleRecipeSubmit);
    
    // Add ingredient button
    document.getElementById('addIngredientBtn').addEventListener('click', addIngredientRow);
    
    // Image upload
    const recipeImage = document.getElementById('recipeImage');
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    
    uploadImageBtn.addEventListener('click', () => {
        recipeImage.click();
    });
    
    recipeImage.addEventListener('change', handleImageUpload);
    
    // Global search
    const globalSearch = document.getElementById('globalSearch');
    globalSearch.addEventListener('input', handleGlobalSearch);
    
    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            document.getElementById('searchResults').style.display = 'none';
        }
    });
    
    // Recipe filters
    const recipeSearch = document.getElementById('recipeSearch');
    const difficultyFilter = document.getElementById('difficultyFilter');
    const sortBy = document.getElementById('sortBy');
    
    if (recipeSearch) {
        recipeSearch.addEventListener('input', debounce(filterRecipes, 300));
    }
    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', filterRecipes);
    }
    if (sortBy) {
        sortBy.addEventListener('change', filterRecipes);
    }
    
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const fullName = document.getElementById('profileFullName').value;
                const response = await api.updateProfile({ fullName });
                
                app.setUser(response.user);
                showToast('Profile updated successfully!', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }
    
    // Avatar upload
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    
    if (changeAvatarBtn && avatarInput) {
        changeAvatarBtn.addEventListener('click', () => {
            avatarInput.click();
        });
        
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const response = await api.uploadAvatar(file);
                document.getElementById('profileAvatar').src = response.avatarUrl;
                document.getElementById('userAvatar').src = response.avatarUrl;
                showToast('Avatar updated successfully!', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }
    
    // Unit converter modal
    const unitConverterModal = document.getElementById('unitConverterModal');
    const convertBtn = document.getElementById('convertBtn');
    
    if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
            const quantity = document.getElementById('convertQuantity').value;
            const fromUnit = document.getElementById('convertFromUnit').value;
            const toUnit = document.getElementById('convertToUnit').value;
            
            if (!quantity || !fromUnit || !toUnit) {
                showToast('Please fill in all fields', 'warning');
                return;
            }
            
            try {
                const result = await api.convertUnits(parseFloat(quantity), fromUnit, toUnit);
                const resultDiv = document.getElementById('conversionResult');
                resultDiv.innerHTML = `
                    <strong>${result.conversion}</strong>
                `;
                resultDiv.classList.add('show');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
        
        // Load units for converter
        api.getUnits().then(units => {
            const fromSelect = document.getElementById('convertFromUnit');
            const toSelect = document.getElementById('convertToUnit');
            
            const volumeOptions = units.volume.map(unit => `<option value="${unit}">${unit}</option>`).join('');
            const weightOptions = units.weight.map(unit => `<option value="${unit}">${unit}</option>`).join('');
            
            const optionsHTML = `
                <optgroup label="Volume">
                    ${volumeOptions}
                </optgroup>
                <optgroup label="Weight">
                    ${weightOptions}
                </optgroup>
            `;
            
            fromSelect.innerHTML = optionsHTML;
            toSelect.innerHTML = optionsHTML;
        }).catch(console.error);
    }
    
    // Initialize with home page
    navigateToPage('home');
});

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global functions for onclick handlers
window.viewRecipe = viewRecipe;
window.editRecipe = editRecipe;
window.copyRecipe = copyRecipe;
window.deleteRecipe = deleteRecipe;
window.removeIngredientRow = removeIngredientRow;
window.removeImage = removeImage;
window.showModal = showModal;
window.hideModal = hideModal;
