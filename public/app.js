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
        this.copyingRecipe = null;
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
            updateAvatarDisplay(userAvatar, this.user.avatarUrl, 'user');
            this.showAuthenticatedUI();
        } else {
            userName.textContent = 'Guest';
            userAvatar.style.display = 'none';
            // Add Material Icons fallback for guest
            if (!userAvatar.nextElementSibling || !userAvatar.nextElementSibling.classList.contains('material-icons')) {
                const iconFallback = document.createElement('span');
                iconFallback.className = 'material-icons user-avatar-fallback';
                iconFallback.textContent = 'account_circle';
                iconFallback.style.cssText = 'font-size: 32px; color: var(--text-secondary); border-radius: 50%;';
                userAvatar.parentNode.insertBefore(iconFallback, userAvatar.nextSibling);
            }
            this.showGuestUI();
        }
    }

    showAuthenticatedUI() {
        document.getElementById('signInBtn').style.display = 'none';
        document.getElementById('userMenuContainer').style.display = 'block';
        
        // Show auth-required nav items
        document.querySelectorAll('[data-auth-required]').forEach(el => {
            el.style.display = 'flex';
        });
    }

    showGuestUI() {
        document.getElementById('signInBtn').style.display = 'block';
        document.getElementById('userMenuContainer').style.display = 'none';
        
        // Hide auth-required nav items
        document.querySelectorAll('[data-auth-required]').forEach(el => {
            el.style.display = 'none';
        });
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

function showSignUpEncouragementModal(context = 'create') {
    const modal = document.getElementById('signUpEncouragementModal');
    const title = modal.querySelector('.modal-header h2');
    
    if (context === 'recipe') {
        title.textContent = 'Sign Up to View Full Recipe Details';
    } else {
        title.textContent = 'Join Tag-a-Meal to Create and Manage Recipes';
    }
    
    showModal('signUpEncouragementModal');
}

function navigateToPage(pageId, skipUnsavedCheck = false) {
    // Check if user is trying to access auth-required pages without being signed in
    const authRequiredPages = ['my-recipes', 'create-recipe', 'profile'];
    if (authRequiredPages.includes(pageId) && !app.user) {
        showSignUpEncouragementModal('create');
        return;
    }

    // Check if we're leaving the create-recipe page with unsaved changes
    if (app.currentPage === 'create-recipe' && pageId !== 'create-recipe' && !skipUnsavedCheck) {
        if (hasUnsavedChanges()) {
            const confirmLeave = confirm('You have unsaved changes. Are you sure you want to leave this page?');
            if (!confirmLeave) {
                return; // Don't navigate away
            }
        }
        // Clear editing state when leaving create-recipe page
        clearEditingState();
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Convert kebab-case to camelCase for page IDs
    const pageIdMap = {
        'home': 'homePage',
        'recipes': 'recipesPage',
        'my-recipes': 'myRecipesPage',
        'create-recipe': 'createRecipePage',
        'recipe-detail': 'recipeDetailPage',
        'profile': 'profilePage'
    };

    const targetPageId = pageIdMap[pageId] || pageId + 'Page';
    const targetPage = document.getElementById(targetPageId);
    
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
    } else {
        console.error(`Page not found: ${targetPageId} for pageId: ${pageId}`);
    }
}

function hasUnsavedChanges() {
    // Check if any form fields have been modified
    const form = document.getElementById('recipeForm');
    if (!form) return false;

    const title = document.getElementById('recipeTitle').value.trim();
    const description = document.getElementById('recipeDescription').value.trim();
    const instructions = document.getElementById('recipeInstructions').value.trim();
    
    // Check if there are any ingredients
    const ingredients = document.querySelectorAll('.ingredient-item');
    const hasIngredients = Array.from(ingredients).some(item => {
        const name = item.querySelector('.ingredient-name').value.trim();
        return name.length > 0;
    });

    // Consider it unsaved if there's any content
    return title.length > 0 || description.length > 0 || instructions.length > 0 || hasIngredients;
}

function clearEditingState() {
    // Clear the editing recipe state
    app.editingRecipe = null;
    
    // Reset form title
    document.getElementById('recipeFormTitle').textContent = 'Create New Recipe';
    
    // Reset form
    const form = document.getElementById('recipeForm');
    if (form) {
        form.reset();
    }
    
    // Clear ingredients list
    const ingredientsList = document.getElementById('ingredientsList');
    if (ingredientsList) {
        ingredientsList.innerHTML = '';
        addIngredientRow(); // Add one empty row
    }
    
    // Clear image preview
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.innerHTML = `
            <button type="button" id="uploadImageBtn" class="upload-btn">
                <i class="fas fa-camera"></i>
                <span>Upload Image</span>
            </button>
        `;
        
        // Re-attach event listener
        const uploadBtn = document.getElementById('uploadImageBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                document.getElementById('recipeImage').click();
            });
        }
    }
    
    // Clear tag selections
    const tagCheckboxes = document.querySelectorAll('input[name="recipeTags"]');
    tagCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
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
        // Load public recipe count for front page
        const recipesData = await api.getRecipes({ limit: 1, publicOnly: true });
        document.getElementById('totalRecipes').textContent = recipesData.pagination?.total || '0';
        document.getElementById('totalUsers').textContent = '1,234';
        document.getElementById('totalTags').textContent = '45';
        document.getElementById('totalIngredients').textContent = '567';
    } catch (error) {
        console.error('Error loading home page:', error);
        // Fallback to 0 if there's an error
        document.getElementById('totalRecipes').textContent = '0';
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
        renderIngredientsDatalist();
        
        // Reset form if not editing or copying
        if (!app.editingRecipe && !app.copyingRecipe) {
            document.getElementById('recipeForm').reset();
            document.getElementById('recipeFormTitle').textContent = 'Create New Recipe';
            clearIngredientsList();
        }
    } catch (error) {
        console.error('Error loading create recipe page:', error);
        showToast('Failed to load form data', 'error');
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
        
        // Fix profile avatar display
        const profileAvatar = document.getElementById('profileAvatar');
        const avatarContainer = profileAvatar?.parentElement;
        const removeAvatarBtn = document.getElementById('removeAvatarBtn');
        
        if (profileAvatar && avatarContainer) {
            if (user.avatarUrl) {
                profileAvatar.src = user.avatarUrl;
                profileAvatar.style.display = 'block';
                // Show remove button
                if (removeAvatarBtn) {
                    removeAvatarBtn.style.display = 'inline-block';
                }
                // Remove any Material Icons fallback
                const existingIcon = avatarContainer.querySelector('.material-icons');
                if (existingIcon) {
                    existingIcon.remove();
                }
            } else {
                profileAvatar.style.display = 'none';
                // Hide remove button
                if (removeAvatarBtn) {
                    removeAvatarBtn.style.display = 'none';
                }
                // Add Material Icons fallback if not already present
                let iconFallback = avatarContainer.querySelector('.material-icons');
                if (!iconFallback) {
                    iconFallback = document.createElement('span');
                    iconFallback.className = 'material-icons profile-avatar-fallback';
                    iconFallback.textContent = 'account_circle';
                    iconFallback.style.cssText = 'font-size: 120px; color: var(--text-secondary); width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--background-secondary);';
                    avatarContainer.insertBefore(iconFallback, profileAvatar.nextSibling);
                }
            }
        }
        
        document.getElementById('showAuthorName').checked = user.showAuthorName !== false;
    } catch (error) {
        console.error('Error loading profile page:', error);
    }
}

// Render Functions
function renderRecipeCard(recipe, isMyRecipes = false) {
    const isOwner = app.user && app.user.id === recipe.user_id;
    
    // Get author name - for My Recipes, show current user's name, otherwise show recipe author
    let authorName;
    let authorAvatar;
    
    if (isMyRecipes && isOwner) {
        // For My Recipes page, show current user's info
        authorName = app.user?.fullName || app.user?.email || 'You';
        authorAvatar = app.user?.avatarUrl;
    } else {
        // For public recipes or other users' recipes
        authorName = recipe.users?.full_name || recipe.user?.full_name || 'Anonymous';
        authorAvatar = recipe.users?.avatar_url;
        
        // Only show author info if they allow name display
        if (recipe.users?.show_author_name === false) {
            authorName = 'Anonymous';
            authorAvatar = null;
        }
    }
    
    // Determine badge type
    let badgeClass = '';
    let badgeText = '';
    if (isOwner) {
        if (recipe.is_public) {
            badgeClass = 'public';
            badgeText = 'PUBLIC';
        } else {
            badgeClass = 'private';
            badgeText = 'PRIVATE';
        }
    } else {
        badgeClass = 'other-user';
        badgeText = 'SHARED';
    }
    
    return `
        <div class="recipe-card" data-recipe-id="${recipe.id}">
            <div class="recipe-badge ${badgeClass}">${badgeText}</div>
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
                        `<span class="tag" style="background-color: ${rt.tags?.color || '#3B82F6'}">${rt.tags?.name || rt.tag_name || ''}</span>`
                    ).join('')}
                </div>
                <div class="recipe-footer">
                    <div class="recipe-author">
                        ${authorAvatar ? 
                            `<img src="${authorAvatar}" alt="" class="author-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <span class="material-icons author-avatar-icon" style="font-size: 24px; color: var(--text-secondary); width: 24px; height: 24px; display: none; align-items: center; justify-content: center; border-radius: 50%; background: var(--background-secondary);">account_circle</span>` : 
                            `<span class="material-icons author-avatar-icon" style="font-size: 24px; color: var(--text-secondary); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--background-secondary);">account_circle</span>`
                        }
                        <span>${authorName}</span>
                    </div>
                    <div class="recipe-actions">
                        ${isMyRecipes && isOwner ? `
                            <button class="btn btn-sm btn-primary recipe-edit-btn" data-recipe-id="${recipe.id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : (!isOwner && app.user) ? `
                            <button class="btn btn-sm btn-secondary recipe-copy-btn" data-recipe-id="${recipe.id}">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                        ` : ''}
                        <div class="recipe-rating">
                            <i class="fas fa-star"></i>
                            <span>${recipe.averageRating?.toFixed(1) || '0.0'}</span>
                            <span>(${recipe.totalRatings || 0})</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderRecipeGrid(recipes, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!recipes || recipes.length === 0) {
        container.innerHTML = '<p class="text-center">No recipes found.</p>';
        return;
    }

    const isMyRecipes = containerId === 'myRecipesGrid';

    // Use shared recipe card rendering function
    container.innerHTML = recipes.map(recipe => renderRecipeCard(recipe, isMyRecipes)).join('');

    // Add event listeners for recipe cards
    container.querySelectorAll('.recipe-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const recipeId = card.dataset.recipeId;
            viewRecipe(recipeId);
        });
    });

    // Add event listeners for action buttons
    container.querySelectorAll('.recipe-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const recipeId = btn.dataset.recipeId;
            editRecipe(recipeId);
        });
    });

    container.querySelectorAll('.recipe-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const recipeId = btn.dataset.recipeId;
            copyAndEditRecipe(recipeId);
        });
    });
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

function renderIngredientsDatalist() {
    const datalist = document.getElementById('ingredientsDatalist');
    if (!datalist) return;

    datalist.innerHTML = app.ingredients.map(ingredient => `
        <option value="${ingredient.name}">
    `).join('');
}

function addIngredientRow() {
    const container = document.getElementById('ingredientsList');
    const row = document.createElement('div');
    row.className = 'ingredient-item';
    
    // Check if this is the first ingredient
    const isFirstIngredient = container.children.length === 0;
    
    row.innerHTML = `
        <div class="form-group">
            <input type="text" placeholder="Ingredient name" class="ingredient-name" list="ingredientsDatalist" ${isFirstIngredient ? 'required' : ''}>
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
        <button type="button" class="ingredient-remove" ${isFirstIngredient ? 'style="display: none;"' : ''}>
            <span class="material-icons">close</span>
        </button>
    `;
    container.appendChild(row);
    
    // Add event listener to the remove button
    const removeBtn = row.querySelector('.ingredient-remove');
    removeBtn.addEventListener('click', () => {
        removeIngredientRow(removeBtn);
    });
    
    // Update remove button visibility for all ingredients
    updateIngredientRemoveButtons();
}

function removeIngredientRow(button) {
    button.closest('.ingredient-item').remove();
    updateIngredientRemoveButtons();
}

function updateIngredientRemoveButtons() {
    const container = document.getElementById('ingredientsList');
    const ingredients = container.querySelectorAll('.ingredient-item');
    
    ingredients.forEach((ingredient, index) => {
        const removeBtn = ingredient.querySelector('.ingredient-remove');
        if (removeBtn) {
            // Hide remove button for first ingredient, show for others
            if (index === 0) {
                removeBtn.style.display = 'none';
            } else {
                removeBtn.style.display = 'block';
            }
        }
        
        // Make first ingredient required
        const nameInput = ingredient.querySelector('.ingredient-name');
        if (nameInput) {
            if (index === 0) {
                nameInput.setAttribute('required', '');
            } else {
                nameInput.removeAttribute('required');
            }
        }
    });
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
        
        // Check if email verification is required
        if (!isLogin && (!response.session || response.session === null)) {
            // Registration successful but email verification required
            hideModal('authModal');
            showEmailVerificationModal(email);
            return;
        }
        
        // Normal login/registration flow
        if (response.session && response.session.access_token) {
            app.setToken(response.session.access_token);
            app.setUser(response.user);
            
            hideModal('authModal');
            showToast(`${isLogin ? 'Login' : 'Registration'} successful!`, 'success');
            
            // Reload current page if auth was required or if viewing recipes
            if (['my-recipes', 'create-recipe', 'profile', 'recipes'].includes(app.currentPage)) {
                loadPageData(app.currentPage);
            }
        } else {
            // Handle case where session is null but no error was thrown
            if (!isLogin) {
                hideModal('authModal');
                showEmailVerificationModal(email);
            } else {
                showToast('Login failed. Please check your credentials.', 'error');
            }
        }
        
    } catch (error) {
        // Check for specific error types
        if (error.message.includes('duplicate key value violates unique constraint') || 
            error.message.includes('already exists') ||
            error.message.includes('users_email_key')) {
            showToast('An account with this email already exists. Please sign in instead.', 'error');
        } else if (error.message.includes('email') && error.message.includes('confirm') || 
                   error.message.includes('verification') || 
                   error.message.includes('verify')) {
            hideModal('authModal');
            showEmailVerificationModal(email);
        } else {
            showToast(error.message, 'error');
        }
    }
}

function showEmailVerificationModal(email) {
    // Set the email in the verification modal
    document.getElementById('verificationEmail').textContent = email;
    
    // Clear the auth form
    document.getElementById('authForm').reset();
    
    // Reset auth modal to login mode
    const registerFields = document.getElementById('registerFields');
    const authModalTitle = document.getElementById('authModalTitle');
    const authSubmitText = document.getElementById('authSubmitText');
    const authSwitchText = document.getElementById('authSwitchText');
    
    registerFields.style.display = 'none';
    authModalTitle.textContent = 'Sign In';
    authSubmitText.textContent = 'Sign In';
    authSwitchText.innerHTML = 'Don\'t have an account? <a href="#" id="authSwitchLink">Sign up</a>';
    
    // Re-attach event listener to new switch link
    const newSwitchLink = document.getElementById('authSwitchLink');
    if (newSwitchLink) {
        newSwitchLink.addEventListener('click', handleAuthModeSwitch);
    }
    
    // Show verification modal
    showModal('emailVerificationModal');
}

function handleAuthModeSwitch(e) {
    e.preventDefault();
    const registerFields = document.getElementById('registerFields');
    const authModalTitle = document.getElementById('authModalTitle');
    const authSubmitText = document.getElementById('authSubmitText');
    const authSwitchText = document.getElementById('authSwitchText');
    
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
    document.getElementById('authSwitchLink').addEventListener('click', handleAuthModeSwitch);
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
        app.copyingRecipe = null; // Clear copying flag
        navigateToPage('my-recipes', true); // Skip unsaved changes check when saving
        
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
            <button type="button" class="btn btn-secondary remove-image-btn" style="margin-top: 1rem;">
                <i class="fas fa-trash"></i> Remove Image
            </button>
        `;
        
        // Add event listener to remove button
        const removeBtn = preview.querySelector('.remove-image-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', removeImage);
        }
        
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
    // Check if user is signed in
    if (!app.user) {
        // Show encouragement modal for signed-out users with recipe-specific title
        showSignUpEncouragementModal('recipe');
        return;
    }
    
    try {
        const recipe = await api.getRecipe(recipeId);
        app.currentRecipe = recipe;
        renderRecipeDetailModal(recipe);
        showModal('recipeDetailModal');
    } catch (error) {
        showToast('Failed to load recipe', 'error');
    }
}


function renderRecipeDetailModal(recipe) {
    const container = document.getElementById('recipeDetailContent');
    const titleElement = document.getElementById('recipeDetailTitle');
    
    titleElement.textContent = recipe.title;
    
    // Get author info with privacy handling
    let authorName = 'Anonymous';
    let authorAvatar = null;
    
    if (recipe.users) {
        if (recipe.users.show_author_name !== false) {
            authorName = recipe.users.full_name || 'Anonymous';
            authorAvatar = recipe.users.avatar_url;
        }
    }
    
    container.innerHTML = `
        <div class="recipe-header">
            <img src="${recipe.image_url || '/api/placeholder-recipe'}" alt="${recipe.title}" class="recipe-detail-image">
            <p class="recipe-description">${recipe.description || ''}</p>
            
            <div class="recipe-author-info" style="display: flex; align-items: center; gap: 0.75rem; margin: 1rem 0; padding: 1rem; background: var(--background-secondary); border-radius: 8px;">
                ${authorAvatar ? 
                    `<img src="${authorAvatar}" alt="" class="author-avatar" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <span class="material-icons" style="font-size: 48px; color: var(--text-secondary); width: 48px; height: 48px; display: none; align-items: center; justify-content: center; border-radius: 50%; background: var(--background-tertiary);">account_circle</span>` : 
                    `<span class="material-icons" style="font-size: 48px; color: var(--text-secondary); width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--background-tertiary);">account_circle</span>`
                }
                <div>
                    <div style="font-weight: 600; color: var(--text-primary);">Recipe by ${authorName}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Created ${new Date(recipe.created_at).toLocaleDateString()}</div>
                </div>
            </div>
            
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
                    `<span class="tag" style="background-color: ${rt.tags?.color || '#3B82F6'}">${rt.tags?.name || ''}</span>`
                ).join('')}
            </div>
            
            <div class="recipe-actions" style="margin-top: 1rem; text-align: center;">
                ${app.user && app.user.id === recipe.user_id ? `
                    <button class="btn btn-primary modal-edit-btn" data-recipe-id="${recipe.id}">
                        <i class="fas fa-edit"></i> Edit Recipe
                    </button>
                    <button class="btn btn-secondary modal-copy-btn" data-recipe-id="${recipe.id}">
                        <i class="fas fa-copy"></i> Copy Recipe
                    </button>
                ` : app.user ? `
                    <button class="btn btn-secondary modal-copy-edit-btn" data-recipe-id="${recipe.id}">
                        <i class="fas fa-copy"></i> Copy & Edit
                    </button>
                ` : ''}
            </div>
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
                <div class="instructions-text">${marked.parse(recipe.instructions)}</div>
            </div>
        </div>
    `;

    // Add event listeners for modal action buttons
    attachModalActionListeners(container);
}

function populateRecipeForm(recipe, options = {}) {
    const {
        title = recipe.title,
        formTitle = 'Edit Recipe',
        isPublic = recipe.is_public
    } = options;
    
    // Populate basic form fields
    document.getElementById('recipeFormTitle').textContent = formTitle;
    document.getElementById('recipeTitle').value = title;
    document.getElementById('recipeDescription').value = recipe.description || '';
    document.getElementById('recipeInstructions').value = recipe.instructions;
    document.getElementById('recipePrepTime').value = recipe.prep_time || '';
    document.getElementById('recipeCookTime').value = recipe.cook_time || '';
    document.getElementById('recipeServings').value = recipe.servings || '';
    document.getElementById('recipeDifficulty').value = recipe.difficulty || 'easy';
    document.getElementById('recipePublic').value = isPublic ? 'true' : 'false';
    
    // Update preview with loaded instructions
    updateInstructionsPreview();
    
    // Populate ingredients
    document.getElementById('ingredientsList').innerHTML = '';
    recipe.recipe_ingredients.forEach((ri, index) => {
        addIngredientRow();
        const lastRow = document.querySelector('.ingredient-item:last-child');
        lastRow.querySelector('.ingredient-name').value = ri.ingredients.name;
        lastRow.querySelector('.ingredient-quantity').value = ri.quantity || '';
        lastRow.querySelector('.ingredient-unit').value = ri.unit || '';
        lastRow.querySelector('.ingredient-notes').value = ri.notes || '';
    });
    
    // Ensure at least one ingredient row exists
    if (recipe.recipe_ingredients.length === 0) {
        addIngredientRow();
    }
    
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
            <button type="button" class="btn btn-secondary remove-image-btn" style="margin-top: 1rem;">
                <i class="fas fa-trash"></i> Remove Image
            </button>
        `;
        
        // Add event listener to remove button
        const removeBtn = preview.querySelector('.remove-image-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', removeImage);
        }
    }
}

async function editRecipe(recipeId) {
    try {
        const recipe = await api.getRecipe(recipeId);
        app.editingRecipe = recipe;
        
        populateRecipeForm(recipe, {
            formTitle: 'Edit Recipe',
            isPublic: recipe.is_public
        });
        
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

async function copyAndEditRecipe(recipeId) {
    try {
        const recipe = await api.getRecipe(recipeId);
        
        // Set up for editing a copy
        app.editingRecipe = null; // Clear editing state to create new recipe
        app.copyingRecipe = recipe; // Set copying flag to prevent form reset
        
        populateRecipeForm(recipe, {
            title: `${recipe.title} (Copy)`,
            formTitle: 'Create Recipe (Copy)',
            isPublic: false // Copies are private by default
        });
        
        navigateToPage('create-recipe');
        showToast('Recipe copied for editing!', 'success');
    } catch (error) {
        showToast('Failed to copy recipe for editing', 'error');
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
    const authForm = document.getElementById('authForm');
    const registerFields = document.getElementById('registerFields');
    const authModalTitle = document.getElementById('authModalTitle');
    const authSubmitText = document.getElementById('authSubmitText');
    const authSwitchText = document.getElementById('authSwitchText');
    
    // Auth form submission
    authForm.addEventListener('submit', handleAuth);
    
    // Auth mode switching - use event delegation
    authSwitchText.addEventListener('click', (e) => {
        if (e.target.id === 'authSwitchLink') {
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
        }
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
    
    // Sign In button
    document.getElementById('signInBtn').addEventListener('click', () => {
        showModal('authModal');
    });
    
    // Sign Up Encouragement Modal buttons
    const signUpFromEncouragement = document.getElementById('signUpFromEncouragement');
    const signInFromEncouragement = document.getElementById('signInFromEncouragement');
    
    if (signUpFromEncouragement) {
        signUpFromEncouragement.addEventListener('click', () => {
            hideModal('signUpEncouragementModal');
            
            // Switch auth modal to register mode
            const registerFields = document.getElementById('registerFields');
            const authModalTitle = document.getElementById('authModalTitle');
            const authSubmitText = document.getElementById('authSubmitText');
            const authSwitchText = document.getElementById('authSwitchText');
            
            registerFields.style.display = 'block';
            authModalTitle.textContent = 'Sign Up';
            authSubmitText.textContent = 'Sign Up';
            authSwitchText.innerHTML = 'Already have an account? <a href="#" id="authSwitchLink">Sign in</a>';
            
            showModal('authModal');
        });
    }
    
    if (signInFromEncouragement) {
        signInFromEncouragement.addEventListener('click', () => {
            hideModal('signUpEncouragementModal');
            
            // Switch auth modal to login mode
            const registerFields = document.getElementById('registerFields');
            const authModalTitle = document.getElementById('authModalTitle');
            const authSubmitText = document.getElementById('authSubmitText');
            const authSwitchText = document.getElementById('authSwitchText');
            
            registerFields.style.display = 'none';
            authModalTitle.textContent = 'Sign In';
            authSubmitText.textContent = 'Sign In';
            authSwitchText.innerHTML = 'Don\'t have an account? <a href="#" id="authSwitchLink">Sign up</a>';
            
            showModal('authModal');
        });
    }
    
    // Sign In Again button from email verification modal
    const signInAgainBtn = document.getElementById('signInAgainBtn');
    if (signInAgainBtn) {
        signInAgainBtn.addEventListener('click', () => {
            hideModal('emailVerificationModal');
            showModal('authModal');
        });
    }
    
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
    
    // Markdown preview for instructions
    const instructionsTextarea = document.getElementById('recipeInstructions');
    const instructionsPreview = document.getElementById('instructionsPreview');
    
    if (instructionsTextarea && instructionsPreview) {
        // Update preview on input
        instructionsTextarea.addEventListener('input', updateInstructionsPreview);
        
        // Initial preview update
        updateInstructionsPreview();
    }
    
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
                const showAuthorName = document.getElementById('showAuthorName').checked;
                
                const response = await api.updateProfile({ 
                    fullName, 
                    showAuthorName 
                });
                
                app.setUser(response.user);
                showToast('Profile updated successfully!', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }
    
    // Avatar upload and remove
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const removeAvatarBtn = document.getElementById('removeAvatarBtn');
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
                
                // Update all avatar displays
                const profileAvatar = document.getElementById('profileAvatar');
                const userAvatar = document.getElementById('userAvatar');
                const removeAvatarBtn = document.getElementById('removeAvatarBtn');
                
                if (profileAvatar) {
                    profileAvatar.src = response.avatarUrl;
                    profileAvatar.style.display = 'block';
                }
                if (userAvatar) {
                    userAvatar.src = response.avatarUrl;
                    userAvatar.style.display = 'block';
                    // Remove navigation fallback icon
                    userAvatar.nextElementSibling?.remove();
                }
                if (removeAvatarBtn) {
                    removeAvatarBtn.style.display = 'inline-block';
                }
                
                // Remove any Material Icons fallback from profile
                const avatarContainer = profileAvatar?.parentElement;
                if (avatarContainer) {
                    const existingIcon = avatarContainer.querySelector('.material-icons');
                    if (existingIcon) {
                        existingIcon.remove();
                    }
                }
                
                // Update user state
                if (app.user) {
                    app.user.avatarUrl = response.avatarUrl;
                }
                
                showToast('Avatar updated successfully!', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    }
    
    if (removeAvatarBtn) {
        removeAvatarBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to remove your profile photo?')) {
                return;
            }
            
            try {
                // Update profile to remove avatar
                const response = await api.updateProfile({ avatarUrl: null });
                
                // Update all avatar displays
                const profileAvatar = document.getElementById('profileAvatar');
                const userAvatar = document.getElementById('userAvatar');
                
                if (profileAvatar) {
                    profileAvatar.style.display = 'none';
                }
                if (userAvatar) {
                    userAvatar.style.display = 'none';
                }
                
                // Hide remove button
                removeAvatarBtn.style.display = 'none';
                
                // Add Material Icons fallback to profile
                const avatarContainer = profileAvatar?.parentElement;
                if (avatarContainer) {
                    let iconFallback = avatarContainer.querySelector('.material-icons');
                    if (!iconFallback) {
                        iconFallback = document.createElement('span');
                        iconFallback.className = 'material-icons profile-avatar-fallback';
                        iconFallback.textContent = 'account_circle';
                        iconFallback.style.cssText = 'font-size: 120px; color: var(--text-secondary); width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--background-secondary);';
                        avatarContainer.insertBefore(iconFallback, profileAvatar.nextSibling);
                    }
                }
                
                // Add Material Icons fallback to navigation
                if (userAvatar && (!userAvatar.nextElementSibling || !userAvatar.nextElementSibling.classList.contains('material-icons'))) {
                    const iconFallback = document.createElement('span');
                    iconFallback.className = 'material-icons user-avatar-fallback';
                    iconFallback.textContent = 'account_circle';
                    iconFallback.style.cssText = 'font-size: 32px; color: var(--text-secondary); border-radius: 50%;';
                    userAvatar.parentNode.insertBefore(iconFallback, userAvatar.nextSibling);
                }
                
                // Update user state
                if (app.user) {
                    app.user.avatarUrl = null;
                }
                
                showToast('Profile photo removed successfully!', 'success');
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
    
    // Initialize UI state
    app.updateUI();
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

// Shared function for updating avatar displays
function updateAvatarDisplay(avatarElement, avatarUrl, type = 'user') {
    if (!avatarElement) return;
    
    if (avatarUrl) {
        avatarElement.src = avatarUrl;
        avatarElement.style.display = 'block';
        avatarElement.nextElementSibling?.remove(); // Remove any icon fallback
    } else {
        avatarElement.style.display = 'none';
        // Add Material Icons fallback if not already present
        if (!avatarElement.nextElementSibling || !avatarElement.nextElementSibling.classList.contains('material-icons')) {
            const iconFallback = document.createElement('span');
            iconFallback.className = `material-icons ${type}-avatar-fallback`;
            iconFallback.textContent = 'account_circle';
            
            const size = type === 'profile' ? '120px' : '32px';
            iconFallback.style.cssText = `font-size: ${size}; color: var(--text-secondary); border-radius: 50%; ${type === 'profile' ? 'width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; background: var(--background-secondary);' : ''}`;
            
            avatarElement.parentNode.insertBefore(iconFallback, avatarElement.nextSibling);
        }
    }
}

// Shared function for attaching modal action listeners
function attachModalActionListeners(container) {
    container.querySelectorAll('.modal-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('recipeDetailModal');
            editRecipe(btn.dataset.recipeId);
        });
    });

    container.querySelectorAll('.modal-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('recipeDetailModal');
            copyRecipe(btn.dataset.recipeId);
        });
    });

    container.querySelectorAll('.modal-copy-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal('recipeDetailModal');
            copyAndEditRecipe(btn.dataset.recipeId);
        });
    });
}

// Global updateInstructionsPreview function
function updateInstructionsPreview() {
    const instructionsTextarea = document.getElementById('recipeInstructions');
    const instructionsPreview = document.getElementById('instructionsPreview');
    
    if (!instructionsTextarea || !instructionsPreview) return;
    
    const markdownText = instructionsTextarea.value.trim();
    if (markdownText) {
        instructionsPreview.innerHTML = marked.parse(markdownText);
    } else {
        instructionsPreview.innerHTML = '<div class="preview-placeholder" style="color: var(--text-secondary); font-style: italic; text-align: center; padding: 2rem;">Start typing above to see preview...</div>';
    }
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
window.updateInstructionsPreview = updateInstructionsPreview;
